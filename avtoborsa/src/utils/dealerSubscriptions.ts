import { addDealerListingNotification } from "./notifications";

export const USER_FOLLOWED_DEALERS_STORAGE_KEY_PREFIX =
  "karbg:user-followed-dealers:v1:";
export const USER_FOLLOWED_DEALERS_UPDATED_EVENT =
  "karbg:user-followed-dealers-updated";

const MAX_FOLLOWED_DEALERS = 250;

export interface DealerListingSnapshot {
  id: number;
  dealer_name: string;
  city?: string | null;
  profile_image_url?: string | null;
  listing_count: number;
}

export interface FollowedDealer {
  dealerId: number;
  dealerName: string;
  dealerCity: string;
  dealerProfileImageUrl: string | null;
  lastKnownListingCount: number;
  followedAt: string;
  updatedAt: string;
}

export interface FollowedDealersSyncResult {
  notificationsCreated: number;
  followedDealers: FollowedDealer[];
}

const toStorageKey = (userId: number) =>
  `${USER_FOLLOWED_DEALERS_STORAGE_KEY_PREFIX}${userId}`;

const normalizeListingCount = (value: number) => {
  if (!Number.isFinite(value) || value < 0) return 0;
  return Math.floor(value);
};

const normalizeDealerName = (value: unknown) => {
  if (typeof value !== "string") return "";
  return value.trim();
};

const normalizeDealerCity = (value: unknown) => {
  if (typeof value !== "string") return "";
  return value.trim();
};

const normalizeDealerImage = (value: unknown): string | null => {
  if (typeof value !== "string") return null;
  const trimmed = value.trim();
  return trimmed ? trimmed : null;
};

const toValidFollowedDealer = (value: unknown): FollowedDealer | null => {
  if (!value || typeof value !== "object") return null;

  const record = value as Record<string, unknown>;
  if (typeof record.dealerId !== "number" || !Number.isFinite(record.dealerId)) {
    return null;
  }

  const dealerId = Math.floor(record.dealerId);
  if (dealerId <= 0) return null;

  const dealerName = normalizeDealerName(record.dealerName);
  if (!dealerName) return null;

  const followedAt =
    typeof record.followedAt === "string" && record.followedAt.trim()
      ? record.followedAt
      : new Date().toISOString();
  const updatedAt =
    typeof record.updatedAt === "string" && record.updatedAt.trim()
      ? record.updatedAt
      : followedAt;

  return {
    dealerId,
    dealerName,
    dealerCity: normalizeDealerCity(record.dealerCity),
    dealerProfileImageUrl: normalizeDealerImage(record.dealerProfileImageUrl),
    lastKnownListingCount: normalizeListingCount(
      typeof record.lastKnownListingCount === "number"
        ? record.lastKnownListingCount
        : 0
    ),
    followedAt,
    updatedAt,
  };
};

const emitFollowedDealersUpdated = (userId: number) => {
  if (typeof window === "undefined") return;
  window.dispatchEvent(
    new CustomEvent(USER_FOLLOWED_DEALERS_UPDATED_EVENT, {
      detail: { userId },
    })
  );
};

const persistUserFollowedDealers = (
  userId: number,
  followedDealers: FollowedDealer[]
) => {
  if (typeof window === "undefined") return;
  localStorage.setItem(toStorageKey(userId), JSON.stringify(followedDealers));
  emitFollowedDealersUpdated(userId);
};

export const getUserFollowedDealersStorageKey = (userId: number) =>
  toStorageKey(userId);

export const getUserFollowedDealers = (
  userId?: number | null
): FollowedDealer[] => {
  if (!userId || typeof window === "undefined") return [];

  const raw = localStorage.getItem(toStorageKey(userId));
  if (!raw) return [];

  try {
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    return parsed
      .map((item) => toValidFollowedDealer(item))
      .filter((item): item is FollowedDealer => item !== null)
      .slice(0, MAX_FOLLOWED_DEALERS);
  } catch {
    return [];
  }
};

export const followDealer = (
  userId: number | null | undefined,
  snapshot: DealerListingSnapshot
): FollowedDealer | null => {
  if (!userId) return null;

  const dealerId = Number.isFinite(snapshot.id) ? Math.floor(snapshot.id) : 0;
  const dealerName = normalizeDealerName(snapshot.dealer_name);
  if (dealerId <= 0 || !dealerName) return null;

  const dealerCity = normalizeDealerCity(snapshot.city);
  const dealerProfileImageUrl = normalizeDealerImage(snapshot.profile_image_url);
  const listingCount = normalizeListingCount(snapshot.listing_count);
  const current = getUserFollowedDealers(userId);
  const now = new Date().toISOString();

  const existingIndex = current.findIndex((item) => item.dealerId === dealerId);
  if (existingIndex >= 0) {
    const existing = current[existingIndex];
    const updated: FollowedDealer = {
      ...existing,
      dealerName,
      dealerCity: dealerCity || existing.dealerCity,
      dealerProfileImageUrl,
      lastKnownListingCount: Math.max(existing.lastKnownListingCount, listingCount),
      updatedAt: now,
    };
    const reordered = [
      updated,
      ...current.filter((item) => item.dealerId !== dealerId),
    ].slice(0, MAX_FOLLOWED_DEALERS);
    persistUserFollowedDealers(userId, reordered);
    return updated;
  }

  const followedDealer: FollowedDealer = {
    dealerId,
    dealerName,
    dealerCity,
    dealerProfileImageUrl,
    lastKnownListingCount: listingCount,
    followedAt: now,
    updatedAt: now,
  };

  persistUserFollowedDealers(
    userId,
    [followedDealer, ...current].slice(0, MAX_FOLLOWED_DEALERS)
  );
  return followedDealer;
};

export const unfollowDealer = (
  userId: number | null | undefined,
  dealerId: number
) => {
  if (!userId || !Number.isFinite(dealerId)) return;

  const normalizedDealerId = Math.floor(dealerId);
  if (normalizedDealerId <= 0) return;

  const current = getUserFollowedDealers(userId);
  const next = current.filter((item) => item.dealerId !== normalizedDealerId);
  if (next.length === current.length) return;

  persistUserFollowedDealers(userId, next);
};

export const syncFollowedDealersWithLatestListings = (
  userId: number | null | undefined,
  latestDealers: DealerListingSnapshot[]
): FollowedDealersSyncResult => {
  if (!userId) {
    return { notificationsCreated: 0, followedDealers: [] };
  }

  const current = getUserFollowedDealers(userId);
  if (current.length === 0) {
    return { notificationsCreated: 0, followedDealers: current };
  }

  const snapshotsById = new Map<
    number,
    {
      dealerName: string;
      dealerCity: string;
      dealerProfileImageUrl: string | null;
      listingCount: number;
    }
  >();

  latestDealers.forEach((snapshot) => {
    const dealerId = Number.isFinite(snapshot.id) ? Math.floor(snapshot.id) : 0;
    if (dealerId <= 0) return;

    const dealerName = normalizeDealerName(snapshot.dealer_name);
    if (!dealerName) return;

    snapshotsById.set(dealerId, {
      dealerName,
      dealerCity: normalizeDealerCity(snapshot.city),
      dealerProfileImageUrl: normalizeDealerImage(snapshot.profile_image_url),
      listingCount: normalizeListingCount(snapshot.listing_count),
    });
  });

  let notificationsCreated = 0;
  let hasChanges = false;
  const now = new Date().toISOString();

  const next = current.map((subscription) => {
    const snapshot = snapshotsById.get(subscription.dealerId);
    if (!snapshot) return subscription;

    let nextListingCount = subscription.lastKnownListingCount;
    if (snapshot.listingCount > subscription.lastKnownListingCount) {
      const listingsAdded = snapshot.listingCount - subscription.lastKnownListingCount;
      const notification = addDealerListingNotification(userId, {
        dealerId: subscription.dealerId,
        dealerName: snapshot.dealerName,
        listingsAdded,
        totalListings: snapshot.listingCount,
      });
      if (notification) {
        notificationsCreated += 1;
      }
      nextListingCount = snapshot.listingCount;
    } else if (snapshot.listingCount !== subscription.lastKnownListingCount) {
      nextListingCount = snapshot.listingCount;
    }

    const nextDealerName = snapshot.dealerName || subscription.dealerName;
    const nextDealerCity = snapshot.dealerCity || subscription.dealerCity;
    const nextDealerProfileImageUrl =
      snapshot.dealerProfileImageUrl || subscription.dealerProfileImageUrl;

    const changed =
      nextListingCount !== subscription.lastKnownListingCount ||
      nextDealerName !== subscription.dealerName ||
      nextDealerCity !== subscription.dealerCity ||
      nextDealerProfileImageUrl !== subscription.dealerProfileImageUrl;

    if (!changed) return subscription;
    hasChanges = true;

    return {
      ...subscription,
      dealerName: nextDealerName,
      dealerCity: nextDealerCity,
      dealerProfileImageUrl: nextDealerProfileImageUrl,
      lastKnownListingCount: nextListingCount,
      updatedAt: now,
    };
  });

  if (hasChanges) {
    persistUserFollowedDealers(userId, next);
  }

  return { notificationsCreated, followedDealers: hasChanges ? next : current };
};

