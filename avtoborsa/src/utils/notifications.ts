export const USER_NOTIFICATIONS_STORAGE_KEY_PREFIX =
  "karbg:user-notifications:v1:";
export const USER_NOTIFICATIONS_UPDATED_EVENT =
  "karbg:user-notifications-updated";

const MAX_NOTIFICATIONS = 20;

export type AppNotificationType = "deposit" | "dealer_listing";

interface BaseNotification {
  id: string;
  type: AppNotificationType;
  createdAt: string;
  isRead: boolean;
}

export interface DepositNotification extends BaseNotification {
  type: "deposit";
  amount: number;
  currency: string;
  reference?: string;
}

export interface DealerListingNotification extends BaseNotification {
  type: "dealer_listing";
  dealerId: number;
  dealerName: string;
  listingsAdded: number;
  totalListings: number;
}

export type AppNotification = DepositNotification | DealerListingNotification;

interface DealerListingNotificationInput {
  dealerId: number;
  dealerName: string;
  listingsAdded: number;
  totalListings: number;
}

const toStorageKey = (userId: number) =>
  `${USER_NOTIFICATIONS_STORAGE_KEY_PREFIX}${userId}`;

const normalizeAmount = (value: number) => Math.round(value * 100) / 100;

const normalizeCount = (value: number) => {
  if (!Number.isFinite(value) || value < 0) return 0;
  return Math.floor(value);
};

const normalizeText = (value: unknown) => {
  if (typeof value !== "string") return "";
  return value.trim();
};

const toValidNotification = (value: unknown): AppNotification | null => {
  if (!value || typeof value !== "object") {
    return null;
  }

  const record = value as Record<string, unknown>;
  if (typeof record.id !== "string" || !record.id.trim()) {
    return null;
  }
  if (typeof record.createdAt !== "string" || !record.createdAt.trim()) {
    return null;
  }

  if (record.type === "deposit") {
    if (typeof record.amount !== "number" || !Number.isFinite(record.amount)) {
      return null;
    }
    const currency = normalizeText(record.currency);
    if (!currency) {
      return null;
    }

    const reference = normalizeText(record.reference);
    return {
      id: record.id,
      type: "deposit",
      amount: normalizeAmount(record.amount),
      currency,
      ...(reference ? { reference } : {}),
      createdAt: record.createdAt,
      isRead: Boolean(record.isRead),
    };
  }

  if (record.type === "dealer_listing") {
    if (typeof record.dealerId !== "number" || !Number.isFinite(record.dealerId)) {
      return null;
    }
    const dealerId = Math.floor(record.dealerId);
    if (dealerId <= 0) {
      return null;
    }
    const dealerName = normalizeText(record.dealerName);
    if (!dealerName) {
      return null;
    }
    if (
      typeof record.listingsAdded !== "number" ||
      !Number.isFinite(record.listingsAdded)
    ) {
      return null;
    }
    if (
      typeof record.totalListings !== "number" ||
      !Number.isFinite(record.totalListings)
    ) {
      return null;
    }

    const listingsAdded = normalizeCount(record.listingsAdded);
    const totalListings = normalizeCount(record.totalListings);
    if (listingsAdded <= 0 || totalListings < listingsAdded) {
      return null;
    }

    return {
      id: record.id,
      type: "dealer_listing",
      dealerId,
      dealerName,
      listingsAdded,
      totalListings,
      createdAt: record.createdAt,
      isRead: Boolean(record.isRead),
    };
  }

  return null;
};

const emitNotificationsUpdated = (userId: number) => {
  if (typeof window === "undefined") return;
  window.dispatchEvent(
    new CustomEvent(USER_NOTIFICATIONS_UPDATED_EVENT, {
      detail: { userId },
    })
  );
};

const persistUserNotifications = (
  userId: number,
  notifications: AppNotification[]
) => {
  if (typeof window === "undefined") return;
  localStorage.setItem(toStorageKey(userId), JSON.stringify(notifications));
  emitNotificationsUpdated(userId);
};

export const getUserNotificationsStorageKey = (userId: number) =>
  toStorageKey(userId);

export const getUserNotifications = (
  userId?: number | null
): AppNotification[] => {
  if (!userId || typeof window === "undefined") return [];

  const raw = localStorage.getItem(toStorageKey(userId));
  if (!raw) return [];

  try {
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    return parsed
      .map((item) => toValidNotification(item))
      .filter((item): item is AppNotification => item !== null)
      .slice(0, MAX_NOTIFICATIONS);
  } catch {
    return [];
  }
};

export const addDepositNotification = (
  userId: number | null | undefined,
  amount: number,
  currency = "EUR",
  reference?: string
): AppNotification | null => {
  if (!userId) return null;
  if (!Number.isFinite(amount) || amount <= 0) return null;

  const normalizedReference = normalizeText(reference);
  const current = getUserNotifications(userId);
  if (normalizedReference) {
    const alreadyExists = current.some(
      (item) =>
        item.type === "deposit" &&
        typeof item.reference === "string" &&
        item.reference === normalizedReference
    );
    if (alreadyExists) {
      return null;
    }
  }

  const notification: DepositNotification = {
    id: `deposit-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
    type: "deposit",
    amount: normalizeAmount(amount),
    currency,
    ...(normalizedReference ? { reference: normalizedReference } : {}),
    createdAt: new Date().toISOString(),
    isRead: false,
  };

  persistUserNotifications(
    userId,
    [notification, ...current].slice(0, MAX_NOTIFICATIONS)
  );
  return notification;
};

export const addDealerListingNotification = (
  userId: number | null | undefined,
  input: DealerListingNotificationInput
): AppNotification | null => {
  if (!userId) return null;

  const dealerId = Number.isFinite(input.dealerId) ? Math.floor(input.dealerId) : 0;
  const dealerName = normalizeText(input.dealerName);
  const listingsAdded = normalizeCount(input.listingsAdded);
  const totalListings = normalizeCount(input.totalListings);

  if (dealerId <= 0 || !dealerName || listingsAdded <= 0 || totalListings < listingsAdded) {
    return null;
  }

  const notificationId = `dealer-listing-${dealerId}-${totalListings}-${Date.now()}-${Math.random()
    .toString(36)
    .slice(2, 8)}`;
  const current = getUserNotifications(userId);

  const notification: DealerListingNotification = {
    id: notificationId,
    type: "dealer_listing",
    dealerId,
    dealerName,
    listingsAdded,
    totalListings,
    createdAt: new Date().toISOString(),
    isRead: false,
  };

  persistUserNotifications(
    userId,
    [notification, ...current].slice(0, MAX_NOTIFICATIONS)
  );
  return notification;
};

export const markAllNotificationsRead = (userId?: number | null) => {
  if (!userId) return;

  const current = getUserNotifications(userId);
  if (!current.some((item) => !item.isRead)) {
    return;
  }

  const next = current.map((item) => ({ ...item, isRead: true }));
  persistUserNotifications(userId, next);
};

export const markNotificationRead = (
  userId: number | null | undefined,
  notificationId: string
) => {
  if (!userId || !notificationId) return;

  const current = getUserNotifications(userId);
  const next = current.map((item) =>
    item.id === notificationId ? { ...item, isRead: true } : item
  );

  const hasChanges = next.some(
    (item, index) => item.isRead !== current[index]?.isRead
  );
  if (!hasChanges) return;

  persistUserNotifications(userId, next);
};
