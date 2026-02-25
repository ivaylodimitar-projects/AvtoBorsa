import React from "react";
import { Link, useNavigate, useLocation } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import {
  FiCheck,
  FiBell,
  FiBriefcase,
  FiChevronLeft,
  FiChevronDown,
  FiChevronUp,
  FiExternalLink,
  FiHome,
  FiMenu,
  FiX,
  FiPlus,
  FiUser,
} from "react-icons/fi";
import ProfileMenu from "./ProfileMenu";
import SavedSearchesMenu from "./SavedSearchesMenu";
import BezplatnoBadge from "./BezplatnoBadge";
import {
  USER_NOTIFICATIONS_UPDATED_EVENT,
  getUserNotifications,
  getUserNotificationsStorageKey,
  markAllNotificationsRead,
  markNotificationRead,
  type AppNotification,
  type DealerListingNotification,
} from "../utils/notifications";
import {
  DEALER_LISTINGS_SYNC_REQUEST_EVENT,
  USER_FOLLOWED_DEALERS_UPDATED_EVENT,
  getUserFollowedDealers,
  getUserFollowedDealersStorageKey,
  requestDealerListingsSync,
  syncFollowedDealersWithLatestListings,
  unfollowDealer,
  type DealerListingSnapshot,
  type FollowedDealer,
} from "../utils/dealerSubscriptions";
import karBgLogo from "../assets/karbglogo.png";
import { API_BASE_URL } from "../config/api";

const DEALER_LISTINGS_SYNC_COOLDOWN_MS = 15_000;
const DEALER_NOTIFICATIONS_STACK_WINDOW_MS = 60 * 60 * 1000;
const DEALER_NOTIFICATIONS_WS_RECONNECT_MS = 5_000;
const WS_BASE_URL = (import.meta.env.VITE_WS_BASE_URL || "").replace(/\/+$/, "");

type NotificationRenderItem =
  | {
      kind: "single";
      notification: AppNotification;
    }
  | {
      kind: "group";
      groupKey: string;
      dealerId: number;
      dealerName: string;
      notifications: DealerListingNotification[];
    };

const toDealersPayloadList = (value: unknown): unknown[] => {
  if (Array.isArray(value)) return value;
  if (!value || typeof value !== "object") return [];

  const payload = value as Record<string, unknown>;
  if (Array.isArray(payload.results)) return payload.results;
  if (Array.isArray(payload.items)) return payload.items;
  if (Array.isArray(payload.data)) return payload.data;

  return [];
};

const toDealerListingSnapshots = (value: unknown): DealerListingSnapshot[] => {
  const dealersList = toDealersPayloadList(value);
  if (dealersList.length === 0) return [];

  const snapshots: DealerListingSnapshot[] = [];
  const toNumber = (input: unknown) => {
    if (typeof input === "number") return Number.isFinite(input) ? input : NaN;
    if (typeof input === "string") {
      const parsed = Number(input.trim());
      return Number.isFinite(parsed) ? parsed : NaN;
    }
    return NaN;
  };

  dealersList.forEach((item) => {
    if (!item || typeof item !== "object") return;

    const record = item as Record<string, unknown>;
    const idValue = toNumber(record.id);
    const dealerNameValue = record.dealer_name;
    const listingCountValue = toNumber(record.listing_count);

    if (
      !Number.isFinite(idValue) ||
      idValue <= 0 ||
      typeof dealerNameValue !== "string" ||
      !dealerNameValue.trim() ||
      !Number.isFinite(listingCountValue)
    ) {
      return;
    }

    snapshots.push({
      id: Math.floor(idValue),
      dealer_name: dealerNameValue.trim(),
      city: typeof record.city === "string" ? record.city : "",
      profile_image_url:
        typeof record.profile_image_url === "string"
          ? record.profile_image_url
          : null,
      listing_count: Math.max(0, Math.floor(listingCountValue)),
    });
  });

  return snapshots;
};

const areFollowedDealersEqual = (
  left: FollowedDealer[],
  right: FollowedDealer[]
) => {
  if (left.length !== right.length) return false;

  for (let index = 0; index < left.length; index += 1) {
    const a = left[index];
    const b = right[index];
    if (
      a.dealerId !== b.dealerId ||
      a.dealerName !== b.dealerName ||
      a.dealerCity !== b.dealerCity ||
      a.dealerProfileImageUrl !== b.dealerProfileImageUrl ||
      a.lastKnownListingCount !== b.lastKnownListingCount ||
      a.followedAt !== b.followedAt ||
      a.updatedAt !== b.updatedAt
    ) {
      return false;
    }
  }

  return true;
};

const normalizeWsUrl = (rawValue: string) => {
  if (!rawValue) return "";
  try {
    const parsed = new URL(rawValue);
    const protocol = parsed.protocol === "https:" ? "wss:" : parsed.protocol === "http:" ? "ws:" : parsed.protocol;
    return `${protocol}//${parsed.host}`;
  } catch {
    return "";
  }
};

const getNotificationsWebSocketUrl = () => {
  const preferredWsBase = normalizeWsUrl(WS_BASE_URL);
  if (preferredWsBase) return `${preferredWsBase}/ws/notifications/`;

  try {
    const apiUrl = new URL(API_BASE_URL);
    const wsProtocol = apiUrl.protocol === "https:" ? "wss:" : "ws:";
    return `${wsProtocol}//${apiUrl.host}/ws/notifications/`;
  } catch {
    const wsProtocol = window.location.protocol === "https:" ? "wss" : "ws";
    return `${wsProtocol}://${window.location.host}/ws/notifications/`;
  }
};

const Navbar: React.FC = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { isAuthenticated, user } = useAuth();
  const [mobileOpen, setMobileOpen] = React.useState(false);
  const [showNotificationsMenu, setShowNotificationsMenu] = React.useState(false);
  const [isProfileMenuOpen, setIsProfileMenuOpen] = React.useState(false);
  const [isTopUpModalOpen, setIsTopUpModalOpen] = React.useState(false);
  const [isSavedSearchesOpen, setIsSavedSearchesOpen] = React.useState(false);
  const [profileMenuCloseRequestKey, setProfileMenuCloseRequestKey] =
    React.useState(0);
  const [topUpModalCloseRequestKey, setTopUpModalCloseRequestKey] =
    React.useState(0);
  const [savedSearchesCloseRequestKey, setSavedSearchesCloseRequestKey] =
    React.useState(0);
  const [notificationsTab, setNotificationsTab] = React.useState<
    "notifications" | "subscriptions"
  >("notifications");
  const [notifications, setNotifications] = React.useState<AppNotification[]>([]);
  const [followedDealers, setFollowedDealers] = React.useState<FollowedDealer[]>([]);
  const [notificationsNowMs, setNotificationsNowMs] = React.useState(0);
  const [expandedNotificationGroups, setExpandedNotificationGroups] = React.useState<
    Record<string, boolean>
  >({});
  const notificationsRef = React.useRef<HTMLDivElement | null>(null);
  const mobileNotificationsTriggerRef = React.useRef<HTMLButtonElement | null>(null);
  const isMobileViewport = React.useCallback(
    () => typeof window !== "undefined" && window.innerWidth <= 960,
    []
  );
  const closeNotificationsMenu = React.useCallback(
    (closeMobileMenu = false) => {
      setShowNotificationsMenu(false);
      if (closeMobileMenu && isMobileViewport()) {
        setMobileOpen(false);
      }
    },
    [isMobileViewport]
  );

  const isActive = (path: string) => location.pathname === path;

  React.useEffect(() => {
    setMobileOpen(false);
    setShowNotificationsMenu(false);
    setIsProfileMenuOpen(false);
    setIsTopUpModalOpen(false);
    setIsSavedSearchesOpen(false);
    setProfileMenuCloseRequestKey((prev) => prev + 1);
    setTopUpModalCloseRequestKey((prev) => prev + 1);
    setSavedSearchesCloseRequestKey((prev) => prev + 1);
  }, [location.pathname, location.search, location.hash]);

  React.useEffect(() => {
    if (!isMobileViewport()) return;
    if (mobileOpen) return;
    if (!isSavedSearchesOpen) return;
    setSavedSearchesCloseRequestKey((prev) => prev + 1);
    setIsSavedSearchesOpen(false);
  }, [isMobileViewport, mobileOpen, isSavedSearchesOpen]);

  React.useEffect(() => {
    if (!isProfileMenuOpen) return;
    setShowNotificationsMenu(false);
    setIsSavedSearchesOpen(false);
    setSavedSearchesCloseRequestKey((prev) => prev + 1);
  }, [isProfileMenuOpen]);

  React.useEffect(() => {
    if (!isTopUpModalOpen) return;
    setShowNotificationsMenu(false);
    setIsProfileMenuOpen(false);
    setIsSavedSearchesOpen(false);
    setProfileMenuCloseRequestKey((prev) => prev + 1);
    setSavedSearchesCloseRequestKey((prev) => prev + 1);
  }, [isTopUpModalOpen]);

  React.useEffect(() => {
    if (!isSavedSearchesOpen) return;
    setShowNotificationsMenu(false);
    if (isProfileMenuOpen) {
      setProfileMenuCloseRequestKey((prev) => prev + 1);
      setIsProfileMenuOpen(false);
    }
    if (isTopUpModalOpen) {
      setTopUpModalCloseRequestKey((prev) => prev + 1);
      setIsTopUpModalOpen(false);
    }
  }, [isSavedSearchesOpen, isProfileMenuOpen, isTopUpModalOpen]);

  React.useEffect(() => {
    if (!mobileOpen || window.innerWidth > 960) return;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = previousOverflow;
    };
  }, [mobileOpen]);

  React.useLayoutEffect(() => {
    if (!mobileOpen || !isMobileViewport()) return;
    if (!showNotificationsMenu && !isProfileMenuOpen && !isTopUpModalOpen) return;
    setMobileOpen(false);
  }, [
    mobileOpen,
    isMobileViewport,
    showNotificationsMenu,
    isProfileMenuOpen,
    isTopUpModalOpen,
  ]);

  React.useEffect(() => {
    if (!user?.id) {
      setNotifications([]);
      return;
    }

    const storageKey = getUserNotificationsStorageKey(user.id);
    const refreshNotifications = () => {
      setNotifications(getUserNotifications(user.id));
    };

    refreshNotifications();

    const handleStorage = (event: StorageEvent) => {
      if (event.key && event.key !== storageKey) return;
      refreshNotifications();
    };

    const handleNotificationsUpdated = (event: Event) => {
      const { detail } = event as CustomEvent<{ userId?: number }>;
      if (detail?.userId && detail.userId !== user.id) return;
      refreshNotifications();
    };

    window.addEventListener("storage", handleStorage);
    window.addEventListener(USER_NOTIFICATIONS_UPDATED_EVENT, handleNotificationsUpdated);

    return () => {
      window.removeEventListener("storage", handleStorage);
      window.removeEventListener(USER_NOTIFICATIONS_UPDATED_EVENT, handleNotificationsUpdated);
    };
  }, [user?.id]);

  React.useEffect(() => {
    if (!user?.id) {
      setFollowedDealers([]);
      return;
    }

    const storageKey = getUserFollowedDealersStorageKey(user.id);
    const refreshFollowedDealers = () => {
      const next = getUserFollowedDealers(user.id);
      setFollowedDealers((prev) =>
        areFollowedDealersEqual(prev, next) ? prev : next
      );
    };

    refreshFollowedDealers();

    const handleStorage = (event: StorageEvent) => {
      if (event.key && event.key !== storageKey) return;
      refreshFollowedDealers();
    };

    const handleFollowedDealersUpdated = (event: Event) => {
      const { detail } = event as CustomEvent<{ userId?: number }>;
      if (detail?.userId && detail.userId !== user.id) return;
      refreshFollowedDealers();
    };

    window.addEventListener("storage", handleStorage);
    window.addEventListener(
      USER_FOLLOWED_DEALERS_UPDATED_EVENT,
      handleFollowedDealersUpdated
    );

    return () => {
      window.removeEventListener("storage", handleStorage);
      window.removeEventListener(
        USER_FOLLOWED_DEALERS_UPDATED_EVENT,
        handleFollowedDealersUpdated
      );
    };
  }, [user?.id]);

  React.useEffect(() => {
    if (!user?.id) return;

    let isCancelled = false;
    let isSyncInFlight = false;
    let lastSyncAtMs = 0;

    const syncNewDealerListings = async (force = false) => {
      if (isCancelled) return;
      if (isSyncInFlight) return;

      // Read directly from storage to avoid missing login catch-up due to UI state race.
      const followedNow = getUserFollowedDealers(user.id);
      if (followedNow.length === 0) return;

      const nowMs = Date.now();
      if (!force && nowMs - lastSyncAtMs < DEALER_LISTINGS_SYNC_COOLDOWN_MS) {
        return;
      }

      isSyncInFlight = true;
      lastSyncAtMs = nowMs;
      try {
        const response = await fetch(`${API_BASE_URL}/api/auth/dealers/`, {
          cache: "no-store",
        });
        if (!response.ok) return;
        const payload: unknown = await response.json();
        if (isCancelled) return;
        const snapshots = toDealerListingSnapshots(payload);
        const syncResult = syncFollowedDealersWithLatestListings(user.id, snapshots);
        if (syncResult.notificationsCreated > 0) {
          setNotifications(getUserNotifications(user.id));
        }
      } catch {
        // silent polling fail
      } finally {
        isSyncInFlight = false;
      }
    };

    const handleSyncRequest = (event: Event) => {
      const { detail } = event as CustomEvent<{ userId?: number }>;
      if (detail?.userId && detail.userId !== user.id) return;
      void syncNewDealerListings(true);
    };

    const handleWindowFocus = () => {
      void syncNewDealerListings(true);
    };

    const handleVisibilityChange = () => {
      if (document.visibilityState !== "visible") return;
      void syncNewDealerListings(true);
    };

    // Initial catch-up on login and a short fallback retry.
    void syncNewDealerListings(true);
    const fallbackSyncTimer = window.setTimeout(() => {
      void syncNewDealerListings(true);
    }, 2000);

    window.addEventListener(DEALER_LISTINGS_SYNC_REQUEST_EVENT, handleSyncRequest);
    window.addEventListener("focus", handleWindowFocus);
    document.addEventListener("visibilitychange", handleVisibilityChange);

    return () => {
      isCancelled = true;
      window.clearTimeout(fallbackSyncTimer);
      window.removeEventListener(DEALER_LISTINGS_SYNC_REQUEST_EVENT, handleSyncRequest);
      window.removeEventListener("focus", handleWindowFocus);
      document.removeEventListener("visibilitychange", handleVisibilityChange);
    };
  }, [user?.id]);

  React.useEffect(() => {
    if (!user?.id) return;

    let isDisposed = false;
    let socket: WebSocket | null = null;
    let reconnectTimerId: number | null = null;

    const clearReconnectTimer = () => {
      if (reconnectTimerId !== null) {
        window.clearTimeout(reconnectTimerId);
        reconnectTimerId = null;
      }
    };

    const scheduleReconnect = () => {
      if (isDisposed || reconnectTimerId !== null) return;
      reconnectTimerId = window.setTimeout(() => {
        reconnectTimerId = null;
        connect();
      }, DEALER_NOTIFICATIONS_WS_RECONNECT_MS);
    };

    const connect = () => {
      if (isDisposed) return;
      try {
        socket = new WebSocket(getNotificationsWebSocketUrl());
      } catch {
        scheduleReconnect();
        return;
      }

      socket.onmessage = (event) => {
        try {
          const payload = JSON.parse(event.data) as { type?: string };
          if (payload?.type === "dealer_listings_updated") {
            requestDealerListingsSync(user.id);
          }
        } catch {
          // ignore malformed ws payloads
        }
      };

      socket.onopen = () => {
        requestDealerListingsSync(user.id);
      };

      socket.onclose = () => {
        socket = null;
        scheduleReconnect();
      };

      socket.onerror = () => {
        socket?.close();
      };
    };

    connect();

    return () => {
      isDisposed = true;
      clearReconnectTimer();
      if (socket && socket.readyState === WebSocket.OPEN) {
        socket.close();
      }
    };
  }, [user?.id]);

  React.useEffect(() => {
    if (!showNotificationsMenu) return;

    const handlePointerDownOutside = (event: PointerEvent) => {
      if (
        mobileNotificationsTriggerRef.current &&
        mobileNotificationsTriggerRef.current.contains(event.target as Node)
      ) {
        return;
      }
      if (
        notificationsRef.current &&
        !notificationsRef.current.contains(event.target as Node)
      ) {
        closeNotificationsMenu(false);
      }
    };

    const handleEsc = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        closeNotificationsMenu(false);
      }
    };

    window.addEventListener("pointerdown", handlePointerDownOutside);
    window.addEventListener("keydown", handleEsc);

    return () => {
      window.removeEventListener("pointerdown", handlePointerDownOutside);
      window.removeEventListener("keydown", handleEsc);
    };
  }, [showNotificationsMenu, closeNotificationsMenu]);

  React.useEffect(() => {
    setNotificationsNowMs(Date.now());
  }, [notifications]);

  const unreadNotificationsCount = notifications.filter((item) => !item.isRead).length;
  const hasUnreadNotifications = unreadNotificationsCount > 0;
  const hasNotifications = notifications.length > 0;
  const hasFollowedDealers = followedDealers.length > 0;
  const notificationsForDisplay = notifications;
  const notificationRenderItems = React.useMemo<NotificationRenderItem[]>(() => {
    const nowMs = notificationsNowMs;
    const items: NotificationRenderItem[] = [];
    const groupIndexByDealerId = new Map<number, number>();

    notificationsForDisplay.forEach((notification) => {
      if (notification.type !== "dealer_listing") {
        items.push({ kind: "single", notification });
        return;
      }

      const createdAtMs = Date.parse(notification.createdAt);
      const withinStackWindow =
        Number.isFinite(createdAtMs) &&
        nowMs - createdAtMs >= 0 &&
        nowMs - createdAtMs <= DEALER_NOTIFICATIONS_STACK_WINDOW_MS;

      if (!withinStackWindow) {
        items.push({ kind: "single", notification });
        return;
      }

      const existingGroupIndex = groupIndexByDealerId.get(notification.dealerId);
      if (existingGroupIndex === undefined) {
        const groupKey = `dealer-stack-${notification.dealerId}`;
        groupIndexByDealerId.set(notification.dealerId, items.length);
        items.push({
          kind: "group",
          groupKey,
          dealerId: notification.dealerId,
          dealerName: notification.dealerName,
          notifications: [notification],
        });
        return;
      }

      const existingGroup = items[existingGroupIndex];
      if (existingGroup?.kind !== "group") return;
      existingGroup.notifications.push(notification);
    });

    return items;
  }, [notificationsForDisplay, notificationsNowMs]);

  const dealerAvatarById = React.useMemo(() => {
    const avatarById = new Map<number, string>();
    followedDealers.forEach((dealer) => {
      if (
        typeof dealer.dealerProfileImageUrl === "string" &&
        dealer.dealerProfileImageUrl.trim()
      ) {
        avatarById.set(dealer.dealerId, dealer.dealerProfileImageUrl.trim());
      }
    });
    return avatarById;
  }, [followedDealers]);

  const getDealerAvatarUrl = React.useCallback(
    (dealerId: number) => dealerAvatarById.get(dealerId) || null,
    [dealerAvatarById]
  );

  const formatNotificationDate = (value: string) => {
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return "";
    return date.toLocaleString("bg-BG", {
      day: "2-digit",
      month: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  const formatNotificationAmount = (amount: number, currency: string) => {
    try {
      return new Intl.NumberFormat("bg-BG", {
        style: "currency",
        currency,
        minimumFractionDigits: 2,
        maximumFractionDigits: 2,
      }).format(amount);
    } catch {
      return `${amount.toFixed(2)} ${currency}`;
    }
  };

  const formatListingsAdded = (value: number) =>
    `${value} ${value === 1 ? "нова обява" : "нови обяви"}`;

  const formatTotalListings = (value: number) =>
    `${value} ${value === 1 ? "обява" : "обяви"}`;

  const handleNotificationsToggle = () => {
    const nextOpen = !showNotificationsMenu;
    if (!nextOpen) {
      closeNotificationsMenu();
      return;
    }

    setShowNotificationsMenu(true);
    setProfileMenuCloseRequestKey((prev) => prev + 1);
    setIsProfileMenuOpen(false);
    setSavedSearchesCloseRequestKey((prev) => prev + 1);
    setIsSavedSearchesOpen(false);
    setNotificationsTab("notifications");
    setExpandedNotificationGroups({});
    setNotificationsNowMs(Date.now());
  };

  const handleOpenNotificationsFromMobileHeader = () => {
    const nextOpen = !showNotificationsMenu;
    if (!nextOpen) {
      closeNotificationsMenu(true);
      return;
    }

    setShowNotificationsMenu(true);
    setMobileOpen(false);
    setProfileMenuCloseRequestKey((prev) => prev + 1);
    setIsProfileMenuOpen(false);
    setSavedSearchesCloseRequestKey((prev) => prev + 1);
    setIsSavedSearchesOpen(false);
    setNotificationsTab("notifications");
    setExpandedNotificationGroups({});
    setNotificationsNowMs(Date.now());
  };

  const handleMarkAsRead = (notificationId: string) => {
    if (!user?.id) return;
    markNotificationRead(user.id, notificationId);
  };

  const handleMarkAllAsRead = () => {
    if (!user?.id) return;
    markAllNotificationsRead(user.id);
  };

  const handleToggleNotificationGroup = (groupKey: string) => {
    setExpandedNotificationGroups((prev) => ({
      ...prev,
      [groupKey]: !prev[groupKey],
    }));
  };

  const handleMarkNotificationGroupRead = (
    notificationsInGroup: DealerListingNotification[]
  ) => {
    if (!user?.id) return;
    notificationsInGroup.forEach((notification) => {
      if (!notification.isRead) {
        markNotificationRead(user.id, notification.id);
      }
    });
  };

  const handleOpenDealerFromNotification = (notification: AppNotification) => {
    if (notification.type !== "dealer_listing") return;
    if (user?.id && !notification.isRead) {
      markNotificationRead(user.id, notification.id);
    }
    closeNotificationsMenu(true);
    navigate(`/dealers/${notification.dealerId}`);
  };

  const handleOpenFollowedDealer = (dealerId: number) => {
    closeNotificationsMenu(true);
    navigate(`/dealers/${dealerId}`);
  };

  const handleUnfollowDealer = (dealerId: number) => {
    if (!user?.id) return;
    unfollowDealer(user.id, dealerId);
  };

  const hasMobileFocusPanel =
    mobileOpen && (isProfileMenuOpen || isTopUpModalOpen);
  const mobileFocusClass = isTopUpModalOpen
    ? "focus-topup"
    : showNotificationsMenu
      ? "focus-notifications"
      : isProfileMenuOpen
        ? "focus-profile"
        : "";
  const mobilePanelTitle = isTopUpModalOpen
    ? "Зареди баланс"
    : showNotificationsMenu
      ? "Известия"
    : isProfileMenuOpen
        ? (user?.username?.trim() || user?.first_name?.trim() || "Профил")
        : "";

  const handleCloseMobileFocusPanel = () => {
    if (showNotificationsMenu) {
      closeNotificationsMenu(false);
    }
    if (isTopUpModalOpen) {
      setTopUpModalCloseRequestKey((prev) => prev + 1);
      setIsTopUpModalOpen(false);
    }
    if (isProfileMenuOpen) {
      setProfileMenuCloseRequestKey((prev) => prev + 1);
      setIsProfileMenuOpen(false);
    }
    if (isSavedSearchesOpen) {
      setSavedSearchesCloseRequestKey((prev) => prev + 1);
      setIsSavedSearchesOpen(false);
    }
  };

  const handleMobileMenuToggle = () => {
    if (mobileOpen) {
      setMobileOpen(false);
      return;
    }

    if (showNotificationsMenu) {
      closeNotificationsMenu(false);
    }
    if (isTopUpModalOpen) {
      setTopUpModalCloseRequestKey((prev) => prev + 1);
      setIsTopUpModalOpen(false);
    }
    if (isProfileMenuOpen) {
      setProfileMenuCloseRequestKey((prev) => prev + 1);
      setIsProfileMenuOpen(false);
    }
    if (isSavedSearchesOpen) {
      setSavedSearchesCloseRequestKey((prev) => prev + 1);
      setIsSavedSearchesOpen(false);
    }

    setMobileOpen(true);
  };

  return (
    <header
      style={styles.header}
      className={`site-nav-header ${hasMobileFocusPanel ? "mobile-sheet-open" : ""}`}
    >
      <style>{css}</style>

      <div style={styles.inner} className="nav-inner">
        {/* Brand */}
        <Link to="/" style={styles.brand} className="nav-brand-link" aria-label="Kar.bg">
          <img src={karBgLogo} alt="Kar.bg logo" style={styles.logoImage} className="nav-logo-image" />
        </Link>

        <div className="mobile-header-actions">
          {isAuthenticated ? (
            <div className="mobile-profile-slot">
              <ProfileMenu
                onDropdownOpenChange={setIsProfileMenuOpen}
                onTopUpModalOpenChange={setIsTopUpModalOpen}
                closeRequestKey={profileMenuCloseRequestKey}
                topUpModalCloseRequestKey={topUpModalCloseRequestKey}
                compactTrigger
              />
            </div>
          ) : null}
          {isAuthenticated ? (
            <button
              type="button"
              className={`btn-ghost btn-notifications mobile-header-bell ${showNotificationsMenu ? "open" : ""} ${hasUnreadNotifications ? "has-unread" : ""}`}
              onClick={handleOpenNotificationsFromMobileHeader}
              aria-label="Известия"
              title="Известия"
              ref={mobileNotificationsTriggerRef}
            >
              <span className="notifications-icon-wrap">
                <FiBell size={24} className="notifications-bell-icon" />
                {hasUnreadNotifications && (
                  <span className="notification-count-badge">
                    {unreadNotificationsCount > 99 ? "99+" : unreadNotificationsCount}
                  </span>
                )}
              </span>
            </button>
          ) : null}
          {!isAuthenticated ? (
            <Link
              to="/auth"
              className="btn-primary mobile-login-cta"
              onClick={() => setMobileOpen(false)}
            >
              <FiUser size={15} />
              Вход
            </Link>
          ) : null}
          {/* Mobile burger */}
          <button
            type="button"
            className={`burger ${mobileOpen ? "open" : ""}`}
            onClick={handleMobileMenuToggle}
            aria-expanded={mobileOpen}
            aria-controls="site-main-nav"
            aria-label={mobileOpen ? "Затвори менюто" : "Отвори менюто"}
          >
            <span className="burger-icon-wrap" aria-hidden="true">
              <FiMenu size={18} className="burger-icon burger-icon-menu" />
              <FiX size={18} className="burger-icon burger-icon-close" />
            </span>
          </button>
        </div>

        <div className="mobile-panel-header" aria-live="polite">
          <button
            type="button"
            className="mobile-panel-back-btn"
            onClick={handleCloseMobileFocusPanel}
            aria-label="Назад към менюто"
          >
            <FiChevronLeft size={18} />
          </button>
          <div className="mobile-panel-title">{mobilePanelTitle}</div>
          <span className="mobile-panel-spacer" aria-hidden="true" />
        </div>

        <button
          type="button"
          className={`nav-mobile-backdrop ${mobileOpen ? "open" : ""}`}
          onClick={() => {
            closeNotificationsMenu(true);
            setSavedSearchesCloseRequestKey((prev) => prev + 1);
            setIsSavedSearchesOpen(false);
            setMobileOpen(false);
          }}
          aria-label="Затвори менюто"
          aria-hidden={!mobileOpen}
          tabIndex={mobileOpen ? 0 : -1}
        />

        {/* Nav */}
        <nav
          id="site-main-nav"
          className={`nav ${mobileOpen ? "open" : ""} ${mobileFocusClass}`.trim()}
        >
          <div className="nav-group nav-left">
            <Link
              to="/"
              className={`nav-link ${isActive("/") ? "active" : ""}`}
              onClick={() => setMobileOpen(false)}
            >
              <FiHome size={16} />
              Начало
            </Link>

            <Link
              to="/dealers"
              className={`nav-link ${isActive("/dealers") ? "active" : ""}`}
              onClick={() => setMobileOpen(false)}
            >
              <FiBriefcase size={16} />
              Дилъри
            </Link>

            <div className="saved-searches-slot">
              <SavedSearchesMenu
                onDropdownOpenChange={setIsSavedSearchesOpen}
                closeRequestKey={savedSearchesCloseRequestKey}
              />
            </div>
          </div>

          <div className="nav-group nav-right">
            {isAuthenticated ? (
              <>
                <div className="notifications-wrap" ref={notificationsRef}>
                  <button
                    className={`btn-ghost btn-notifications ${showNotificationsMenu ? "open" : ""} ${hasUnreadNotifications ? "has-unread" : ""}`}
                    onClick={handleNotificationsToggle}
                    aria-label="Известия"
                    aria-haspopup="menu"
                    aria-expanded={showNotificationsMenu}
                    title="Известия"
                  >
                    <span className="notifications-icon-wrap">
                      <FiBell size={25} className="notifications-bell-icon" />
                      {hasUnreadNotifications && (
                        <span className="notification-count-badge">
                          {unreadNotificationsCount > 99 ? "99+" : unreadNotificationsCount}
                        </span>
                      )}
                    </span>
                    <span className="notifications-mobile-label">Известия</span>
                  </button>

                  {showNotificationsMenu && (
                    <div className="notifications-menu" role="menu" aria-label="Списък с известия">
                      <button
                        type="button"
                        className="notifications-mobile-back-btn"
                        onClick={() => closeNotificationsMenu(false)}
                        aria-label="Назад към менюто"
                      >
                        <span className="notifications-mobile-back-icon" aria-hidden="true">
                          <FiChevronLeft size={14} />
                        </span>
                        <span>Към менюто</span>
                      </button>
                      <div className="notifications-title">Център за известия</div>
                      <div className="notifications-tabs" role="tablist" aria-label="Раздели за известия">
                        <button
                          type="button"
                          className={`notifications-tab ${notificationsTab === "notifications" ? "active" : ""}`}
                          onClick={() => setNotificationsTab("notifications")}
                        >
                          Известия ({notifications.length})
                        </button>
                        <button
                          type="button"
                          className={`notifications-tab ${notificationsTab === "subscriptions" ? "active" : ""}`}
                          onClick={() => setNotificationsTab("subscriptions")}
                        >
                          Абонирани ({followedDealers.length})
                        </button>
                      </div>

                      {notificationsTab === "notifications" ? (
                        !hasNotifications ? (
                          <div className="notifications-empty">Тук ще виждаш известия за активността ти в сайта.</div>
                        ) : (
                          <>
                            {hasUnreadNotifications && (
                              <button
                                type="button"
                                className="notifications-mark-all-btn"
                                onClick={handleMarkAllAsRead}
                              >
                                Прочети всички
                              </button>
                            )}
                            <div className="notifications-list">
                              {notificationRenderItems.map((item) => {
                                if (item.kind === "group") {
                                  const isExpanded = Boolean(expandedNotificationGroups[item.groupKey]);
                                  const unreadCount = item.notifications.filter(
                                    (notification) => !notification.isRead
                                  ).length;
                                  const totalListingsAdded = item.notifications.reduce(
                                    (sum, notification) => sum + notification.listingsAdded,
                                    0
                                  );
                                  const latestNotification = item.notifications[0];
                                  const firstNotification = item.notifications[item.notifications.length - 1];
                                  const groupAvatarUrl = getDealerAvatarUrl(item.dealerId);

                                  return (
                                    <div
                                      key={item.groupKey}
                                      className={`notification-item ${unreadCount > 0 ? "unread" : "read"}`}
                                      role="menuitem"
                                    >
                                      <div className="notification-item-top">
                                        <div className="notification-item-identity">
                                          {groupAvatarUrl ? (
                                            <span className="notification-avatar" aria-hidden="true">
                                              <img
                                                src={groupAvatarUrl}
                                                alt=""
                                                className="notification-avatar-image"
                                              />
                                            </span>
                                          ) : null}
                                          <span className="notification-item-type">
                                            Дилър {item.dealerName}
                                          </span>
                                        </div>
                                        <span className="notification-item-time">
                                          {formatNotificationDate(latestNotification.createdAt)}
                                        </span>
                                      </div>
                                      <div className="notification-item-main">
                                        <span className="notification-item-amount">
                                          +{formatListingsAdded(totalListingsAdded)}
                                        </span>
                                        <span className="notification-item-text">
                                          {item.dealerName}: {item.notifications.length} събития за последния 1 час.
                                        </span>
                                      </div>
                                      <div className="notification-item-actions">
                                        <button
                                          type="button"
                                          className="notification-link-btn"
                                          onClick={() => handleOpenDealerFromNotification(latestNotification)}
                                          aria-label="Отвори профил"
                                          title="Отвори профил"
                                        >
                                          <FiExternalLink size={13} />
                                        </button>
                                        {unreadCount > 0 ? (
                                          <button
                                            type="button"
                                            className="notification-read-btn"
                                            onClick={() => handleMarkNotificationGroupRead(item.notifications)}
                                            aria-label="Маркирай групата като прочетена"
                                            title={`Маркирай като прочетени (${unreadCount})`}
                                          >
                                            <FiCheck size={13} />
                                          </button>
                                        ) : (
                                          <span className="notification-read-label" title="Прочетено">
                                            <FiCheck size={12} />
                                          </span>
                                        )}
                                        <button
                                          type="button"
                                          className="notification-expand-btn"
                                          onClick={() => handleToggleNotificationGroup(item.groupKey)}
                                          aria-label={isExpanded ? "Скрий детайли" : "Разгъни детайли"}
                                          title={isExpanded ? "Скрий детайли" : "Разгъни детайли"}
                                        >
                                          {isExpanded ? <FiChevronUp size={13} /> : <FiChevronDown size={13} />}
                                        </button>
                                      </div>
                                      {isExpanded && (
                                        <div className="notification-group-details">
                                          {item.notifications.map((notification) => (
                                            <div key={notification.id} className="notification-group-row">
                                              <span>
                                                {formatNotificationDate(notification.createdAt)} · +
                                                {formatListingsAdded(notification.listingsAdded)}
                                              </span>
                                              <button
                                                type="button"
                                                className="notification-group-open-btn"
                                                onClick={() =>
                                                  handleOpenDealerFromNotification(notification)
                                                }
                                              >
                                                Отвори
                                              </button>
                                            </div>
                                          ))}
                                          <div className="notification-group-summary">
                                            Общо: {item.dealerName} има {formatTotalListings(firstNotification.totalListings)}.
                                          </div>
                                        </div>
                                      )}
                                    </div>
                                  );
                                }

                                const notification = item.notification;
                                const dealerAvatarUrl =
                                  notification.type === "dealer_listing"
                                    ? getDealerAvatarUrl(notification.dealerId)
                                    : null;
                                return (
                                  <div
                                    key={notification.id}
                                    className={`notification-item ${notification.isRead ? "read" : "unread"}`}
                                    role="menuitem"
                                  >
                                    <div className="notification-item-top">
                                      <div className="notification-item-identity">
                                        {dealerAvatarUrl ? (
                                          <span className="notification-avatar" aria-hidden="true">
                                            <img
                                              src={dealerAvatarUrl}
                                              alt=""
                                              className="notification-avatar-image"
                                            />
                                          </span>
                                        ) : null}
                                        <span className="notification-item-type">
                                          {notification.type === "deposit"
                                            ? "Депозит"
                                            : `Дилър ${notification.dealerName}`}
                                        </span>
                                      </div>
                                      <span className="notification-item-time">
                                        {formatNotificationDate(notification.createdAt)}
                                      </span>
                                    </div>
                                    <div className="notification-item-main">
                                      <span className="notification-item-amount">
                                        {notification.type === "deposit"
                                          ? `+${formatNotificationAmount(
                                              notification.amount,
                                              notification.currency
                                            )}`
                                          : `+${formatListingsAdded(notification.listingsAdded)}`}
                                      </span>
                                      <span className="notification-item-text">
                                        {notification.type === "deposit"
                                          ? "Добавени средства в баланса."
                                          : `${notification.dealerName} публикува ${formatListingsAdded(
                                              notification.listingsAdded
                                            )} (${formatTotalListings(notification.totalListings)}).`}
                                      </span>
                                    </div>
                                    <div className="notification-item-actions">
                                      {notification.type === "dealer_listing" && (
                                        <button
                                          type="button"
                                          className="notification-link-btn"
                                          onClick={() => handleOpenDealerFromNotification(notification)}
                                          aria-label="Отвори профил"
                                          title="Отвори профил"
                                        >
                                          <FiExternalLink size={13} />
                                        </button>
                                      )}
                                      {notification.isRead ? (
                                        <span className="notification-read-label" title="Прочетено">
                                          <FiCheck size={12} />
                                        </span>
                                      ) : (
                                        <button
                                          type="button"
                                          className="notification-read-btn"
                                          onClick={() => handleMarkAsRead(notification.id)}
                                          aria-label="Маркирай като прочетено"
                                          title="Маркирай като прочетено"
                                        >
                                          <FiCheck size={13} />
                                        </button>
                                      )}
                                    </div>
                                  </div>
                                );
                              })}
                            </div>
                          </>
                        )
                      ) : !hasFollowedDealers ? (
                        <div className="notifications-empty">
                          Нямаш абонирани дилъри. Отвори страницата с дилъри и натисни камбанката.
                        </div>
                      ) : (
                        <div className="subscriptions-list">
                          {followedDealers.map((dealer) => {
                            const subscriptionAvatarUrl =
                              typeof dealer.dealerProfileImageUrl === "string"
                                ? dealer.dealerProfileImageUrl.trim()
                                : "";
                            return (
                              <div key={dealer.dealerId} className="subscription-item">
                                <div className="subscription-header">
                                  {subscriptionAvatarUrl ? (
                                    <span className="subscription-avatar" aria-hidden="true">
                                      <img
                                        src={subscriptionAvatarUrl}
                                        alt=""
                                        className="subscription-avatar-image"
                                      />
                                    </span>
                                  ) : null}
                                  <div className="subscription-main">
                                    <div className="subscription-name">{dealer.dealerName}</div>
                                    <div className="subscription-meta">
                                      {dealer.dealerCity ? `${dealer.dealerCity} · ` : ""}
                                      {formatTotalListings(dealer.lastKnownListingCount)}
                                    </div>
                                  </div>
                                </div>
                                <div className="subscription-actions">
                                  <button
                                    type="button"
                                    className="subscription-open-btn"
                                    onClick={() => handleOpenFollowedDealer(dealer.dealerId)}
                                  >
                                    Профил
                                  </button>
                                  <button
                                    type="button"
                                    className="subscription-remove-btn"
                                    onClick={() => handleUnfollowDealer(dealer.dealerId)}
                                  >
                                    Премахни
                                  </button>
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      )}
                    </div>
                  )}
                </div>
                <div className="profile-menu-desktop-slot">
                  <ProfileMenu
                    onDropdownOpenChange={setIsProfileMenuOpen}
                    onTopUpModalOpenChange={setIsTopUpModalOpen}
                    closeRequestKey={profileMenuCloseRequestKey}
                    topUpModalCloseRequestKey={topUpModalCloseRequestKey}
                  />
                </div>
                <Link
                  to="/publish"
                  className={`nav-publish-cta ${isActive("/publish") ? "active" : ""}`}
                  onClick={() => setMobileOpen(false)}
                >
                  <span className="nav-publish-icon" aria-hidden="true">
                    <FiPlus size={14} />
                  </span>
                  <span className="nav-publish-label">Пусни обява</span>
                  <BezplatnoBadge className="nav-publish-ribbon" size="xs" />
                </Link>
              </>
            ) : (
              <Link
                to="/auth"
                className="btn-primary desktop-login-cta"
                onClick={() => setMobileOpen(false)}
              >
                <FiUser size={16} />
                Вход
              </Link>
            )}
          </div>
        </nav>
      </div>
    </header>
  );
};

export default Navbar;

/* ---------------- styles ---------------- */

const styles: Record<string, React.CSSProperties> = {
  header: {
    background: "#fff",
    borderBottom: "1px solid #e0e0e0",
    boxShadow: "0 1px 3px rgba(0,0,0,0.08)",
    fontFamily: "\"Manrope\", \"Segoe UI\", -apple-system, system-ui, sans-serif",
    fontSize: 14,
    lineHeight: 1.2,
    position: "sticky",
    top: 0,
    zIndex: 100,
    display: "flex",
    justifyContent: "center",
    width: "100%",
    maxWidth: "100vw",
    boxSizing: "border-box",
    overflowX: "clip",
    padding: "0",
  },
  inner: {
    maxWidth: 1200,
    width: "100%",
    margin: "0 auto",
    padding: "0 20px",
    display: "flex",
    alignItems: "center",
    flexWrap: "nowrap",
    gap: 24,
    minHeight: 56,
    boxSizing: "border-box",
  },
  brand: {
    display: "flex",
    alignItems: "center",
    gap: 0,
    textDecoration: "none",
    justifyContent: "flex-start",
    paddingLeft: 0,
    flexShrink: 0,
  },
  logoImage: {
    objectFit: "contain",
    display: "block",
    borderRadius: 0,
    boxShadow: "none",
    border: 0,
    background: "transparent",
  },
  brandText: {
    fontSize: 19,
    fontWeight: 700,
    color: "#0f766e",
    letterSpacing: 0.2,
    fontFamily: "\"Space Grotesk\", \"Manrope\", \"Segoe UI\", sans-serif",
  },
};

const css = `
@import url('https://fonts.googleapis.com/css2?family=Manrope:wght@400;500;600;700;800&family=Space+Grotesk:wght@500;600;700&display=swap');

.nav {
  display: flex;
  align-items: center;
  gap: 16px;
  margin-left: auto;
  flex: 1;
  font-family: "Manrope", "Segoe UI", -apple-system, system-ui, sans-serif;
  font-size: 14px;
  line-height: 1.2;
  min-width: 0;
}

.nav-inner {
  position: relative;
}

.mobile-header-actions {
  display: none;
}

.mobile-profile-slot {
  display: none;
}

.mobile-header-bell {
  display: none;
}

.mobile-login-cta {
  display: none;
}

.profile-menu-desktop-slot {
  display: inline-flex;
  align-items: center;
}

.mobile-panel-header {
  display: none;
}

.mobile-panel-back-btn {
  border: 1px solid rgba(148, 163, 184, 0.42);
  background: linear-gradient(180deg, #ffffff 0%, #f8fafc 100%);
  color: #0f766e;
  width: 42px;
  height: 42px;
  border-radius: 14px;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  box-shadow: 0 7px 14px rgba(15, 23, 42, 0.14);
  cursor: pointer;
  padding: 0;
}

.mobile-panel-back-btn:hover {
  border-color: rgba(45, 212, 191, 0.62);
  background: linear-gradient(180deg, #ffffff 0%, #ecfeff 100%);
}

.mobile-panel-title {
  font-size: 15px;
  font-weight: 800;
  color: #0f172a;
  letter-spacing: 0.01em;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.mobile-panel-spacer {
  width: 42px;
  height: 42px;
}

.nav-brand-link {
  position: relative;
  display: inline-flex;
  align-items: center;
  justify-content: flex-start;
  align-self: center;
  height: 42px;
  flex-shrink: 0;
  transition: opacity 0.2s ease;
}

.nav-brand-link:hover {
  opacity: 0.92;
}

.nav-brand-link:active {
  opacity: 0.82;
}

.nav-logo-image {
  width: auto;
  height: 100%;
  max-height: 42px;
  max-width: min(290px, 31vw);
  border: 0;
  border-radius: 0;
  box-shadow: none;
  background: transparent;
}

.nav-group {
  display: flex;
  align-items: center;
  gap: 10px;
}

.nav-right {
  margin-left: auto;
}

.nav-group > * {
  display: inline-flex;
  align-items: center;
}

.nav-group > style {
  display: none !important;
}

.nav-publish-cta {
  position: relative;
  isolation: isolate;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 10px;
  box-sizing: border-box;
  width: 10.5rem;
  height: 42px;
  min-width: 10.5rem;
  max-width: 10.5rem;
  flex: 0 0 10.5rem;
  padding: 0 18px 0 12px;
  border-radius: 14px;
  border: 1px solid #0f766e;
  text-decoration: none;
  white-space: nowrap;
  overflow: visible;
  color: #ffffff;
  background: linear-gradient(135deg, #0f766e 0%, #0f766e 58%, #0d9488 100%);
  background-size: 140% 140%;
  background-position: 0% 50%;
  box-shadow: none;
  animation: navPublishPulse 3.8s cubic-bezier(0.4, 0, 0.2, 1) infinite;
  transition: transform 0.22s cubic-bezier(0.4, 0, 0.2, 1),
    background-position 0.32s cubic-bezier(0.4, 0, 0.2, 1),
    border-color 0.22s cubic-bezier(0.4, 0, 0.2, 1);
}

.nav-publish-cta,
.nav-publish-cta:visited,
.nav-publish-cta:hover,
.nav-publish-cta:focus-visible,
.nav-publish-cta.active,
.nav-publish-cta.active:hover,
.nav-publish-cta.active:focus-visible {
  text-decoration: none;
}

.nav-publish-cta::before {
  content: none;
}

.nav-publish-cta::after {
  content: "";
  position: absolute;
  inset: 1px;
  border-radius: 14px;
  background: linear-gradient(120deg, rgba(255, 255, 255, 0.24), rgba(255, 255, 255, 0) 45%);
  opacity: 0.65;
  pointer-events: none;
  z-index: 0;
}

.nav-publish-cta:hover,
.nav-publish-cta:focus-visible {
  transform: translateY(-1px);
  background-position: 100% 50%;
  border-color: #0b5f59;
  color: #fff;
  box-shadow: none;
}

.nav-publish-cta:hover::before,
.nav-publish-cta:focus-visible::before {
  content: none;
}

.nav-publish-cta.active {
  background-position: 0% 50%;
  border-color: #0f766e;
  color: #fff;
  box-shadow: none;
  animation: navPublishPulse 3.8s cubic-bezier(0.4, 0, 0.2, 1) infinite;
}

.nav-publish-cta.active::before {
  content: none;
}


.nav-publish-cta.active:hover,
.nav-publish-cta.active:focus-visible {
  transform: translateY(-1px);
  background-position: 100% 50%;
  border-color: #0b5f59;
  color: #fff;
  box-shadow: none;
}

.nav-publish-cta:active {
  box-shadow: none;
}

.nav-publish-icon,
.nav-publish-label {
  position: relative;
  z-index: 1;
}

.nav-publish-icon {
  width: 22px;
  height: 22px;
  border-radius: 12px;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  background: rgba(255, 255, 255, 0.2);
  color: #ffffff;
  box-shadow: inset 0 0 0 1px rgba(255, 255, 255, 0.32);
  transition: background-color 0.2s ease, color 0.2s ease, box-shadow 0.2s ease;
}

.nav-publish-cta:hover .nav-publish-icon,
.nav-publish-cta:focus-visible .nav-publish-icon {
  background: rgba(255, 255, 255, 0.3);
  color: #ffffff;
  box-shadow: inset 0 0 0 1px rgba(255, 255, 255, 0.45);
}

.nav-publish-label {
  font-size: 14px;
  font-weight: 800;
  line-height: 1;
  letter-spacing: 0.01em;
  transform: none;
  text-shadow: none;
  -webkit-font-smoothing: antialiased;
  text-rendering: optimizeLegibility;
}

.nav-publish-ribbon {
  filter: drop-shadow(0 2px 4px rgba(15, 23, 42, 0.2)) brightness(1) contrast(1.04);
  transform: none;
  transition: filter 200ms cubic-bezier(0.4, 0, 0.2, 1);
}

.nav-publish-cta:hover .nav-publish-ribbon,
.nav-publish-cta:focus-visible .nav-publish-ribbon {
  filter: drop-shadow(0 3px 6px rgba(15, 23, 42, 0.22)) brightness(1.06) contrast(1.04);
}

@keyframes navPublishPulse {
  0%,
  62%,
  100% {
    background-position: 0% 50%;
  }
  18% {
    background-position: 14% 50%;
  }
  30% {
    background-position: 8% 50%;
  }
}

.notifications-wrap {
  position: relative;
}

.btn-notifications {
  width: 42px;
  min-width: 42px;
  height: 42px;
  padding: 0;
  justify-content: center;
  position: relative;
  color: #0f766e;
  border: 1px solid #99f6e4;
  background: linear-gradient(180deg, #ffffff 0%, #ecfdf5 100%);
  box-shadow: 0 8px 18px rgba(15, 118, 110, 0.18);
}

.notifications-icon-wrap {
  position: relative;
  display: inline-flex;
  align-items: center;
  justify-content: center;
}

.notifications-mobile-label {
  display: none;
}

.btn-notifications:hover {
  color: #0b5f59;
  border-color: #5eead4;
  background: linear-gradient(180deg, #ffffff 0%, #d1fae5 100%);
  box-shadow: 0 10px 22px rgba(15, 118, 110, 0.24);
}

.notifications-bell-icon {
  display: block;
  width: 22px;
  height: 22px;
  stroke-width: 2.25;
}

.btn-notifications.has-unread .notifications-bell-icon {
  transform-origin: top center;
  animation: bellGentleSwing 2.2s ease-in-out infinite;
}

.btn-notifications.open {
  background: linear-gradient(180deg, #f0fdfa 0%, #ccfbf1 100%);
  border-color: #2dd4bf;
  color: #0f766e;
}

@keyframes bellGentleSwing {
  0%,
  62%,
  100% {
    transform: rotate(0deg);
  }
  68% {
    transform: rotate(10deg);
  }
  74% {
    transform: rotate(-8deg);
  }
  80% {
    transform: rotate(5deg);
  }
  86% {
    transform: rotate(-3deg);
  }
}

.notification-count-badge {
  position: absolute;
  top: -5px;
  right: -7px;
  min-width: 18px;
  height: 18px;
  padding: 0 4px;
  border-radius: 999px;
  background: #dc2626;
  color: #fff;
  font-size: 10px;
  line-height: 1;
  font-weight: 800;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  border: 2px solid #fff;
  box-shadow: 0 2px 7px rgba(220, 38, 38, 0.4);
}

.notifications-menu {
  position: absolute;
  top: calc(100% + 10px);
  right: 0;
  width: 340px;
  border-radius: 16px;
  border: 1px solid #e2e8f0;
  background: #fff;
  box-shadow: 0 14px 36px rgba(15, 23, 42, 0.14);
  padding: 12px;
  z-index: 1100;
}

.notifications-title {
  font-size: 14px;
  font-weight: 800;
  color: #0f172a;
  margin-bottom: 8px;
}

.notifications-mobile-back-btn {
  display: none;
}

.notifications-tabs {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 8px;
  margin-bottom: 10px;
}

.notifications-tab {
  height: 34px;
  border-radius: 16px;
  border: 1px solid #cbd5e1;
  background: #f8fafc;
  color: #334155;
  font-size: 12px;
  font-weight: 700;
  cursor: pointer;
  transition: all 0.2s ease;
}

.notifications-tab:hover {
  border-color: #94a3b8;
  background: #f1f5f9;
}

.notifications-tab.active {
  border-color: #99f6e4;
  background: #ecfdf5;
  color: #0f766e;
}

.notifications-empty {
  border-radius: 16px;
  border: 1px dashed #cbd5e1;
  background: #f8fafc;
  padding: 10px;
  font-size: 13px;
  line-height: 1.45;
  color: #475569;
}

.notifications-list {
  display: flex;
  flex-direction: column;
  gap: 8px;
  max-height: 320px;
  overflow-y: auto;
  padding-right: 2px;
}

.notification-item {
  border: 1px solid #e2e8f0;
  border-radius: 16px;
  background: #fff;
  padding: 10px;
  display: flex;
  flex-direction: column;
  gap: 7px;
}

.notification-item.unread {
  border-color: #99f6e4;
  background: #f0fdfa;
}

.notification-item-top {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 8px;
}

.notification-item-identity {
  display: inline-flex;
  align-items: center;
  gap: 8px;
  min-width: 0;
}

.notification-avatar {
  width: 28px;
  height: 28px;
  border-radius: 999px;
  overflow: hidden;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
  border: 1px solid #fdba74;
  background: #fff7ed;
}

.notification-avatar-image {
  width: 100%;
  height: 100%;
  object-fit: cover;
  display: block;
}

.notification-item-type {
  font-size: 12px;
  font-weight: 800;
  text-transform: uppercase;
  letter-spacing: 0.25px;
  color: #d97706;
  line-height: 1.2;
}

.notification-item-time {
  font-size: 11px;
  color: #64748b;
  white-space: nowrap;
}

.notification-item-main {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 8px;
}

.notification-item-amount {
  color: #047857;
  font-size: 14px;
  font-weight: 800;
  white-space: nowrap;
}

.notification-item-text {
  color: #334155;
  font-size: 12px;
  text-align: right;
}

.notification-item-actions {
  display: flex;
  justify-content: flex-end;
  align-items: center;
  gap: 6px;
}

.notification-link-btn {
  border: 1px solid #bbf7d0;
  background: #ecfdf5;
  color: #0f766e;
  border-radius: 999px;
  width: 30px;
  height: 26px;
  cursor: pointer;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  padding: 0;
}

.notification-link-btn:hover {
  background: #d1fae5;
  border-color: #86efac;
}

.notification-expand-btn {
  border: 1px solid #cbd5e1;
  background: #f8fafc;
  color: #334155;
  border-radius: 999px;
  width: 30px;
  height: 26px;
  cursor: pointer;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  padding: 0;
}

.notification-expand-btn:hover {
  background: #f1f5f9;
}

.notification-read-btn {
  border: 1px solid #bae6fd;
  background: #f0f9ff;
  color: #0c4a6e;
  border-radius: 999px;
  width: 30px;
  height: 26px;
  cursor: pointer;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  padding: 0;
}

.notification-read-btn:hover {
  background: #e0f2fe;
  border-color: #7dd3fc;
}

.notification-read-label {
  color: #6b7280;
  width: 30px;
  height: 26px;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  border: 1px solid #d1d5db;
  background: #f3f4f6;
  border-radius: 999px;
}

.notification-link-btn svg,
.notification-expand-btn svg,
.notification-read-btn svg,
.notification-read-label svg {
  width: 14px;
  height: 14px;
  stroke-width: 2.4;
}

.notification-group-details {
  border-top: 1px dashed #cbd5e1;
  padding-top: 8px;
  margin-top: 2px;
  display: flex;
  flex-direction: column;
  gap: 6px;
}

.notification-group-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 8px;
  font-size: 12px;
  color: #475569;
}

.notification-group-open-btn {
  border: 1px solid #d1d5db;
  background: #fff;
  color: #334155;
  border-radius: 999px;
  font-size: 11px;
  font-weight: 700;
  padding: 2px 10px;
  cursor: pointer;
}

.notification-group-open-btn:hover {
  background: #f8fafc;
}

.notification-group-summary {
  font-size: 11px;
  color: #64748b;
  margin-top: 2px;
}

.notifications-mark-all-btn {
  width: 100%;
  border: 1px solid #bfdbfe;
  background: #eff6ff;
  color: #1e3a8a;
  border-radius: 16px;
  padding: 8px 10px;
  font-size: 12px;
  font-weight: 700;
  cursor: pointer;
  margin-bottom: 8px;
}

.notifications-mark-all-btn:hover {
  background: #dbeafe;
  border-color: #93c5fd;
}

.notifications-footer {
  margin-top: 8px;
  text-align: center;
  font-size: 11px;
  color: #64748b;
}

.subscriptions-list {
  display: flex;
  flex-direction: column;
  gap: 8px;
  max-height: 320px;
  overflow-y: auto;
  padding-right: 2px;
}

.subscription-item {
  border: 1px solid #dbeafe;
  border-radius: 16px;
  padding: 10px;
  background: #f8fafc;
  display: flex;
  flex-direction: column;
  gap: 9px;
}

.subscription-header {
  display: flex;
  align-items: center;
  gap: 10px;
  min-width: 0;
}

.subscription-avatar {
  width: 38px;
  height: 38px;
  border-radius: 999px;
  overflow: hidden;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
  border: 1px solid #cbd5e1;
  background: #ffffff;
}

.subscription-avatar-image {
  width: 100%;
  height: 100%;
  object-fit: cover;
  display: block;
}

.subscription-main {
  min-width: 0;
}

.subscription-name {
  font-size: 13px;
  font-weight: 800;
  color: #0f172a;
  line-height: 1.3;
}

.subscription-meta {
  font-size: 12px;
  color: #64748b;
  margin-top: 3px;
}

.subscription-actions {
  display: flex;
  align-items: center;
  justify-content: flex-end;
  gap: 6px;
}

.subscription-open-btn,
.subscription-remove-btn {
  border-radius: 999px;
  padding: 3px 10px;
  font-size: 11px;
  font-weight: 700;
  cursor: pointer;
}

.subscription-open-btn {
  border: 1px solid #bfdbfe;
  background: #eff6ff;
  color: #1e3a8a;
}

.subscription-open-btn:hover {
  background: #dbeafe;
}

.subscription-remove-btn {
  border: 1px solid #fecaca;
  background: #fff1f2;
  color: #b91c1c;
}

.subscription-remove-btn:hover {
  background: #ffe4e6;
}

.nav-link {
  display: inline-flex;
  align-items: center;
  gap: 7px;
  height: 38px;
  padding: 0 8px;
  border-radius: 14px;
  text-decoration: none;
  font-size: 14px;
  font-weight: 650;
  color: #334155;
  border: none;
  background: transparent;
  transition: color 0.2s ease, text-decoration-color 0.2s ease;
  white-space: nowrap;
}

.nav-link:hover {
  color: #0f766e;
  text-decoration: none;
  text-decoration: underline;
  text-decoration-thickness: 2px;
  text-underline-offset: 8px;
  text-decoration-color: rgba(15, 118, 110, 0.55);
}

.nav-link.active {
  color: #0f766e;
  font-weight: 650;
  text-decoration: underline;
  text-decoration-thickness: 2px;
  text-underline-offset: 8px;
  text-decoration-color: #0f766e;
}

.nav-link:focus-visible,
.nav-publish-cta:focus-visible,
.btn-primary:focus-visible,
.btn-ghost:focus-visible {
  outline: 3px solid rgba(15, 118, 110, 0.35);
  outline-offset: 2px;
}

/* PRIMARY BUTTON */
.btn-primary {
  height: 38px;
  padding: 0 16px;
  border-radius: 14px;
  background: #0f766e;
  color: #fff;
  font-size: 14px;
  line-height: 1;
  font-weight: 700;
  border: none;
  cursor: pointer;
  display: inline-flex;
  align-items: center;
  gap: 8px;
  text-decoration: none;
  box-shadow: 0 8px 18px rgba(15, 118, 110, 0.28);
  transition: background-color 0.2s ease, box-shadow 0.2s ease;
  white-space: nowrap;
}

.btn-primary:hover {
  background: #0b5f59;
  color: #fff;
  text-decoration: none;
  box-shadow: 0 10px 22px rgba(15, 118, 110, 0.32);
}

/* GHOST BUTTON */
.btn-ghost {
  height: 38px;
  padding: 0 14px;
  border-radius: 14px;
  background: #fff;
  border: 1px solid #ccc;
  color: #333;
  font-size: 14px;
  font-weight: 600;
  cursor: pointer;
  display: inline-flex;
  align-items: center;
  gap: 8px;
  transition: background-color 0.2s ease, border-color 0.2s ease, color 0.2s ease;
  white-space: nowrap;
}

.btn-ghost:hover {
  background: #f5f5f5;
  border-color: #bbb;
}

/* BURGER */
.burger {
  display: none;
  background: #0f766e;
  color: #fff;
  border: none;
  border-radius: 16px;
  padding: 8px 12px;
  font-size: 18px;
  cursor: pointer;
  box-shadow: 0 6px 14px rgba(15, 23, 42, 0.2);
  transition: transform 0.24s cubic-bezier(0.2, 0.8, 0.2, 1), box-shadow 0.24s ease, background 0.24s ease;
}

.burger-icon-wrap {
  position: relative;
  width: 18px;
  height: 18px;
  display: inline-flex;
  align-items: center;
  justify-content: center;
}

.burger-icon {
  position: absolute;
  inset: 0;
  transition: opacity 0.2s ease, transform 0.24s cubic-bezier(0.2, 0.8, 0.2, 1);
}

.burger-icon-menu {
  opacity: 1;
  transform: rotate(0deg) scale(1);
}

.burger-icon-close {
  opacity: 0;
  transform: rotate(-90deg) scale(0.72);
}

.burger.open .burger-icon-menu {
  opacity: 0;
  transform: rotate(90deg) scale(0.72);
}

.burger.open .burger-icon-close {
  opacity: 1;
  transform: rotate(0deg) scale(1);
}

.nav-mobile-backdrop {
  display: none;
}

/* MOBILE */
@media (max-width: 960px) {
  .site-nav-header {
    border-bottom-color: #dbeafe;
    box-shadow: 0 6px 18px rgba(15, 23, 42, 0.08);
    z-index: 280 !important;
    transition: box-shadow 0.24s ease;
  }

  .nav-inner {
    min-height: 60px !important;
    padding: 8px 14px !important;
    gap: 10px !important;
    transition: min-height 0.22s ease, padding 0.22s ease;
  }

  .site-nav-header.mobile-sheet-open {
    box-shadow: 0 10px 24px rgba(15, 23, 42, 0.16);
  }

  .site-nav-header.mobile-sheet-open .nav-inner {
    min-height: 78px !important;
    padding-top: 14px !important;
    padding-bottom: 14px !important;
  }

  .site-nav-header.mobile-sheet-open .nav-brand-link,
  .site-nav-header.mobile-sheet-open .mobile-header-actions {
    display: none !important;
  }

  .site-nav-header.mobile-sheet-open .mobile-panel-header {
    width: 100%;
    display: grid;
    grid-template-columns: 42px minmax(0, 1fr) 42px;
    align-items: center;
    gap: 8px;
  }

  .site-nav-header.mobile-sheet-open .mobile-panel-title {
    text-align: center;
  }

  .site-nav-header.mobile-sheet-open .nav {
    padding: 0;
    border: none;
    background: transparent;
    box-shadow: none;
    max-height: none;
    overflow: visible;
    backdrop-filter: none;
  }

  .site-nav-header.mobile-sheet-open .nav-left {
    display: none !important;
  }

  .site-nav-header.mobile-sheet-open .nav.focus-saved .nav-left {
    display: flex !important;
    width: 100%;
  }

  .site-nav-header.mobile-sheet-open .nav.focus-saved .nav-left > * {
    display: none !important;
  }

  .site-nav-header.mobile-sheet-open .nav.focus-saved .nav-left > .saved-searches-slot {
    display: block !important;
    width: 100%;
  }

  .site-nav-header.mobile-sheet-open .nav-right {
    width: 100%;
  }

  .site-nav-header.mobile-sheet-open .nav.focus-saved .nav-right {
    display: none !important;
  }

  .site-nav-header.mobile-sheet-open .nav-right > * {
    display: none !important;
  }

  .site-nav-header.mobile-sheet-open .nav.focus-notifications .nav-right > .notifications-wrap {
    display: block !important;
    width: 100%;
  }

  .site-nav-header.mobile-sheet-open .nav.focus-profile .nav-right > .profile-menu-root {
    display: block !important;
    width: 100%;
  }

  .site-nav-header.mobile-sheet-open .nav.focus-topup .nav-right > .topup-modal-overlay {
    display: flex !important;
    width: 100%;
  }

  .site-nav-header.mobile-sheet-open .nav.focus-notifications .btn-notifications {
    display: none !important;
  }

  .site-nav-header.mobile-sheet-open .nav.focus-profile .profile-menu-trigger {
    display: none !important;
  }

  .site-nav-header.mobile-sheet-open .nav.focus-topup .profile-menu-trigger {
    display: none !important;
  }

  .site-nav-header.mobile-sheet-open .nav.focus-topup .topup-modal-overlay {
    top: calc(82px + env(safe-area-inset-top, 0px) + 8px) !important;
    left: 10px !important;
    right: 10px !important;
    bottom: 0 !important;
    align-items: flex-start !important;
    justify-content: stretch !important;
    padding: 0 !important;
    background: transparent !important;
    backdrop-filter: none !important;
    z-index: 360 !important;
  }

  .site-nav-header.mobile-sheet-open .nav.focus-topup .topup-modal-card {
    width: auto !important;
    max-width: none !important;
    max-height: calc(100dvh - 102px) !important;
    border-radius: 18px !important;
  }

  .site-nav-header.mobile-sheet-open .nav.focus-topup .topup-modal-close-btn {
    display: none !important;
  }

  .nav-logo-image {
    max-height: 44px;
    max-width: min(228px, 48vw);
  }

  .nav-brand-link {
    height: 44px;
  }

  .nav-brand-link:hover {
    opacity: 0.92;
  }

  .mobile-header-actions {
    display: inline-flex;
    align-items: center;
    gap: 7px;
    margin-left: auto;
    flex-shrink: 0;
  }

  .mobile-profile-slot {
    display: inline-flex;
    align-items: center;
  }

  .mobile-profile-slot .profile-menu-root {
    display: inline-flex;
  }

  .mobile-header-bell {
    display: inline-flex;
    width: 42px;
    min-width: 42px;
    height: 42px;
    padding: 0;
    justify-content: center;
    border-radius: 14px;
    border: 1px solid #99f6e4;
    background: linear-gradient(180deg, #ffffff 0%, #ecfdf5 100%);
    box-shadow: 0 8px 18px rgba(15, 118, 110, 0.18);
    color: #0f766e;
  }

  .mobile-header-bell:hover {
    color: #0b5f59;
    border-color: #5eead4;
    background: linear-gradient(180deg, #ffffff 0%, #d1fae5 100%);
  }

  .mobile-login-cta {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    gap: 6px;
    height: 42px;
    padding: 0 12px;
    border-radius: 14px;
    font-size: 13px;
    line-height: 1;
    flex-shrink: 0;
  }

  .nav .desktop-login-cta {
    display: none !important;
  }

  .nav-right > .profile-menu-desktop-slot {
    display: none !important;
  }

  .nav-right > .notifications-wrap {
    display: none !important;
  }

  .nav.focus-notifications {
    opacity: 1;
    visibility: visible;
    pointer-events: none;
    transform: none;
    padding: 0;
    border: none;
    background: transparent;
    box-shadow: none;
    max-height: none;
    overflow: visible;
    backdrop-filter: none;
    width: auto;
    max-width: none;
  }

  .nav.focus-notifications .nav-left {
    display: none !important;
  }

  .nav.focus-notifications .nav-right {
    width: auto;
  }

  .nav.focus-notifications .nav-right > * {
    display: none !important;
  }

  .nav.focus-notifications .nav-right > .notifications-wrap {
    display: block !important;
    width: auto !important;
    pointer-events: auto;
  }

  .nav.focus-notifications .btn-notifications {
    display: none !important;
  }

  .burger {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    width: 42px;
    height: 42px;
    padding: 0;
    margin-left: 0;
    border-radius: 14px;
    background: linear-gradient(135deg, #0f766e 0%, #0d9488 100%);
    box-shadow: 0 8px 18px rgba(15, 23, 42, 0.22);
  }

  .burger.open {
    background: linear-gradient(135deg, #0b5f59 0%, #0f766e 100%);
    box-shadow: 0 10px 24px rgba(15, 23, 42, 0.28);
    transform: translateY(-1px);
  }

  .burger:active {
    transform: translateY(0);
  }

  .nav {
    display: flex;
    position: fixed;
    top: calc(64px + env(safe-area-inset-top, 0px) + 6px);
    right: 10px;
    left: auto;
    width: min(360px, calc(100vw - 16px));
    max-width: calc(100vw - 16px);
    background: rgba(255, 255, 255, 0.98);
    border: 1px solid #dbeafe;
    border-radius: 20px;
    padding: 12px;
    flex-direction: column;
    gap: 10px;
    box-shadow: 0 16px 34px rgba(15, 23, 42, 0.18);
    backdrop-filter: blur(8px);
    max-height: calc(100dvh - 84px);
    overflow-y: auto;
    overscroll-behavior: contain;
    z-index: 320;
    opacity: 0;
    visibility: hidden;
    pointer-events: none;
    transform: translateX(14px) scale(0.98);
    transform-origin: top right;
    transition:
      opacity 0.24s ease,
      transform 0.28s cubic-bezier(0.2, 0.8, 0.2, 1),
      visibility 0s linear 0.28s;
  }

  .nav.open {
    opacity: 1;
    visibility: visible;
    pointer-events: auto;
    transform: translateX(0) scale(1);
    transition-delay: 0s;
  }

  .nav:not(.open):not(.focus-notifications):not(.focus-profile):not(.focus-topup):not(.focus-saved) .nav-group {
    display: none !important;
  }

  .nav-mobile-backdrop {
    display: block;
    position: fixed;
    inset: 0;
    top: calc(60px + env(safe-area-inset-top, 0px));
    border: none;
    padding: 0;
    background: rgba(15, 23, 42, 0.18);
    z-index: 300;
    opacity: 0;
    pointer-events: none;
    transition: opacity 0.24s ease;
  }

  .nav-mobile-backdrop.open {
    opacity: 1;
    pointer-events: auto;
  }

  .site-nav-header.mobile-sheet-open .nav-mobile-backdrop {
    top: calc(78px + env(safe-area-inset-top, 0px));
  }

  .nav-group {
    width: 100%;
    flex-direction: column;
    gap: 8px;
  }

  .nav-right {
    margin-left: 0;
  }

  .nav-group > * {
    width: 100%;
  }

  .nav-group > .nav-link,
  .nav-group > .btn-primary,
  .nav-group > .nav-publish-cta {
    width: 100%;
    justify-content: flex-start;
  }

  .nav-group > div > .nav-link,
  .nav-group > div > a,
  .nav-group > div > button {
    width: 100%;
    justify-content: flex-start !important;
  }

  .nav .nav-link {
    height: 44px !important;
    padding: 0 14px !important;
    border: 1px solid #e2e8f0 !important;
    border-radius: 14px !important;
    background: #fff !important;
    text-decoration: none !important;
  }

  .nav .nav-link:hover,
  .nav .nav-link.active {
    background: #ecfdf5 !important;
    border-color: #99f6e4 !important;
    text-decoration: none !important;
  }

  .notifications-wrap {
    width: auto;
    position: static;
  }

  .nav .btn-notifications {
    width: 100%;
    min-width: 0;
    min-height: 44px;
    border-radius: 14px;
    justify-content: flex-start;
    gap: 10px;
    padding: 0 14px;
  }

  .nav .notifications-mobile-label {
    display: inline-flex;
    align-items: center;
    font-size: 13px;
    font-weight: 700;
    color: #0f766e;
  }

  .notifications-menu {
    position: fixed;
    top: calc(64px + env(safe-area-inset-top, 0px) + 8px);
    right: 10px;
    left: auto;
    width: min(360px, calc(100vw - 16px));
    max-width: calc(100vw - 16px);
    margin-top: 0;
    border-radius: 20px;
    box-shadow: 0 18px 38px rgba(15, 23, 42, 0.22);
    padding: 12px;
    max-height: calc(100dvh - 84px);
    overflow: hidden;
    z-index: 360;
    border: 1px solid #dbeafe;
    background: linear-gradient(180deg, #ffffff 0%, #f8fafc 100%);
    display: flex;
    flex-direction: column;
  }

  .notifications-title {
    font-size: 15px;
    margin-bottom: 10px;
  }

  .notifications-tabs {
    gap: 6px;
    margin-bottom: 10px;
  }

  .notifications-tab {
    height: 36px;
    border-radius: 12px;
    font-size: 12px;
  }

  .site-nav-header.mobile-sheet-open .nav {
    top: calc(82px + env(safe-area-inset-top, 0px) + 6px);
    max-height: calc(100dvh - 102px);
  }

  .site-nav-header.mobile-sheet-open .notifications-menu {
    top: calc(82px + env(safe-area-inset-top, 0px) + 8px);
    max-height: calc(100dvh - 102px);
  }

  .notifications-mobile-back-btn {
    display: none !important;
  }

  .notifications-tabs {
    grid-template-columns: 1fr 1fr;
  }

  .notifications-list,
  .subscriptions-list {
    max-height: min(56vh, 440px);
    padding-right: 4px;
  }

  .notification-item,
  .subscription-item {
    border-radius: 14px;
    padding: 11px;
  }

  .notifications-mark-all-btn {
    min-height: 38px;
    border-radius: 12px;
    font-size: 13px;
  }

  .notification-link-btn,
  .notification-expand-btn,
  .notification-read-btn,
  .notification-read-label {
    width: 34px;
    height: 30px;
  }

  .subscription-open-btn,
  .subscription-remove-btn {
    min-height: 30px;
    padding: 4px 11px;
    font-size: 11px;
  }

  .notification-item-main {
    flex-direction: column;
    align-items: flex-start;
  }

  .notification-item-top {
    align-items: flex-start;
  }

  .notification-item-time {
    white-space: normal;
    text-align: left;
  }

  .notification-item-type,
  .notification-item-text,
  .subscription-name,
  .subscription-meta {
    overflow-wrap: anywhere;
    word-break: break-word;
  }

  .notification-item-text {
    text-align: left;
  }

  .notification-item-actions {
    justify-content: flex-start;
    flex-wrap: wrap;
  }

  .notification-group-row {
    flex-direction: column;
    align-items: flex-start;
  }

  .subscription-actions {
    justify-content: flex-start;
    flex-wrap: wrap;
  }

  .nav .nav-publish-cta {
    width: 100%;
    min-width: 0;
    max-width: none;
    flex: 1 1 auto;
    height: 46px;
    border-radius: 14px;
    padding: 0 14px;
    justify-content: flex-start;
  }

  .nav .nav-publish-label {
    font-size: 14px;
  }

  .nav .btn-primary {
    min-height: 44px;
    border-radius: 14px;
    justify-content: center;
  }
}

@media (max-width: 640px) {
  .nav-inner {
    min-height: 56px !important;
    padding: 6px 10px !important;
  }

  .site-nav-header.mobile-sheet-open .nav-inner {
    min-height: 70px !important;
    padding-top: 12px !important;
    padding-bottom: 12px !important;
  }

  .site-nav-header.mobile-sheet-open .mobile-panel-back-btn,
  .site-nav-header.mobile-sheet-open .mobile-panel-spacer {
    width: 40px;
    height: 40px;
    border-radius: 12px;
  }

  .site-nav-header.mobile-sheet-open .mobile-panel-title {
    font-size: 14px;
  }

  .nav-logo-image {
    max-height: 40px;
    max-width: min(200px, 58vw);
  }

  .nav-brand-link {
    height: 40px;
  }

  .nav-brand-link:hover {
    opacity: 0.92;
  }

  .burger {
    width: 40px;
    height: 40px;
    border-radius: 12px;
  }

  .mobile-login-cta {
    height: 40px;
    border-radius: 12px;
    padding: 0 10px;
    font-size: 12px;
  }

  .nav {
    top: calc(58px + env(safe-area-inset-top, 0px) + 6px);
    right: 8px;
    left: auto;
    width: min(332px, calc(100vw - 12px));
    max-width: calc(100vw - 12px);
    padding: 10px;
    border-radius: 18px;
    max-height: calc(100dvh - 74px);
  }

  .nav-mobile-backdrop {
    top: calc(56px + env(safe-area-inset-top, 0px));
  }

  .site-nav-header.mobile-sheet-open .nav-mobile-backdrop {
    top: calc(70px + env(safe-area-inset-top, 0px));
  }

  .nav .nav-link,
  .nav .btn-primary,
  .nav .btn-notifications,
  .nav .nav-publish-cta {
    min-height: 42px;
  }

  .notifications-menu {
    top: calc(58px + env(safe-area-inset-top, 0px) + 8px);
    right: 8px;
    left: auto;
    width: min(332px, calc(100vw - 12px));
    max-width: calc(100vw - 12px);
    padding: 10px;
    border-radius: 18px;
    max-height: calc(100dvh - 74px);
  }

  .site-nav-header.mobile-sheet-open .nav {
    top: calc(72px + env(safe-area-inset-top, 0px) + 6px);
    max-height: calc(100dvh - 88px);
  }

  .site-nav-header.mobile-sheet-open .notifications-menu {
    top: calc(72px + env(safe-area-inset-top, 0px) + 8px);
    max-height: calc(100dvh - 88px);
  }

  .site-nav-header.mobile-sheet-open .nav.focus-topup .topup-modal-overlay {
    top: calc(72px + env(safe-area-inset-top, 0px) + 8px) !important;
  }

  .site-nav-header.mobile-sheet-open .nav.focus-topup .topup-modal-card {
    max-height: calc(100dvh - 88px) !important;
    border-radius: 16px !important;
  }
}

@media (prefers-reduced-motion: reduce) {
  .nav-publish-cta,
  .nav-publish-cta::before,
  .nav-publish-icon,
  .btn-notifications.has-unread .notifications-bell-icon,
  .nav,
  .nav-mobile-backdrop,
  .burger,
  .burger-icon {
    animation: none;
    transition: none;
  }
}
`;


