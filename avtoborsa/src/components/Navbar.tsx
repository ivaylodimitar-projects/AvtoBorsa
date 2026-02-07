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
        <Link to="/" style={styles.brand}>
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
            <>
              <Link
                to="/my-ads"
                className="nav-link"
                onClick={() => setMobileOpen(false)}
              >
                <Plus size={16} />
                Моите обяви
              </Link>

              <ProfileMenu />

              <button className="btn-ghost" onClick={handleLogout}>
                <LogOut size={16} />
                Изход
              </button>
            </>
          ) : (
            <>
              <Link
                to="/publish"
                className={`nav-link ${isActive("/publish") ? "active" : ""}`}
                onClick={() => setMobileOpen(false)}
              >
                <Plus size={16} />
                Публикуване
              </Link>

              <Link
                to="/auth"
                className="btn-primary"
                onClick={() => setMobileOpen(false)}
              >
                <User size={16} />
                Влизане
              </Link>
            </>
          )}
        </nav>
      </div>
    </header>
  );
};

export default Navbar;

/* ---------------- styles ---------------- */

const styles: Record<string, React.CSSProperties> = {
  header: {
    background: "#ffffff",
    borderBottom: "1px solid #e0e0e0",
    boxShadow: "0 1px 3px rgba(0, 0, 0, 0.08)",
    position: "sticky",
    top: 0,
    zIndex: 100,
    display: "flex",
    justifyContent: "center",
    padding: "10px 0",
  },
  inner: {
    maxWidth: 1200,
    margin: "0 auto",
    padding: "0 20px",
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 32, // Разстояние между бутоните
  },
  brand: {
    display: "flex",
    alignItems: "center",
    gap: 12,
    textDecoration: "none",
    justifyContent: "flex-start", // Преместихме логото вляво
    paddingLeft: 0, // Махнахме padding-а, за да е още по-вляво
  },
  logo: {
    width: 40,
    height: 40,
    borderRadius: 6,
    background: "#0066cc",
    color: "#fff",
    fontWeight: 800,
    display: "grid",
    placeItems: "center",
    fontSize: 14,
  },
  brandText: {
    fontSize: 18,
    fontWeight: 700,
    color: "#0066cc",
  },
  nav: {
    display: "flex",
    alignItems: "center",
    gap: 24, // Увеличаваме разстоянието между бутоните
    fontFamily: "Arial, sans-serif",
  },
};

const css = `
.nav-link {
  display: inline-flex;
  align-items: center;
  gap: 8px;
  padding: 10px 16px;
  border-radius: 8px;
  text-decoration: none;
  font-size: 14px;
  font-weight: 500;
  color: #1f2937;
  border: 1px solid transparent;
  transition: all 0.3s ease;
}

.nav-link:hover {
  background: #eaf2ff;
  border-color: #c7dcff;
}

.nav-link.active {
  background: #0066cc;
  color: #fff;
  border-color: #0066cc;
  box-shadow: 0 4px 10px rgba(0, 102, 204, 0.25);
}

/* PRIMARY BUTTON */
.btn-primary {
  height: 38px;
  padding: 0 18px;
  border-radius: 8px;
  background: linear-gradient(135deg, #1e88e5, #1565c0);
  color: #fff;
  font-weight: 600;
  border: none;
  cursor: pointer;
  display: inline-flex;
  align-items: center;
  gap: 8px;
  text-decoration: none;
  box-shadow: 0 6px 14px rgba(30, 136, 229, 0.35);
  transition: all 0.3s ease;
}

.btn-primary:hover {
  transform: translateY(-2px);
  box-shadow: 0 8px 18px rgba(30, 136, 229, 0.45);
}

/* GHOST BUTTON */
.btn-ghost {
  height: 38px;
  padding: 0 16px;
  border-radius: 8px;
  background: #fff;
  border: 1px solid #0066cc;
  color: #0066cc;
  font-size: 14px;
  font-weight: 500;
  cursor: pointer;
  display: inline-flex;
  align-items: center;
  gap: 8px;
  transition: all 0.3s ease;
}

.btn-ghost:hover {
  background: #eaf2ff;
}

/* BURGER */
.burger {
  display: none;
  background: #0066cc;
  color: #fff;
  border: none;
  border-radius: 6px;
  padding: 8px 12px;
  font-size: 18px;
  cursor: pointer;
}

/* MOBILE */
@media (max-width: 900px) {
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
    padding: 14px;
    flex-direction: column;
    gap: 14px;
    box-shadow: 0 10px 24px rgba(0, 0, 0, 0.12);
  }

  .nav.open {
    display: flex;
  }

  .nav a,
  .nav button {
    width: 100%;
    justify-content: center;
  }
}
`;

