export type PriceChangeLike = {
  delta?: number | string | null;
  direction?: string | null;
  changed_at?: string | null;
  old_price?: number | string | null;
  new_price?: number | string | null;
  current_price?: number | string | null;
};

export type PriceBadgeKind = "up" | "down" | "announced";

export type PriceBadgeState = {
  kind: PriceBadgeKind;
  amountLabel: string;
  title: string;
};

export const ANNOUNCED_PRICE_WINDOW_MS = 24 * 60 * 60 * 1000;

const toNumber = (value: unknown): number | null => {
  if (value === null || value === undefined) return null;
  if (typeof value === "number") return Number.isFinite(value) ? value : null;

  const raw = String(value).trim();
  if (!raw) return null;

  const normalized = raw
    .replace(/\s+/g, "")
    .replace(/[^0-9,.-]/g, "")
    .replace(/,(?=\d{1,2}$)/, ".")
    .replace(/,/g, "");

  const numeric = Number(normalized);
  return Number.isFinite(numeric) ? numeric : null;
};

export const resolvePriceBadgeState = (
  latestChange: PriceChangeLike | null | undefined,
  nowMs: number = Date.now()
): PriceBadgeState | null => {
  if (!latestChange) return null;

  let oldPrice = toNumber(latestChange.old_price);
  let newPrice = toNumber(latestChange.new_price);
  const delta = toNumber(latestChange.delta);
  const currentPrice = toNumber(latestChange.current_price);

  if ((oldPrice === null || newPrice === null) && delta !== null && currentPrice !== null) {
    oldPrice = currentPrice - delta;
    newPrice = currentPrice;
  }

  const changedAtMs = latestChange.changed_at ? new Date(latestChange.changed_at).getTime() : Number.NaN;
  const hasValidChangedAt = Number.isFinite(changedAtMs);
  const withinAnnouncedWindow =
    hasValidChangedAt && nowMs >= changedAtMs && nowMs - changedAtMs <= ANNOUNCED_PRICE_WINDOW_MS;

  const isFirstPublishedPrice = oldPrice !== null && newPrice !== null && oldPrice <= 0 && newPrice > 0;
  if (isFirstPublishedPrice) {
    if (!withinAnnouncedWindow) return null;
    return {
      kind: "announced",
      amountLabel: "",
      title: "Обявена цена (валидно 24 часа)",
    };
  }

  if (delta !== null && delta !== 0) {
    return {
      kind: delta > 0 ? "up" : "down",
      amountLabel: `${Math.abs(delta).toLocaleString("bg-BG")} €`,
      title: delta > 0 ? "Повишена цена" : "Намалена цена",
    };
  }

  const direction = (latestChange.direction || "").toString().toLowerCase().trim();
  if (direction === "up" || direction === "down") {
    return {
      kind: direction,
      amountLabel: "",
      title: direction === "up" ? "Повишена цена" : "Намалена цена",
    };
  }

  return null;
};
