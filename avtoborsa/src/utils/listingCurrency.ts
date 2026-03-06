export type ListingCurrency = "EUR" | "USD" | "CAD";
export type SupportedDisplayCurrency = ListingCurrency | "BGN";

export const DEFAULT_LISTING_CURRENCY: ListingCurrency = "EUR";
export const LISTING_CURRENCY_OPTIONS: ListingCurrency[] = ["EUR", "USD", "CAD"];

const CURRENCY_UNITS_PER_EUR: Record<SupportedDisplayCurrency, number> = {
  // ECB reference rates published on March 6, 2026.
  EUR: 1,
  USD: 1.1561,
  CAD: 1.5782,
  // Fixed conversion rate used for BGN display conversions.
  BGN: 1.95583,
};

const FOREIGN_COUNTRY_CURRENCY_OPTIONS: Record<string, ListingCurrency[]> = {
  "Канада": ["EUR", "CAD"],
  "САЩ": ["EUR", "USD"],
};

const CURRENCY_LABELS: Record<SupportedDisplayCurrency, string> = {
  EUR: "EUR",
  USD: "USD",
  CAD: "CAD",
  BGN: "лв.",
};

const toFiniteNumber = (value: unknown): number | null => {
  if (typeof value === "number") {
    return Number.isFinite(value) ? value : null;
  }

  if (typeof value === "string") {
    const trimmed = value.trim();
    if (!trimmed) return null;
    const normalized = trimmed.replace(/\s+/g, "").replace(",", ".");
    const parsed = Number(normalized);
    return Number.isFinite(parsed) ? parsed : null;
  }

  return null;
};

export const normalizeListingCurrency = (value: unknown): ListingCurrency => {
  const normalized = String(value || DEFAULT_LISTING_CURRENCY).trim().toUpperCase();
  if (LISTING_CURRENCY_OPTIONS.includes(normalized as ListingCurrency)) {
    return normalized as ListingCurrency;
  }
  return DEFAULT_LISTING_CURRENCY;
};

export const getAllowedPublishCurrencies = (
  locationCountry: string,
  outsideCountry: string
): ListingCurrency[] => {
  if (locationCountry !== "Извън страната") {
    return [DEFAULT_LISTING_CURRENCY];
  }
  return FOREIGN_COUNTRY_CURRENCY_OPTIONS[outsideCountry] || [DEFAULT_LISTING_CURRENCY];
};

export const normalizePublishCurrency = (
  locationCountry: string,
  outsideCountry: string,
  currency: unknown
): ListingCurrency => {
  const normalized = normalizeListingCurrency(currency);
  const allowed = getAllowedPublishCurrencies(locationCountry, outsideCountry);
  return allowed.includes(normalized) ? normalized : DEFAULT_LISTING_CURRENCY;
};

export const convertListingAmount = (
  amount: unknown,
  fromCurrency: unknown,
  toCurrency: SupportedDisplayCurrency
): number | null => {
  const numericAmount = toFiniteNumber(amount);
  if (numericAmount === null) return null;

  const normalizedSource = normalizeListingCurrency(fromCurrency);
  const normalizedTarget =
    toCurrency in CURRENCY_UNITS_PER_EUR ? toCurrency : DEFAULT_LISTING_CURRENCY;

  const eurAmount = numericAmount / CURRENCY_UNITS_PER_EUR[normalizedSource];
  return eurAmount * CURRENCY_UNITS_PER_EUR[normalizedTarget];
};

export const formatListingMoney = (
  amount: unknown,
  currency: SupportedDisplayCurrency,
  options?: Intl.NumberFormatOptions
): string => {
  const numericAmount = toFiniteNumber(amount);
  if (numericAmount === null) {
    return currency === "BGN" ? `0 ${CURRENCY_LABELS[currency]}` : `0 ${currency}`;
  }

  const formatter = new Intl.NumberFormat("bg-BG", {
    minimumFractionDigits: 0,
    maximumFractionDigits: 2,
    ...options,
  });
  return `${formatter.format(numericAmount)} ${CURRENCY_LABELS[currency]}`;
};

export const getListingPriceSummary = (params: {
  price: unknown;
  currency?: unknown;
  priceEur?: unknown;
  priceBgn?: unknown;
}) => {
  const currency = normalizeListingCurrency(params.currency);
  const priceValue = toFiniteNumber(params.price);
  if (priceValue === null || priceValue <= 0) {
    return {
      primary: "",
      secondary: [] as string[],
    };
  }

  const eurAmount =
    toFiniteNumber(params.priceEur) ?? convertListingAmount(priceValue, currency, "EUR");
  const bgnAmount =
    toFiniteNumber(params.priceBgn) ?? convertListingAmount(priceValue, currency, "BGN");
  const secondary: string[] = [];

  if (currency !== "EUR" && eurAmount !== null) {
    secondary.push(formatListingMoney(eurAmount, "EUR"));
  }
  if (bgnAmount !== null) {
    secondary.push(formatListingMoney(bgnAmount, "BGN"));
  }

  return {
    primary: formatListingMoney(priceValue, currency),
    secondary,
  };
};
