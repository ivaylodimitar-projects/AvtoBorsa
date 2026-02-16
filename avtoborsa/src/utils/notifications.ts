export const USER_NOTIFICATIONS_STORAGE_KEY_PREFIX =
  "avtoborsa:user-notifications:v1:";
export const USER_NOTIFICATIONS_UPDATED_EVENT =
  "avtoborsa:user-notifications-updated";

const MAX_NOTIFICATIONS = 50;

export type AppNotificationType = "deposit";

export interface AppNotification {
  id: string;
  type: AppNotificationType;
  amount: number;
  currency: string;
  createdAt: string;
  isRead: boolean;
}

const toStorageKey = (userId: number) =>
  `${USER_NOTIFICATIONS_STORAGE_KEY_PREFIX}${userId}`;

const normalizeAmount = (value: number) => Math.round(value * 100) / 100;

const toValidNotification = (value: unknown): AppNotification | null => {
  if (!value || typeof value !== "object") {
    return null;
  }

  const record = value as Record<string, unknown>;
  if (record.type !== "deposit") {
    return null;
  }
  if (typeof record.id !== "string" || !record.id.trim()) {
    return null;
  }
  if (typeof record.amount !== "number" || !Number.isFinite(record.amount)) {
    return null;
  }
  if (typeof record.currency !== "string" || !record.currency.trim()) {
    return null;
  }
  if (typeof record.createdAt !== "string" || !record.createdAt.trim()) {
    return null;
  }

  return {
    id: record.id,
    type: "deposit",
    amount: normalizeAmount(record.amount),
    currency: record.currency,
    createdAt: record.createdAt,
    isRead: Boolean(record.isRead),
  };
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
  currency = "EUR"
): AppNotification | null => {
  if (!userId) return null;
  if (!Number.isFinite(amount) || amount <= 0) return null;

  const notification: AppNotification = {
    id: `deposit-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
    type: "deposit",
    amount: normalizeAmount(amount),
    currency,
    createdAt: new Date().toISOString(),
    isRead: false,
  };

  const current = getUserNotifications(userId);
  persistUserNotifications(userId, [notification, ...current].slice(0, MAX_NOTIFICATIONS));
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

  const hasChanges = next.some((item, index) => item.isRead !== current[index]?.isRead);
  if (!hasChanges) return;

  persistUserNotifications(userId, next);
};
