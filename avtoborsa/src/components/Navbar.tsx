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

  const isActive = (path: string) => location.pathname === path;

  const handleLogout = async () => {
    await logout();
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
                to="/my-ads"
                className="nav-link"
                onClick={() => setMobileOpen(false)}
              >
                <Plus size={16} />
                Моите обяви
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
                <button className="btn-ghost" onClick={handleLogout}>
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
    </header>
  );
};

export default Navbar;

/* ---------------- styles ---------------- */

const styles: Record<string, React.CSSProperties> = {
  header: {
    background: "linear-gradient(180deg, #ffffff 0%, #f7f9fc 100%)",
    borderBottom: "1px solid #e5e7eb",
    boxShadow: "0 8px 24px rgba(15, 23, 42, 0.06)",
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
    borderRadius: 10,
    background: "linear-gradient(135deg, #1d4ed8, #0ea5e9)",
    color: "#fff",
    fontWeight: 800,
    display: "grid",
    placeItems: "center",
    fontSize: 14,
    letterSpacing: 0.8,
    boxShadow: "0 8px 16px rgba(14, 165, 233, 0.35)",
  },
  brandText: {
    fontSize: 18,
    fontWeight: 800,
    color: "#0f172a",
    letterSpacing: 0.2,
  },
  nav: {
    display: "flex",
    alignItems: "center",
    gap: 16,
    marginLeft: "auto",
    flex: 1,
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
  color: #0f172a;
  border: 1px solid transparent;
  background: transparent;
  transition: background-color 0.2s ease, color 0.2s ease, border-color 0.2s ease,
    box-shadow 0.2s ease, transform 0.2s ease;
  white-space: nowrap;
}

.nav-link:hover {
  background: #eef2ff;
  border-color: #c7d2fe;
  transform: translateY(-1px);
}

.nav-link.active {
  background: #1d4ed8;
  color: #fff;
  border-color: #1d4ed8;
  box-shadow: 0 6px 16px rgba(29, 78, 216, 0.35);
}

.nav-link:focus-visible,
.btn-primary:focus-visible,
.btn-ghost:focus-visible {
  outline: 3px solid rgba(59, 130, 246, 0.45);
  outline-offset: 2px;
}

/* PRIMARY BUTTON */
.btn-primary {
  height: 40px;
  padding: 0 18px;
  border-radius: 999px;
  background: linear-gradient(135deg, #2563eb, #0ea5e9);
  color: #fff;
  font-weight: 700;
  border: none;
  cursor: pointer;
  display: inline-flex;
  align-items: center;
  gap: 8px;
  text-decoration: none;
  box-shadow: 0 8px 18px rgba(37, 99, 235, 0.35);
  transition: transform 0.2s ease, box-shadow 0.2s ease, filter 0.2s ease;
  white-space: nowrap;
}

.btn-primary:hover {
  transform: translateY(-2px);
  box-shadow: 0 10px 22px rgba(37, 99, 235, 0.45);
  filter: brightness(1.02);
}

/* GHOST BUTTON */
.btn-ghost {
  height: 40px;
  padding: 0 16px;
  border-radius: 999px;
  background: #fff;
  border: 1px solid #c7d2fe;
  color: #1d4ed8;
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
  background: #eef2ff;
  border-color: #93c5fd;
}

/* BURGER */
.burger {
  display: none;
  background: #0f172a;
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
    border-top: 1px solid #e2e8f0;
    padding: 14px 16px 18px;
    flex-direction: column;
    gap: 14px;
    box-shadow: 0 18px 32px rgba(15, 23, 42, 0.12);
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
