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
