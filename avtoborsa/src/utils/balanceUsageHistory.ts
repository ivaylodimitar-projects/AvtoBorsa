export const USER_BALANCE_USAGE_STORAGE_KEY_PREFIX =
  "karbg:user-balance-usage:v1:";
export const USER_BALANCE_USAGE_UPDATED_EVENT =
  "karbg:user-balance-usage-updated";

const MAX_BALANCE_USAGE_RECORDS = 50;

export type BalanceUsageSource = "publish" | "republish" | "promote";
export type BalanceUsageType = "top" | "vip";

export interface BalanceUsageRecord {
  id: string;
  amount: number;
  currency: string;
  listingType: BalanceUsageType;
  plan: string;
  source: BalanceUsageSource;
  listingId: number | null;
  listingTitle: string;
  createdAt: string;
}

interface AddBalanceUsageInput {
  amount: number;
  currency?: string;
  listingType: BalanceUsageType;
  plan: string;
  source: BalanceUsageSource;
  listingId?: number | null;
  listingTitle?: string | null;
}

const toStorageKey = (userId: number) =>
  `${USER_BALANCE_USAGE_STORAGE_KEY_PREFIX}${userId}`;

const normalizeAmount = (value: number) => Math.round(value * 100) / 100;

const normalizeText = (value: unknown) => {
  if (typeof value !== "string") return "";
  return value.trim();
};

const normalizeListingId = (value: unknown): number | null => {
  if (typeof value === "number" && Number.isFinite(value) && value > 0) {
    return Math.floor(value);
  }
  if (typeof value === "string") {
    const parsed = Number(value.trim());
    if (Number.isFinite(parsed) && parsed > 0) {
      return Math.floor(parsed);
    }
  }
  return null;
};

const toValidBalanceUsageRecord = (value: unknown): BalanceUsageRecord | null => {
  if (!value || typeof value !== "object") return null;

  const record = value as Record<string, unknown>;
  if (typeof record.id !== "string" || !record.id.trim()) return null;
  if (typeof record.createdAt !== "string" || !record.createdAt.trim()) return null;

  if (typeof record.amount !== "number" || !Number.isFinite(record.amount)) {
    return null;
  }
  const normalizedAmount = normalizeAmount(record.amount);
  if (normalizedAmount <= 0) return null;

  const normalizedCurrency = normalizeText(record.currency).toUpperCase() || "EUR";

  const listingType =
    record.listingType === "top" || record.listingType === "vip"
      ? record.listingType
      : null;
  if (!listingType) return null;

  const source =
    record.source === "publish" ||
    record.source === "republish" ||
    record.source === "promote"
      ? record.source
      : null;
  if (!source) return null;

  const plan = normalizeText(record.plan).toLowerCase();
  if (!plan) return null;

  return {
    id: record.id,
    amount: normalizedAmount,
    currency: normalizedCurrency,
    listingType,
    plan,
    source,
    listingId: normalizeListingId(record.listingId),
    listingTitle: normalizeText(record.listingTitle),
    createdAt: record.createdAt,
  };
};

const emitBalanceUsageUpdated = (userId: number) => {
  if (typeof window === "undefined") return;
  window.dispatchEvent(
    new CustomEvent(USER_BALANCE_USAGE_UPDATED_EVENT, {
      detail: { userId },
    })
  );
};

const persistBalanceUsageHistory = (userId: number, items: BalanceUsageRecord[]) => {
  if (typeof window === "undefined") return;
  localStorage.setItem(toStorageKey(userId), JSON.stringify(items));
  emitBalanceUsageUpdated(userId);
};

export const getUserBalanceUsageHistory = (
  userId?: number | null
): BalanceUsageRecord[] => {
  if (!userId || typeof window === "undefined") return [];

  const raw = localStorage.getItem(toStorageKey(userId));
  if (!raw) return [];

  try {
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    return parsed
      .map((item) => toValidBalanceUsageRecord(item))
      .filter((item): item is BalanceUsageRecord => item !== null)
      .slice(0, MAX_BALANCE_USAGE_RECORDS);
  } catch {
    return [];
  }
};

export const addBalanceUsageRecord = (
  userId: number | null | undefined,
  input: AddBalanceUsageInput
): BalanceUsageRecord | null => {
  if (!userId) return null;
  if (!Number.isFinite(input.amount) || input.amount <= 0) return null;

  if (input.listingType !== "top" && input.listingType !== "vip") {
    return null;
  }
  if (!["publish", "republish", "promote"].includes(input.source)) {
    return null;
  }

  const normalizedPlan = normalizeText(input.plan).toLowerCase();
  if (!normalizedPlan) return null;

  const record: BalanceUsageRecord = {
    id: `balance-usage-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
    amount: normalizeAmount(input.amount),
    currency: normalizeText(input.currency).toUpperCase() || "EUR",
    listingType: input.listingType,
    plan: normalizedPlan,
    source: input.source,
    listingId: normalizeListingId(input.listingId),
    listingTitle: normalizeText(input.listingTitle),
    createdAt: new Date().toISOString(),
  };

  const current = getUserBalanceUsageHistory(userId);
  persistBalanceUsageHistory(
    userId,
    [record, ...current].slice(0, MAX_BALANCE_USAGE_RECORDS)
  );
  return record;
};
