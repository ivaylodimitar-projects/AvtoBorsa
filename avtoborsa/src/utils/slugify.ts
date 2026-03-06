/**
 * Slugify utility functions for creating SEO-friendly URLs.
 */

const CYRILLIC_TO_LATIN_SLUG_MAP: Record<string, string> = {
  а: "a",
  б: "b",
  в: "v",
  г: "g",
  д: "d",
  е: "e",
  ж: "zh",
  з: "z",
  и: "i",
  й: "y",
  к: "k",
  л: "l",
  м: "m",
  н: "n",
  о: "o",
  п: "p",
  р: "r",
  с: "s",
  т: "t",
  у: "u",
  ф: "f",
  х: "h",
  ц: "ts",
  ч: "ch",
  ш: "sh",
  щ: "sht",
  ъ: "a",
  ь: "y",
  ю: "yu",
  я: "ya",
  ѝ: "i",
  ё: "yo",
  ы: "y",
  э: "e",
  є: "e",
  і: "i",
  ї: "yi",
  ґ: "g",
};

const safeDecodeURIComponent = (value: string): string => {
  try {
    return decodeURIComponent(value);
  } catch {
    return value;
  }
};

const transliterateSlugText = (value: string): string => {
  const normalized = safeDecodeURIComponent(value).normalize("NFKC").trim().toLowerCase();
  if (!normalized) return "";
  return Array.from(normalized)
    .map((char) => CYRILLIC_TO_LATIN_SLUG_MAP[char] || char)
    .join("");
};

const toSlugPart = (value: string): string => {
  const normalized = value
    .normalize("NFKC")
    .trim()
    .toLowerCase()
    .replace(/[^\p{L}\p{N}\s-]+/gu, "")
    .replace(/\s+/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-+|-+$/g, "");

  return normalized || "dealer";
};

const toLatinSlugPart = (value: string): string => {
  const normalized = transliterateSlugText(value)
    .replace(/[^a-z0-9\s-]+/g, " ")
    .replace(/\s+/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-+|-+$/g, "");

  return normalized;
};

const toListingId = (value: unknown): number | null => {
  if (typeof value === "number") {
    return Number.isInteger(value) && value > 0 ? value : null;
  }
  if (typeof value === "string" && /^\d+$/.test(value.trim())) {
    const parsed = parseInt(value.trim(), 10);
    return parsed > 0 ? parsed : null;
  }
  return null;
};

export const normalizeListingSlug = (
  value: string | null | undefined,
  fallbackId?: number | string | null
): string => {
  const rawValue = safeDecodeURIComponent((value || "").trim())
    .replace(/^https?:\/\/[^/]+/i, "")
    .replace(/^\/+details\/+/i, "")
    .replace(/^\/+/, "");
  const matched = rawValue.match(/^obiava-(\d+)(?:-(.*))?$/i);
  const listingId = toListingId(fallbackId) ?? toListingId(matched?.[1]);

  if (!listingId) {
    return "";
  }

  const suffixSource =
    matched?.[2] ||
    (!matched && rawValue && !/^\d+$/.test(rawValue) ? rawValue : "");
  const normalizedSuffix = toLatinSlugPart(suffixSource);
  return normalizedSuffix ? `obiava-${listingId}-${normalizedSuffix}` : `obiava-${listingId}`;
};

export const buildListingDetailPath = (
  slug: string | null | undefined,
  fallbackId?: number | string | null
): string => {
  const normalizedSlug = normalizeListingSlug(slug, fallbackId);
  if (!normalizedSlug) {
    const listingId = toListingId(fallbackId);
    return listingId ? `/details/obiava-${listingId}` : "/details";
  }
  return `/details/${normalizedSlug}`;
};

/**
 * Extract ID from listing slug.
 * Example: "obiava-3-audi-a6" -> 3
 */
export const extractIdFromSlug = (slug: string): number | null => {
  const normalizedSlug = safeDecodeURIComponent((slug || "").trim());
  const match = normalizedSlug.match(/^obiava-(\d+)(?:-|$)/i);
  return match ? parseInt(match[1], 10) : null;
};

/**
 * Build unique, readable dealer slug URL part.
 */
export const buildDealerSlug = (dealerName: string, _dealerId?: number): string =>
  toSlugPart(dealerName);

/**
 * Extract legacy dealer ID from old dealer slug or numeric id.
 * Examples: "avtokashta-12" -> 12, "12" -> 12
 */
export const extractDealerIdFromSlug = (value: string): number | null => {
  const normalized = (value || "").trim();
  if (!normalized) return null;

  if (/^\d+$/.test(normalized)) {
    const parsed = parseInt(normalized, 10);
    return parsed > 0 ? parsed : null;
  }

  const match = normalized.match(/-(\d+)$/);
  if (!match) return null;

  const parsed = parseInt(match[1], 10);
  return parsed > 0 ? parsed : null;
};

export const buildDealerProfilePath = (dealerName: string, dealerId: number): string =>
  `/dealers/${buildDealerSlug(dealerName, dealerId)}`;
