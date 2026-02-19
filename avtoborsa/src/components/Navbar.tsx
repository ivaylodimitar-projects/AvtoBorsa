import React from "react";
import { Link, useNavigate, useLocation } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import {
  FiCheck,
  FiBell,
  FiBriefcase,
  FiChevronDown,
  FiChevronUp,
  FiExternalLink,
  FiHome,
  FiLogOut,
  FiMenu,
  FiPlus,
  FiUser,
} from "react-icons/fi";
import ProfileMenu from "./ProfileMenu";
import SavedSearchesMenu from "./SavedSearchesMenu";
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
  USER_FOLLOWED_DEALERS_UPDATED_EVENT,
  getUserFollowedDealers,
  getUserFollowedDealersStorageKey,
  syncFollowedDealersWithLatestListings,
  unfollowDealer,
  type DealerListingSnapshot,
  type FollowedDealer,
} from "../utils/dealerSubscriptions";

const DEALER_LISTINGS_POLL_INTERVAL_MS = 20_000;
const DEALER_NOTIFICATIONS_STACK_WINDOW_MS = 60 * 60 * 1000;

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

const toDealerListingSnapshots = (value: unknown): DealerListingSnapshot[] => {
  if (!Array.isArray(value)) return [];

  const snapshots: DealerListingSnapshot[] = [];

  value.forEach((item) => {
    if (!item || typeof item !== "object") return;

    const record = item as Record<string, unknown>;
    const idValue = record.id;
    const dealerNameValue = record.dealer_name;
    const listingCountValue = record.listing_count;

    if (
      typeof idValue !== "number" ||
      !Number.isFinite(idValue) ||
      idValue <= 0 ||
      typeof dealerNameValue !== "string" ||
      !dealerNameValue.trim() ||
      typeof listingCountValue !== "number" ||
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

const Navbar: React.FC = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { logout, isAuthenticated, user } = useAuth();
  const [mobileOpen, setMobileOpen] = React.useState(false);
  const [showLogoutModal, setShowLogoutModal] = React.useState(false);
  const [isLoggingOut, setIsLoggingOut] = React.useState(false);
  const [showNotificationsMenu, setShowNotificationsMenu] = React.useState(false);
  const [showAllNotifications, setShowAllNotifications] = React.useState(false);
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
  const NOTIFICATIONS_PREVIEW_LIMIT = 5;

  const isActive = (path: string) => location.pathname === path;

  React.useEffect(() => {
    if (!showLogoutModal) return;
    const handleEsc = (e: KeyboardEvent) => {
      if (e.key === "Escape" && !isLoggingOut) {
        setShowLogoutModal(false);
      }
    };

    window.addEventListener("keydown", handleEsc);
    return () => window.removeEventListener("keydown", handleEsc);
  }, [showLogoutModal, isLoggingOut]);

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
      setFollowedDealers(getUserFollowedDealers(user.id));
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
    if (!user?.id || followedDealers.length === 0) return;

    let isCancelled = false;
    const syncNewDealerListings = async () => {
      try {
        const response = await fetch("http://localhost:8000/api/auth/dealers/", {
          cache: "no-store",
        });
        if (!response.ok) return;
        const payload: unknown = await response.json();
        if (isCancelled) return;
        const snapshots = toDealerListingSnapshots(payload);
        syncFollowedDealersWithLatestListings(user.id, snapshots);
      } catch {
        // silent polling fail
      }
    };

    void syncNewDealerListings();

    const handleWindowFocus = () => {
      void syncNewDealerListings();
    };
    const handleVisibilityChange = () => {
      if (document.visibilityState === "visible") {
        void syncNewDealerListings();
      }
    };

    const intervalId = window.setInterval(() => {
      void syncNewDealerListings();
    }, DEALER_LISTINGS_POLL_INTERVAL_MS);
    window.addEventListener("focus", handleWindowFocus);
    document.addEventListener("visibilitychange", handleVisibilityChange);

    return () => {
      isCancelled = true;
      window.clearInterval(intervalId);
      window.removeEventListener("focus", handleWindowFocus);
      document.removeEventListener("visibilitychange", handleVisibilityChange);
    };
  }, [followedDealers, user?.id]);

  React.useEffect(() => {
    if (!showNotificationsMenu) return;

    const handleClickOutside = (event: MouseEvent) => {
      if (
        notificationsRef.current &&
        !notificationsRef.current.contains(event.target as Node)
      ) {
        setShowNotificationsMenu(false);
      }
    };

    const handleEsc = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        setShowNotificationsMenu(false);
      }
    };

    window.addEventListener("mousedown", handleClickOutside);
    window.addEventListener("keydown", handleEsc);

    return () => {
      window.removeEventListener("mousedown", handleClickOutside);
      window.removeEventListener("keydown", handleEsc);
    };
  }, [showNotificationsMenu]);

  React.useEffect(() => {
    setNotificationsNowMs(Date.now());
  }, [notifications]);

  const unreadNotificationsCount = notifications.filter((item) => !item.isRead).length;
  const hasUnreadNotifications = unreadNotificationsCount > 0;
  const hasNotifications = notifications.length > 0;
  const hasFollowedDealers = followedDealers.length > 0;
  const hasMoreNotifications = notifications.length > NOTIFICATIONS_PREVIEW_LIMIT;
  const notificationsForDisplay = showAllNotifications
    ? notifications
    : notifications.slice(0, NOTIFICATIONS_PREVIEW_LIMIT);
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
    setShowNotificationsMenu(nextOpen);
    if (nextOpen) {
      setShowAllNotifications(false);
      setNotificationsTab("notifications");
      setExpandedNotificationGroups({});
      setNotificationsNowMs(Date.now());
    }
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
    setShowNotificationsMenu(false);
    setMobileOpen(false);
    navigate(`/dealers/${notification.dealerId}`);
  };

  const handleOpenFollowedDealer = (dealerId: number) => {
    setShowNotificationsMenu(false);
    setMobileOpen(false);
    navigate(`/dealers/${dealerId}`);
  };

  const handleUnfollowDealer = (dealerId: number) => {
    if (!user?.id) return;
    unfollowDealer(user.id, dealerId);
  };

  const handleLogoutConfirm = async () => {
    setIsLoggingOut(true);
    await logout();
    setIsLoggingOut(false);
    setShowLogoutModal(false);
    setMobileOpen(false);
    navigate("/");
  };

  return (
    <header style={styles.header}>
      <style>{css}</style>

      <div style={styles.inner} className="nav-inner">
        {/* Brand */}
        <Link to="/" style={styles.brand} aria-label="Kar.bg">
          <div style={styles.logo}>KB</div>
          <div style={styles.brandText}>Kar.bg</div>
        </Link>

        {/* Mobile burger */}
        <button
          className="burger"
          onClick={() => setMobileOpen((v) => !v)}
          aria-label="Toggle menu"
        >
          <FiMenu size={18} />
        </button>

        {/* Nav */}
        <nav className={`nav ${mobileOpen ? "open" : ""}`} style={styles.nav}>
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

            <SavedSearchesMenu />

            <Link
              to="/publish"
              className={`nav-publish-cta ${isActive("/publish") ? "active" : ""}`}
              onClick={() => setMobileOpen(false)}
            >
              <span className="nav-publish-icon" aria-hidden="true">
                <FiPlus size={14} />
              </span>
              <span className="nav-publish-label">+ Добави обява</span>
            </Link>
          </div>

          <div className="nav-group nav-right">
            {isAuthenticated ? (
              <>
                <div className="notifications-wrap" ref={notificationsRef}>
                  <button
                    className={`btn-ghost btn-notifications ${showNotificationsMenu ? "open" : ""}`}
                    onClick={handleNotificationsToggle}
                    aria-label="Известия"
                    aria-haspopup="menu"
                    aria-expanded={showNotificationsMenu}
                    title="Известия"
                  >
                    <FiBell size={21} className="notifications-bell-icon" />
                    {hasUnreadNotifications && (
                      <span className="notification-dot" aria-hidden="true" />
                    )}
                  </button>

                  {showNotificationsMenu && (
                    <div className="notifications-menu" role="menu" aria-label="Списък с известия">
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

                                  return (
                                    <div
                                      key={item.groupKey}
                                      className={`notification-item ${unreadCount > 0 ? "unread" : "read"}`}
                                      role="menuitem"
                                    >
                                      <div className="notification-item-top">
                                        <span className="notification-item-type">Дилър (1 ч.)</span>
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
                                return (
                                  <div
                                    key={notification.id}
                                    className={`notification-item ${notification.isRead ? "read" : "unread"}`}
                                    role="menuitem"
                                  >
                                    <div className="notification-item-top">
                                      <span className="notification-item-type">
                                        {notification.type === "deposit" ? "Депозит" : "Дилър"}
                                      </span>
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
                            {hasMoreNotifications && !showAllNotifications && (
                              <button
                                type="button"
                                className="notifications-footer-link"
                                onClick={() => setShowAllNotifications(true)}
                              >
                                Виж всички известия
                              </button>
                            )}
                            {hasMoreNotifications && showAllNotifications && (
                              <button
                                type="button"
                                className="notifications-footer-link"
                                onClick={() => setShowAllNotifications(false)}
                              >
                                Покажи само 5
                              </button>
                            )}
                          </>
                        )
                      ) : !hasFollowedDealers ? (
                        <div className="notifications-empty">
                          Нямаш абонирани дилъри. Отвори страницата с дилъри и натисни камбанката.
                        </div>
                      ) : (
                        <div className="subscriptions-list">
                          {followedDealers.map((dealer) => (
                            <div key={dealer.dealerId} className="subscription-item">
                              <div className="subscription-main">
                                <div className="subscription-name">{dealer.dealerName}</div>
                                <div className="subscription-meta">
                                  {dealer.dealerCity ? `${dealer.dealerCity} · ` : ""}
                                  {formatTotalListings(dealer.lastKnownListingCount)}
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
                          ))}
                        </div>
                      )}
                    </div>
                  )}
                </div>
                <ProfileMenu />
                <button className="btn-ghost btn-logout" onClick={() => setShowLogoutModal(true)}>
                  <FiLogOut size={16} />
                  Изход
                </button>
              </>
            ) : (
              <Link
                to="/auth"
                className="btn-primary"
                onClick={() => setMobileOpen(false)}
              >
                <FiUser size={16} />
                Влизане
              </Link>
            )}
          </div>
        </nav>
      </div>

      {showLogoutModal && (
        <div style={styles.logoutOverlay} onClick={() => !isLoggingOut && setShowLogoutModal(false)}>
          <div style={styles.logoutModal} onClick={(e) => e.stopPropagation()}>
            <div style={styles.logoutIconWrap}>
              <FiLogOut size={18} />
            </div>
            <h3 style={styles.logoutTitle}>Потвърди изход</h3>
            <p style={styles.logoutText}>Сигурен ли си, че искаш да излезеш от профила си?</p>
            <div style={styles.logoutActions}>
              <button
                style={styles.logoutCancelButton}
                onClick={() => setShowLogoutModal(false)}
                disabled={isLoggingOut}
              >
                Отказ
              </button>
              <button
                style={{
                  ...styles.logoutConfirmButton,
                  ...(isLoggingOut ? styles.logoutConfirmButtonDisabled : {}),
                }}
                onClick={handleLogoutConfirm}
                disabled={isLoggingOut}
              >
                {isLoggingOut ? "Излизане..." : "Изход"}
              </button>
            </div>
          </div>
        </div>
      )}
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
    position: "sticky",
    top: 0,
    zIndex: 100,
    display: "flex",
    justifyContent: "center",
    padding: "10px 0",
  },
  inner: {
    maxWidth: 1200,
    width: "100%",
    margin: "0 auto",
    padding: "0 20px",
    display: "flex",
    alignItems: "center",
    gap: 24,
    minHeight: 64,
  },
  brand: {
    display: "flex",
    alignItems: "center",
    gap: 12,
    textDecoration: "none",
    justifyContent: "flex-start",
    paddingLeft: 0,
    flexShrink: 0,
  },
  logo: {
    width: 40,
    height: 40,
    borderRadius: 6,
    background: "#0f766e",
    color: "#fff",
    fontWeight: 800,
    display: "grid",
    placeItems: "center",
    fontSize: 14,
    letterSpacing: 0.8,
    boxShadow: "0 6px 12px rgba(15, 118, 110, 0.25)",
  },
  brandText: {
    fontSize: 19,
    fontWeight: 700,
    color: "#0f766e",
    letterSpacing: 0.2,
    fontFamily: "\"Space Grotesk\", \"Manrope\", \"Segoe UI\", sans-serif",
  },
  nav: {
    display: "flex",
    alignItems: "center",
    gap: 16,
    marginLeft: "auto",
    flex: 1,
  },
  logoutOverlay: {
    position: "fixed",
    inset: 0,
    background: "rgba(2, 6, 23, 0.55)",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    zIndex: 2000,
    padding: 16,
  },
  logoutModal: {
    width: "100%",
    maxWidth: 420,
    borderRadius: 14,
    background: "#fff",
    border: "1px solid #e2e8f0",
    boxShadow: "0 24px 60px rgba(15, 23, 42, 0.35)",
    padding: 22,
  },
  logoutIconWrap: {
    width: 36,
    height: 36,
    borderRadius: 10,
    background: "#ecfdf5",
    color: "#0f766e",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 14,
  },
  logoutTitle: {
    margin: "0 0 8px 0",
    fontSize: 19,
    lineHeight: 1.25,
    color: "#333",
    fontWeight: 800,
  },
  logoutText: {
    margin: "0 0 18px 0",
    fontSize: 14,
    lineHeight: 1.45,
    color: "#666",
  },
  logoutActions: {
    display: "flex",
    gap: 10,
    justifyContent: "flex-end",
  },
  logoutCancelButton: {
    height: 40,
    padding: "0 16px",
    borderRadius: 10,
    border: "1px solid #ccc",
    background: "#fff",
    color: "#333",
    fontSize: 14,
    fontWeight: 700,
    cursor: "pointer",
  },
  logoutConfirmButton: {
    height: 40,
    padding: "0 16px",
    borderRadius: 10,
    border: "1px solid #0f766e",
    background: "#0f766e",
    color: "#fff",
    fontSize: 14,
    fontWeight: 700,
    cursor: "pointer",
    minWidth: 104,
  },
  logoutConfirmButtonDisabled: {
    opacity: 0.7,
    cursor: "not-allowed",
  },
};

const css = `
.nav {
  font-family: "Manrope", "Segoe UI", -apple-system, system-ui, sans-serif;
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

.nav-publish-cta {
  position: relative;
  isolation: isolate;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
  height: 42px;
  padding: 0 18px 0 12px;
  border-radius: 999px;
  border: 1px solid rgba(255, 255, 255, 0.24);
  text-decoration: none;
  white-space: nowrap;
  color: #ffffff;
  background: linear-gradient(135deg, #0f766e 0%, #115e59 100%);
  box-shadow: 0 10px 24px rgba(15, 118, 110, 0.34);
  transition: transform 0.2s ease, box-shadow 0.25s ease, filter 0.25s ease;
}

.nav-publish-cta::before {
  content: "";
  position: absolute;
  inset: -3px;
  border-radius: inherit;
  padding: 2px;
  pointer-events: none;
  background: conic-gradient(
    from 0deg,
    rgba(45, 212, 191, 0),
    rgba(153, 246, 228, 0.96),
    rgba(45, 212, 191, 0)
  );
  -webkit-mask: linear-gradient(#000 0 0) content-box, linear-gradient(#000 0 0);
  -webkit-mask-composite: xor;
  mask: linear-gradient(#000 0 0) content-box, linear-gradient(#000 0 0);
  mask-composite: exclude;
  // animation: navPublishOrbit 2s linear infinite;
}

.nav-publish-cta::after {
  content: "";
  position: absolute;
  inset: 1px;
  border-radius: inherit;
  background: linear-gradient(120deg, rgba(255, 255, 255, 0.32), rgba(255, 255, 255, 0) 45%);
  opacity: 0.55;
  pointer-events: none;
  z-index: 0;
}

.nav-publish-cta:hover,
.nav-publish-cta:focus-visible,
.nav-publish-cta.active {
  transform: translateY(-1px) scale(1.03);
  box-shadow: 0 14px 32px rgba(15, 118, 110, 0.4);
  filter: saturate(1.08);
}

.nav-publish-cta:active {
  transform: scale(1);
}

.nav-publish-icon,
.nav-publish-label {
  position: relative;
  z-index: 1;
}

.nav-publish-icon {
  width: 22px;
  height: 22px;
  border-radius: 999px;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  background: rgba(255, 255, 255, 0.2);
  box-shadow: inset 0 0 0 1px rgba(255, 255, 255, 0.16);
}

.nav-publish-label {
  font-size: 14px;
  font-weight: 800;
  line-height: 1;
  letter-spacing: 0.01em;
  transform: translateY(1px);
}

@keyframes navPublishOrbit {
  to {
    transform: rotate(360deg);
  }
}

.notifications-wrap {
  position: relative;
}

.btn-notifications {
  width: 50px;
  min-width: 50px;
  padding: 0;
  justify-content: center;
  position: relative;
  color: #0f766e;
  border-color: #99f6e4;
  background: #ecfdf5;
}

.notifications-bell-icon {
  display: block;
}

.btn-notifications.open {
  background: #ecfdf5;
  border-color: #99f6e4;
  color: #0f766e;
}

.notification-dot {
  position: absolute;
  top: 8px;
  right: 8px;
  width: 9px;
  height: 9px;
  border-radius: 50%;
  background: #ef4444;
  border: 2px solid #fff;
}

.notifications-menu {
  position: absolute;
  top: calc(100% + 10px);
  right: 0;
  width: 340px;
  border-radius: 12px;
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

.notifications-tabs {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 8px;
  margin-bottom: 10px;
}

.notifications-tab {
  height: 34px;
  border-radius: 9px;
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
  border-radius: 10px;
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
  border-radius: 10px;
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

.notification-item-type {
  font-size: 11px;
  font-weight: 800;
  text-transform: uppercase;
  letter-spacing: 0.2px;
  color: #0f766e;
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

.notifications-footer-link {
  margin-top: 8px;
  width: 100%;
  border: 1px solid #99f6e4;
  background: #ecfdf5;
  color: #0f766e;
  border-radius: 10px;
  padding: 8px 10px;
  font-size: 12px;
  font-weight: 700;
  cursor: pointer;
}

.notifications-footer-link:hover {
  background: #d1fae5;
}

.notifications-mark-all-btn {
  width: 100%;
  border: 1px solid #bfdbfe;
  background: #eff6ff;
  color: #1e3a8a;
  border-radius: 10px;
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
  border-radius: 10px;
  padding: 10px;
  background: #f8fafc;
  display: flex;
  flex-direction: column;
  gap: 9px;
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
  gap: 8px;
  height: 40px;
  padding: 0 16px;
  border-radius: 999px;
  text-decoration: none;
  font-size: 14px;
  font-weight: 600;
  color: #333;
  border: 1px solid transparent;
  background: transparent;
  transition: background-color 0.2s ease, color 0.2s ease, border-color 0.2s ease,
    box-shadow 0.2s ease, transform 0.2s ease;
  white-space: nowrap;
}

.nav-link:hover {
  background: #ecfdf5;
  border-color: #99f6e4;
  color: #0f766e;
  text-decoration: none;
  transform: translateY(-1px);
}

.nav-link.active {
  background: #0f766e;
  color: #fff;
  border-color: #0f766e;
  box-shadow: 0 6px 16px rgba(15, 118, 110, 0.28);
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
  height: 40px;
  padding: 0 18px;
  border-radius: 999px;
  background: #0f766e;
  color: #fff;
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
  height: 40px;
  padding: 0 16px;
  border-radius: 999px;
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

.btn-logout:hover {
  background: #fef2f2;
  border-color: #fecaca;
  color: #dc2626;
}

/* BURGER */
.burger {
  display: none;
  background: #0f766e;
  color: #fff;
  border: none;
  border-radius: 8px;
  padding: 8px 12px;
  font-size: 18px;
  cursor: pointer;
  box-shadow: 0 6px 14px rgba(15, 23, 42, 0.2);
}

/* MOBILE */
@media (max-width: 960px) {
  .burger {
    display: block;
  }

  .nav {
    display: none;
    position: absolute;
    top: 100%;
    left: 0;
    right: 0;
    background: #ffffff;
    border-top: 1px solid #e0e0e0;
    padding: 14px 16px 18px;
    flex-direction: column;
    gap: 14px;
    box-shadow: 0 12px 24px rgba(0,0,0,0.1);
  }

  .nav.open {
    display: flex;
  }

  .nav-group {
    width: 100%;
    flex-direction: column;
    gap: 10px;
  }

  .nav-right {
    margin-left: 0;
  }

  .notifications-wrap {
    width: 100%;
  }

  .btn-notifications {
    width: 100%;
    min-width: 0;
  }

  .notifications-menu {
    position: static;
    width: 100%;
    margin-top: 8px;
  }

  .notifications-tabs {
    grid-template-columns: 1fr;
  }

  .notification-item-main {
    flex-direction: column;
    align-items: flex-start;
  }

  .notification-item-text {
    text-align: left;
  }

  .notification-item-actions {
    justify-content: flex-start;
  }

  .notification-group-row {
    flex-direction: column;
    align-items: flex-start;
  }

  .subscription-actions {
    justify-content: flex-start;
    flex-wrap: wrap;
  }

  .nav a,
  .nav button {
    width: 100%;
    justify-content: center;
  }
}

@media (prefers-reduced-motion: reduce) {
  .nav-publish-cta,
  .nav-publish-cta::before {
    animation: none;
    transition: none;
  }
}
`;
