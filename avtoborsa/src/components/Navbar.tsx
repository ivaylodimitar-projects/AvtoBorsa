import React from "react";
import { Link, useNavigate, useLocation } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { Home, Building2, Plus, User, LogOut } from "lucide-react";
import ProfileMenu from "./ProfileMenu";
import SavedSearchesMenu from "./SavedSearchesMenu";

const Navbar: React.FC = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { logout, isAuthenticated } = useAuth();
  const [mobileOpen, setMobileOpen] = React.useState(false);
  const [showLogoutModal, setShowLogoutModal] = React.useState(false);
  const [isLoggingOut, setIsLoggingOut] = React.useState(false);

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
          ☰
        </button>

        {/* Nav */}
        <nav className={`nav ${mobileOpen ? "open" : ""}`} style={styles.nav}>
          <div className="nav-group nav-left">
            <Link
              to="/"
              className={`nav-link ${isActive("/") ? "active" : ""}`}
              onClick={() => setMobileOpen(false)}
            >
              <Home size={16} />
              Начало
            </Link>

            <Link
              to="/dealers"
              className={`nav-link ${isActive("/dealers") ? "active" : ""}`}
              onClick={() => setMobileOpen(false)}
            >
              <Building2 size={16} />
              Дилъри
            </Link>

            <SavedSearchesMenu />

            {isAuthenticated ? (
              <Link
                to="/publish"
                className={`nav-link ${isActive("/publish") ? "active" : ""}`}
                onClick={() => setMobileOpen(false)}
              >
                <Plus size={16} />
                Добави обява
              </Link>
            ) : (
              <Link
                to="/publish"
                className={`nav-link ${isActive("/publish") ? "active" : ""}`}
                onClick={() => setMobileOpen(false)}
              >
                <Plus size={16} />
                Публикуване
              </Link>
            )}
          </div>

          <div className="nav-group nav-right">
            {isAuthenticated ? (
              <>
                <ProfileMenu />
                <button className="btn-ghost" onClick={() => setShowLogoutModal(true)}>
                  <LogOut size={16} />
                  Изход
                </button>
              </>
            ) : (
              <Link
                to="/auth"
                className="btn-primary"
                onClick={() => setMobileOpen(false)}
              >
                <User size={16} />
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
              <LogOut size={18} />
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
  transition: transform 0.2s ease, box-shadow 0.2s ease, filter 0.2s ease;
  white-space: nowrap;
}

.btn-primary:hover {
  transform: translateY(-2px);
  box-shadow: 0 10px 22px rgba(15, 118, 110, 0.35);
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

  .nav a,
  .nav button {
    width: 100%;
    justify-content: center;
  }
}
`;
