/**
 * Slugify utility functions for creating SEO-friendly URLs
 */

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

/**
 * Extract ID from listing slug
 * Example: "obiava-3-audi-a6" -> 3
 */
export const extractIdFromSlug = (slug: string): number | null => {
  const match = slug.match(/^obiava-(\d+)-/);
  return match ? parseInt(match[1], 10) : null;
};

/**
 * Build unique, readable dealer slug URL part.
 * Example: ("Авто Къща") -> "авто-къща"
 */
export const buildDealerSlug = (dealerName: string, _dealerId?: number): string =>
  toSlugPart(dealerName);

/**
 * Extract legacy dealer ID from old dealer slug or numeric id.
 * Examples: "авто-къща-12" -> 12, "12" -> 12
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
