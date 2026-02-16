import React from "react";
import { Link, useNavigate, useLocation } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import {
  FiBell,
  FiBriefcase,
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
  markNotificationRead,
  type AppNotification,
} from "../utils/notifications";

const Navbar: React.FC = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { logout, isAuthenticated, user } = useAuth();
  const [mobileOpen, setMobileOpen] = React.useState(false);
  const [showLogoutModal, setShowLogoutModal] = React.useState(false);
  const [isLoggingOut, setIsLoggingOut] = React.useState(false);
  const [showNotificationsMenu, setShowNotificationsMenu] = React.useState(false);
  const [showAllNotifications, setShowAllNotifications] = React.useState(false);
  const [notifications, setNotifications] = React.useState<AppNotification[]>([]);
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

  const unreadNotificationsCount = notifications.filter((item) => !item.isRead).length;
  const hasUnreadNotifications = unreadNotificationsCount > 0;
  const hasNotifications = notifications.length > 0;
  const hasMoreNotifications = notifications.length > NOTIFICATIONS_PREVIEW_LIMIT;
  const visibleNotifications = showAllNotifications
    ? notifications
    : notifications.slice(0, NOTIFICATIONS_PREVIEW_LIMIT);

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

  const handleNotificationsToggle = () => {
    const nextOpen = !showNotificationsMenu;
    setShowNotificationsMenu(nextOpen);
    if (nextOpen) {
      setShowAllNotifications(false);
    }
  };

  const handleMarkAsRead = (notificationId: string) => {
    if (!user?.id) return;
    markNotificationRead(user.id, notificationId);
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

            {isAuthenticated ? (
              <Link
                to="/publish"
                className={`nav-link ${isActive("/publish") ? "active" : ""}`}
                onClick={() => setMobileOpen(false)}
              >
                <FiPlus size={16} />
                Добави обява
              </Link>
            ) : (
              <Link
                to="/publish"
                className={`nav-link ${isActive("/publish") ? "active" : ""}`}
                onClick={() => setMobileOpen(false)}
              >
                <FiPlus size={16} />
                Публикуване
              </Link>
            )}
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
                      <div className="notifications-title">
                        Твоите известия
                        {hasNotifications ? ` (${notifications.length})` : ""}
                      </div>
                      {!hasNotifications ? (
                        <div className="notifications-empty">Тук ще виждаш известия за активността ти в сайта.</div>
                      ) : (
                        <>
                          <div className="notifications-list">
                            {visibleNotifications.map((notification) => (
                              <div
                                key={notification.id}
                                className={`notification-item ${notification.isRead ? "read" : "unread"}`}
                                role="menuitem"
                              >
                                <div className="notification-item-top">
                                  <span className="notification-item-type">
                                    {notification.type === "deposit" ? "Депозит" : "Известие"}
                                  </span>
                                  <span className="notification-item-time">
                                    {formatNotificationDate(notification.createdAt)}
                                  </span>
                                </div>
                                <div className="notification-item-main">
                                  <span className="notification-item-amount">
                                    +{formatNotificationAmount(notification.amount, notification.currency)}
                                  </span>
                                  <span className="notification-item-text">
                                    Добавени средства в баланса.
                                  </span>
                                </div>
                                <div className="notification-item-actions">
                                  {notification.isRead ? (
                                    <span className="notification-read-label">Прочетено</span>
                                  ) : (
                                    <button
                                      type="button"
                                      className="notification-read-btn"
                                      onClick={() => handleMarkAsRead(notification.id)}
                                    >
                                      Прочетено
                                    </button>
                                  )}
                                </div>
                              </div>
                            ))}
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
  width: 280px;
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
}

.notification-read-btn {
  border: 1px solid #bae6fd;
  background: #f0f9ff;
  color: #0c4a6e;
  font-size: 11px;
  font-weight: 700;
  border-radius: 999px;
  padding: 3px 10px;
  cursor: pointer;
}

.notification-read-btn:hover {
  background: #e0f2fe;
  border-color: #7dd3fc;
}

.notification-read-label {
  font-size: 11px;
  font-weight: 700;
  color: #64748b;
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

.notifications-footer {
  margin-top: 8px;
  text-align: center;
  font-size: 11px;
  color: #64748b;
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

  .nav a,
  .nav button {
    width: 100%;
    justify-content: center;
  }
}
`;


