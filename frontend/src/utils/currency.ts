export const EXCHANGE_RATES_TO_QAR: Record<string, number> = {
  QAR: 1.0,
  USD: 3.64,
  EUR: 3.95,
  GBP: 4.60,
  INR: 0.044,
};

export function convertCurrency(cents: number, fromCurrency: string, toCurrency: string): number {
  const from = fromCurrency.toUpperCase();
  const to = toCurrency.toUpperCase();
  
  if (from === to) return cents;
  
  const fromRate = EXCHANGE_RATES_TO_QAR[from] || 1;
  const toRate = EXCHANGE_RATES_TO_QAR[to] || 1;

  
  const amountInQAR = cents * fromRate;
  return amountInQAR / toRate;
}

export function sumConvertedBalances(
  items: { currency: string; balance?: number; amount?: number }[],
  targetCurrency: string
): number {
  if (!items || !Array.isArray(items)) return 0;
  
  return items.reduce((total, item) => {
    const val = item.balance ?? item.amount ?? 0;
    return total + convertCurrency(val, item.currency, targetCurrency);
  }, 0);
}

export function formatCurrency(cents: number, currency: string = 'USD'): string {
  const amount = Number(cents) / 100;
  
  try {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: currency.toUpperCase(),
    }).format(amount);
  } catch {
    
    return `${currency.toUpperCase()} ${amount.toFixed(2)}`;
  }
}
