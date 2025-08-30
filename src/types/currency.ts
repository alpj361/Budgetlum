export type CurrencyCode =
  | "USD" | "EUR" | "MXN" | "GTQ" | "COP"
  | "PEN" | "CLP" | "BRL" | "ARS" | "GBP";

export interface Currency {
  code: CurrencyCode;
  symbol: string;
  name: string;
  locale: string; // para Intl
  decimals: number;
}

export const CURRENCIES: Currency[] = [
  { code: "USD", symbol: "$", name: "Dólar estadounidense", locale: "en-US", decimals: 2 },
  { code: "EUR", symbol: "€", name: "Euro", locale: "es-ES", decimals: 2 },
  { code: "MXN", symbol: "$", name: "Peso mexicano", locale: "es-MX", decimals: 2 },
  { code: "GTQ", symbol: "Q", name: "Quetzal guatemalteco", locale: "es-GT", decimals: 2 },
  { code: "COP", symbol: "$", name: "Peso colombiano", locale: "es-CO", decimals: 0 },
  { code: "PEN", symbol: "S/", name: "Sol peruano", locale: "es-PE", decimals: 2 },
  { code: "CLP", symbol: "$", name: "Peso chileno", locale: "es-CL", decimals: 0 },
  { code: "BRL", symbol: "R$", name: "Real brasileño", locale: "pt-BR", decimals: 2 },
  { code: "ARS", symbol: "$", name: "Peso argentino", locale: "es-AR", decimals: 2 },
  { code: "GBP", symbol: "£", name: "Libra esterlina", locale: "en-GB", decimals: 2 },
];

export const getCurrency = (code: CurrencyCode): Currency => {
  return CURRENCIES.find(c => c.code === code) || CURRENCIES[0];
};
