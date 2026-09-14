import { currencyDecimals } from './utils';

// How an expense's total is divided between the members it covers.
//   even    - equal shares
//   amount  - each member's exact amount, must add up to the total
//   percent - each member's percentage, must add up to 100
//   shares  - relative weights (1 share, 2 shares...), always adds up
export type SplitMethod = 'even' | 'amount' | 'percent' | 'shares';

export const SPLIT_METHODS: SplitMethod[] = ['even', 'amount', 'percent', 'shares'];

export type SplitEntry = {
  memberId: number;
  /** Amount, percentage or share count, depending on the method. Unused for 'even'. */
  value: number;
};

export type SplitShare = {
  memberId: number;
  /** What this member owes, in the expense's currency. */
  amount: number;
  /** The raw input kept so editing the expense restores exactly what was typed. */
  value: number | null;
};

export type SplitResult = {
  shares: SplitShare[];
  /** Sum of what the inputs currently allocate: currency for 'amount', percent for 'percent'. */
  allocated: number;
  /** Target the allocation must hit: the total for 'amount', 100 for 'percent'. */
  target: number;
  /** target - allocated, positive when something is still unallocated. */
  remainder: number;
  valid: boolean;
};

// Percentages are compared to two decimals, so 33.33 + 33.33 + 33.34 balances.
const PERCENT_SCALE = 100;

function minorUnit(currency: string): number {
  return 10 ** currencyDecimals(currency);
}

/**
 * Split `totalMinor` across `weights` proportionally, in whole minor units.
 * Largest remainder method: everyone gets their floor, then the leftover units
 * go to the largest fractional parts, so the parts always re-add to the total
 * and the odd cent lands somewhere predictable.
 */
function apportion(totalMinor: number, weights: number[]): number[] {
  const weightSum = weights.reduce((s, w) => s + w, 0);
  if (weightSum <= 0) return weights.map(() => 0);

  const exact  = weights.map((w) => (totalMinor * w) / weightSum);
  const floors = exact.map(Math.floor);
  let leftover = totalMinor - floors.reduce((s, n) => s + n, 0);

  const order = exact
    .map((value, index) => ({ index, frac: value - Math.floor(value) }))
    .sort((a, b) => b.frac - a.frac || a.index - b.index);

  const result = [...floors];
  for (let i = 0; leftover > 0 && i < order.length; i++, leftover--) {
    result[order[i].index] += 1;
  }
  return result;
}

/**
 * Work out what each member owes for an expense. Returns the per-person amounts
 * plus what the inputs currently add up to, so the UI can show the running
 * total and block saving while the split doesn't balance.
 */
export function computeSplits(
  total: number,
  method: SplitMethod,
  entries: SplitEntry[],
  currency: string,
): SplitResult {
  const unit       = minorUnit(currency);
  const totalMinor = Math.round(total * unit);
  const empty: SplitResult = {
    shares: [], allocated: 0, target: method === 'percent' ? 100 : total, remainder: 0, valid: false,
  };
  if (entries.length === 0 || !isFinite(totalMinor) || totalMinor <= 0) return empty;

  const toShares = (amountsMinor: number[], values: (number | null)[]): SplitShare[] =>
    entries.map((e, i) => ({ memberId: e.memberId, amount: amountsMinor[i] / unit, value: values[i] }));

  if (method === 'even') {
    const amounts = apportion(totalMinor, entries.map(() => 1));
    return {
      shares: toShares(amounts, entries.map(() => null)),
      allocated: total, target: total, remainder: 0, valid: true,
    };
  }

  if (method === 'amount') {
    const amountsMinor  = entries.map((e) => Math.round(e.value * unit));
    const allocatedMinor = amountsMinor.reduce((s, n) => s + n, 0);
    return {
      shares: toShares(amountsMinor, entries.map((e) => e.value)),
      allocated: allocatedMinor / unit,
      target: total,
      remainder: (totalMinor - allocatedMinor) / unit,
      valid: allocatedMinor === totalMinor && amountsMinor.every((n) => n >= 0),
    };
  }

  if (method === 'percent') {
    const points    = entries.map((e) => Math.round(e.value * PERCENT_SCALE));
    const allocated = points.reduce((s, n) => s + n, 0);
    const balanced  = allocated === 100 * PERCENT_SCALE && points.every((n) => n >= 0);
    return {
      shares: toShares(
        balanced ? apportion(totalMinor, points) : entries.map(() => 0),
        entries.map((e) => e.value),
      ),
      allocated: allocated / PERCENT_SCALE,
      target: 100,
      remainder: (100 * PERCENT_SCALE - allocated) / PERCENT_SCALE,
      valid: balanced,
    };
  }

  // shares: any positive weights divide the whole total, so this always balances
  const weights  = entries.map((e) => (e.value > 0 ? e.value : 0));
  const weightSum = weights.reduce((s, w) => s + w, 0);
  if (weightSum <= 0) {
    return { ...empty, shares: [], allocated: 0, target: total, remainder: total };
  }
  return {
    shares: toShares(apportion(totalMinor, weights), entries.map((e) => e.value)),
    allocated: total,
    target: total,
    remainder: 0,
    valid: true,
  };
}

/**
 * Even starting values for a method, used to prefill the inputs so the user
 * adjusts a balanced split instead of building one from nothing.
 */
export function evenValues(total: number, method: SplitMethod, memberIds: number[], currency: string): Record<number, string> {
  const out: Record<number, string> = {};
  if (memberIds.length === 0) return out;

  if (method === 'shares') {
    memberIds.forEach((id) => { out[id] = '1'; });
    return out;
  }
  if (method === 'percent') {
    const points = apportion(100 * PERCENT_SCALE, memberIds.map(() => 1));
    memberIds.forEach((id, i) => { out[id] = String(points[i] / PERCENT_SCALE); });
    return out;
  }
  const unit    = minorUnit(currency);
  const decimals = currencyDecimals(currency);
  const amounts = apportion(Math.max(0, Math.round(total * unit)), memberIds.map(() => 1));
  memberIds.forEach((id, i) => { out[id] = (amounts[i] / unit).toFixed(decimals); });
  return out;
}
