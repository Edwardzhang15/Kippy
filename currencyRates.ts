import AsyncStorage from '@react-native-async-storage/async-storage';

const RATES_KEY    = '@kippy/exchange_rates_v1';
const RATES_TS_KEY = '@kippy/exchange_rates_ts_v1';
const TTL_MS       = 24 * 60 * 60 * 1000; // 24 hours
const TIMEOUT_MS   = 10_000;

export type RatesMap = Record<string, number>; // rates relative to USD base

let _rates: RatesMap | null = null;

export function getCachedRates(): RatesMap | null {
  return _rates;
}

/**
 * Convert an amount from one currency to another using the rates map.
 * Falls back to the original amount if either currency is missing from the map.
 */
export function convertAmount(
  amount: number,
  fromCurrency: string,
  toCurrency: string,
  rates: RatesMap,
): number {
  if (fromCurrency === toCurrency) return amount;
  const from = rates[fromCurrency];
  const to   = rates[toCurrency];
  if (!from || !to) return amount;
  // Convert via USD: amount_in_from / from_rate * to_rate
  return amount * (to / from);
}

/**
 * Units of `to` per 1 unit of `from`, from the 24h rates cache. Only an estimate
 * for when the network is down; never stored as though it were a fetched rate.
 */
export function getCachedRate(from: string, to: string): number | null {
  if (from === to) return 1;
  if (!_rates?.[from] || !_rates[to]) return null;
  return _rates[to] / _rates[from];
}

async function fetchJson(url: string): Promise<any> {
  const controller = new AbortController();
  const tid = setTimeout(() => controller.abort(), TIMEOUT_MS);
  try {
    const res = await fetch(url, { signal: controller.signal });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    return await res.json();
  } finally {
    clearTimeout(tid);
  }
}

// Cross rate from a table quoted against a common base currency.
function crossRate(table: Record<string, unknown> | undefined, from: string, to: string): number | null {
  const f = table?.[from];
  const t = table?.[to];
  if (typeof f !== 'number' || typeof t !== 'number' || f <= 0 || t <= 0) return null;
  return t / f;
}

/**
 * Fetch the current rate as units of `to` per 1 unit of `from`. Tries
 * Frankfurter (ECB reference rates) first, then open.er-api.com. Neither needs
 * an API key. Throws when both fail, so the caller can ask for a manual rate.
 * Callers store the result on the expense; it is never re-fetched afterwards.
 *
 * Both providers round quotes to a few decimals, which leaves a weak-currency
 * quote like KRW->USD (0.00074) with two significant digits. Crossing through
 * each provider's own base keeps full precision in either direction.
 */
export async function fetchExchangeRate(from: string, to: string): Promise<number> {
  if (from === to) return 1;
  try {
    const data = await fetchJson(`https://api.frankfurter.dev/v1/latest?base=EUR&symbols=${from},${to}`);
    const rate = crossRate({ ...data?.rates, EUR: 1 }, from, to);
    if (rate !== null) return rate;
  } catch { /* fall through to the backup provider */ }
  const data = await fetchJson('https://open.er-api.com/v6/latest/USD');
  const rate = data?.result === 'success' ? crossRate(data.rates, from, to) : null;
  if (rate !== null) return rate;
  throw new Error(`No rate for ${from}->${to}`);
}

async function fetchFresh(): Promise<void> {
  const controller = new AbortController();
  const tid = setTimeout(() => controller.abort(), TIMEOUT_MS);
  try {
    const res = await fetch('https://open.er-api.com/v6/latest/USD', {
      signal: controller.signal,
    });
    clearTimeout(tid);
    if (!res.ok) return;
    const data = await res.json();
    if (data?.result === 'success' && data.rates) {
      _rates = data.rates as RatesMap;
      await AsyncStorage.multiSet([
        [RATES_KEY,    JSON.stringify(_rates)],
        [RATES_TS_KEY, String(Date.now())],
      ]);
    }
  } catch {
    clearTimeout(tid);
  }
}

/**
 * Load cached rates from AsyncStorage, then refresh from the network if stale.
 * If no cache exists, blocks until a network fetch completes (or times out).
 * Safe to call multiple times — subsequent calls are no-ops if already resolved.
 */
export async function initRates(): Promise<void> {
  try {
    const [[, ratesStr], [, tsStr]] = await AsyncStorage.multiGet([RATES_KEY, RATES_TS_KEY]);
    if (ratesStr) {
      _rates = JSON.parse(ratesStr) as RatesMap;
      const age = tsStr ? Date.now() - Number(tsStr) : Infinity;
      if (age < TTL_MS) return; // fresh cache — done
      fetchFresh(); // stale cache — refresh in background, don't block startup
      return;
    }
  } catch {
    // AsyncStorage unavailable — fall through to network fetch
  }

  // No cache at all — try network (blocks, gives offline warning on failure)
  await fetchFresh();
}
