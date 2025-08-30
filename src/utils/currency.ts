import { CURRENCIES, CurrencyCode, getCurrency } from "../types/currency";

export const formatCurrency = (amount: number, code: CurrencyCode): string => {
  const c = getCurrency(code);
  try {
    return new Intl.NumberFormat(c.locale, { style: "currency", currency: code, minimumFractionDigits: c.decimals }).format(amount);
  } catch {
    // Fallback simple
    const rounded = amount.toFixed(c.decimals);
    return `${c.symbol}${rounded}`;
  }
};

export const getCurrencySymbol = (code: CurrencyCode): string => getCurrency(code).symbol;

export const getSupportedCurrencyCodes = (): CurrencyCode[] => CURRENCIES.map(c => c.code);
