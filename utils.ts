export const AVATAR_COLORS = [
  '#FF6B5B', '#7FA68C', '#6A9BD8', '#F4A261', '#A78BFA', '#34D399',
];

export function getAvatarColor(index: number): string {
  return AVATAR_COLORS[index % AVATAR_COLORS.length];
}

export function getInitials(name: string): string {
  const parts = name.trim().split(/\s+/);
  if (parts.length >= 2) return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
  return name.slice(0, 2).toUpperCase();
}

export function formatExpenseDate(dateStr: string): string {
  const d = new Date(dateStr.includes('T') ? dateStr : dateStr + 'T12:00:00');
  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
}

const CURRENCY_SYMBOLS: Record<string, string> = {
  USD: '$', CAD: '$', AUD: '$', NZD: '$', SGD: '$', HKD: '$',
  EUR: '€', GBP: '£', JPY: '¥', CNY: '¥', KRW: '₩',
  CHF: 'Fr', INR: '₹', MXN: '$', BRL: 'R$',
};

const ZERO_DECIMAL_CURRENCIES = new Set(['JPY', 'KRW', 'VND', 'IDR', 'ISK', 'HUF']);

export function getCurrencySymbol(currency: string): string {
  return CURRENCY_SYMBOLS[currency] ?? currency;
}

export function formatAmount(amount: number, currency: string): string {
  return amount.toFixed(ZERO_DECIMAL_CURRENCIES.has(currency) ? 0 : 2);
}
