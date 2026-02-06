/**
 * Slugify utility functions for creating SEO-friendly URLs
 */

/**
 * Extract ID from listing slug
 * Example: "obiava-3-audi-a6" -> 3
 */
export const extractIdFromSlug = (slug: string): number | null => {
  const match = slug.match(/^obiava-(\d+)-/);
  return match ? parseInt(match[1], 10) : null;
};

