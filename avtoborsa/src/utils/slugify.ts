/**
 * Slugify utility functions for creating SEO-friendly URLs
 */

/**
 * Convert text to URL-friendly slug
 * Example: "Audi A6" -> "audi-a6"
 */
export const textToSlug = (text: string): string => {
  return text
    .toLowerCase()
    .trim()
    .replace(/[^\w\s-]/g, '') // Remove special characters
    .replace(/\s+/g, '-') // Replace spaces with hyphens
    .replace(/-+/g, '-') // Replace multiple hyphens with single hyphen
    .replace(/^-+|-+$/g, ''); // Remove leading/trailing hyphens
};

/**
 * Create a listing slug from car details
 * Format: "obiava-{id}-{brand}-{model}"
 * Example: "obiava-3-audi-a6"
 */
export const createListingSlug = (
  id: number | string,
  brand: string,
  model: string
): string => {
  const brandSlug = textToSlug(brand);
  const modelSlug = textToSlug(model);
  return `obiava-${id}-${brandSlug}-${modelSlug}`;
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
 * Validate if a slug is in the correct format
 */
export const isValidListingSlug = (slug: string): boolean => {
  return /^obiava-\d+-.+/.test(slug);
};

