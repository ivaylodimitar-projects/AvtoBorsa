export type MyAdsCachePayload<TListing> = {
  activeListings: TListing[];
  archivedListings: TListing[];
  draftListings: TListing[];
  expiredListings: TListing[];
  likedListings: TListing[];
};

const myAdsCacheByUserId = new Map<number, MyAdsCachePayload<unknown>>();

export const readMyAdsCache = <TListing>(
  userId?: number | null
): MyAdsCachePayload<TListing> | null => {
  if (typeof userId !== "number") return null;
  const cached = myAdsCacheByUserId.get(userId);
  if (!cached) return null;
  return cached as MyAdsCachePayload<TListing>;
};

export const writeMyAdsCache = <TListing>(
  userId: number | null | undefined,
  payload: MyAdsCachePayload<TListing>
) => {
  if (typeof userId !== "number") return;
  myAdsCacheByUserId.set(userId, payload as MyAdsCachePayload<unknown>);
};

export const invalidateMyAdsCache = (userId?: number | null) => {
  if (typeof userId === "number") {
    myAdsCacheByUserId.delete(userId);
    return;
  }
  myAdsCacheByUserId.clear();
};
