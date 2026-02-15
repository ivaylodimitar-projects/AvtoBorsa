const LATEST_LISTINGS_CACHE_LIMIT = 16;

let latestListingsCache: unknown[] | null = null;

export const readLatestListingsCache = <TListing>(): TListing[] | null => {
  if (!latestListingsCache) return null;
  return latestListingsCache as TListing[];
};

export const writeLatestListingsCache = <TListing>(payload: TListing[]) => {
  latestListingsCache = payload.slice(0, LATEST_LISTINGS_CACHE_LIMIT) as unknown[];
};

export const invalidateLatestListingsCache = () => {
  latestListingsCache = null;
};
