import React from "react";
import { Link, useNavigate, useLocation } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { FileText, LogOut, User, Plus, Home, Building2, Bookmark } from "lucide-react";
import ProfileMenu from "./ProfileMenu";
import SavedSearchesMenu from "./SavedSearchesMenu";

const Navbar: React.FC = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { logout, isAuthenticated } = useAuth();
  const [mobileMenuOpen, setMobileMenuOpen] = React.useState(false);

  const handleLogout = async () => {
    await logout();
    setMobileMenuOpen(false);
    navigate("/");
  };

  const isActive = (path: string) => location.pathname === path;

  const styles: Record<string, React.CSSProperties> = {
    navbar: {
      background: "linear-gradient(135deg, #667eea 0%, #764ba2 100%)",
      boxShadow: "0 4px 12px rgba(0,0,0,0.15)",
      width: "100%",
      position: "sticky",
      top: 0,
      zIndex: 100,
    },
    navInner: {
      maxWidth: 1400,
      margin: "0 auto",
      padding: "16px 24px",
      display: "flex",
      alignItems: "center",
      justifyContent: "space-between",
      gap: 20,
    },
    brandRow: {
      display: "flex",
      alignItems: "center",
      gap: 12,
      minWidth: 0,
    },
    logo: {
      width: 48,
      height: 48,
      borderRadius: 12,
      display: "flex",
      alignItems: "center",
      justifyContent: "center",
      fontWeight: 800,
      letterSpacing: 0.5,
      background: "#fff",
      color: "#667eea",
      fontSize: 18,
      flexShrink: 0,
      boxShadow: "0 2px 8px rgba(0,0,0,0.1)",
    },
    brandName: {
      fontSize: 24,
      fontWeight: 800,
      lineHeight: 1.1,
      color: "#fff",
      whiteSpace: "nowrap",
      letterSpacing: "-0.5px",
    },
    navLinks: {
      display: "flex",
      alignItems: "center",
      gap: 8,
      flexWrap: "wrap",
      justifyContent: "flex-end",
    },
    navLink: {
      color: "rgba(255,255,255,0.9)",
      textDecoration: "none",
      fontSize: 15,
      padding: "10px 16px",
      borderRadius: 8,
      fontWeight: 600,
      transition: "all 0.2s",
      whiteSpace: "nowrap",
      display: "flex",
      alignItems: "center",
      gap: 8,
      background: "rgba(255,255,255,0.1)",
      border: "1px solid rgba(255,255,255,0.2)",
    },
    navLinkActive: {
      background: "#fff",
      color: "#667eea",
      border: "1px solid #fff",
    },
    primaryBtn: {
      height: 42,
      padding: "0 20px",
      borderRadius: 8,
      border: "none",
      background: "#fff",
      color: "#667eea",
      fontWeight: 700,
      fontSize: 15,
      cursor: "pointer",
      textDecoration: "none",
      display: "inline-flex",
      alignItems: "center",
      gap: 8,
      whiteSpace: "nowrap",
      flexShrink: 0,
      transition: "all 0.2s",
      boxShadow: "0 2px 8px rgba(0,0,0,0.1)",
    },
    secondaryBtn: {
      height: 42,
      padding: "0 20px",
      borderRadius: 8,
      border: "2px solid #fff",
      background: "transparent",
      color: "#fff",
      fontWeight: 700,
      fontSize: 15,
      cursor: "pointer",
      textDecoration: "none",
      display: "inline-flex",
      alignItems: "center",
      gap: 8,
      whiteSpace: "nowrap",
      flexShrink: 0,
      transition: "all 0.2s",
    },
    logoutBtn: {
      height: 42,
      padding: "0 20px",
      borderRadius: 8,
      border: "2px solid rgba(255,255,255,0.5)",
      background: "transparent",
      color: "#fff",
      fontWeight: 600,
      fontSize: 15,
      cursor: "pointer",
      textDecoration: "none",
      display: "inline-flex",
      alignItems: "center",
      gap: 8,
      whiteSpace: "nowrap",
      flexShrink: 0,
      transition: "all 0.2s",
    },
    hamburger: {
      display: "none",
      background: "rgba(255,255,255,0.2)",
      border: "1px solid rgba(255,255,255,0.3)",
      borderRadius: 8,
      padding: "8px 12px",
      fontSize: 24,
      cursor: "pointer",
      color: "#fff",
      transition: "all 0.2s",
    },
  };

  return (
    <nav style={styles.navbar}>
      <style>{`
        .nav-link:hover {
          background: rgba(255,255,255,0.2) !important;
          transform: translateY(-2px);
        }
        .primary-btn:hover {
          transform: translateY(-2px);
          box-shadow: 0 4px 12px rgba(0,0,0,0.2);
        }
        .secondary-btn:hover {
          background: rgba(255,255,255,0.1);
          transform: translateY(-2px);
        }
        .logout-btn:hover {
          background: rgba(255,255,255,0.1);
          border-color: #fff;
        }
        .hamburger:hover {
          background: rgba(255,255,255,0.3);
        }

        @media (max-width: 992px) {
          .nav-links {
            display: ${mobileMenuOpen ? "flex" : "none"} !important;
            position: absolute;
            top: 100%;
            left: 0;
            right: 0;
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
            flex-direction: column;
            gap: 8px !important;
            border-top: 1px solid rgba(255,255,255,0.2);
            padding: 16px;
            z-index: 99;
            box-shadow: 0 8px 16px rgba(0,0,0,0.2);
          }
          .nav-links a, .nav-links button {
            width: 100%;
            justify-content: center;
          }
          .hamburger {
            display: block !important;
          }
          .nav-inner {
            position: relative;
          }
        }
        @media (max-width: 640px) {
          .brand-name {
            display: none;
          }
          .nav-inner {
            padding: 12px 16px !important;
          }
        }
      `}</style>
      <div style={styles.navInner} className="nav-inner">
        <Link to="/" style={{ textDecoration: "none", display: "flex", alignItems: "center", gap: 12 }}>
          <div style={styles.logo}>KB</div>
          <div style={styles.brandName} className="brand-name">Kar.Bg</div>
        </Link>

        <button
          style={styles.hamburger}
          className="hamburger"
          onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
          aria-label="Toggle menu"
        >
          ☰
        </button>

        <div style={styles.navLinks} className="nav-links">
          <Link
            to="/"
            style={{
              ...styles.navLink,
              ...(isActive("/") ? styles.navLinkActive : {}),
            }}
            className="nav-link"
            onClick={() => setMobileMenuOpen(false)}
          >
            <Home size={18} />
            Начало
          </Link>

          <Link
            to="/dealers"
            style={{
              ...styles.navLink,
              ...(isActive("/dealers") ? styles.navLinkActive : {}),
            }}
            className="nav-link"
            onClick={() => setMobileMenuOpen(false)}
          >
            <Building2 size={18} />
            Дилъри
          </Link>

          {/* Saved Searches Menu */}
          <SavedSearchesMenu />

          {isAuthenticated ? (
            <>

              {/* My Ads Button */}
              <Link
                to="/my-ads"
                style={styles.primaryBtn}
                className="primary-btn"
                onClick={() => setMobileMenuOpen(false)}
              >
                <Plus size={18} />
                Моите Обяви
              </Link>

              {/* Profile Menu */}
              <ProfileMenu />

              {/* Logout Button */}
              <button
                style={styles.logoutBtn}
                className="logout-btn"
                onClick={handleLogout}
              >
                <LogOut size={18} />
                Изход
              </button>
            </>
          ) : (
            <>
              <Link
                to="/publish"
                style={{
                  ...styles.navLink,
                  ...(isActive("/publish") ? styles.navLinkActive : {}),
                }}
                className="nav-link"
                onClick={() => setMobileMenuOpen(false)}
              >
                <Plus size={18} />
                Публикуване
              </Link>

              <Link
                to="/auth"
                style={styles.primaryBtn}
                className="primary-btn"
                onClick={() => setMobileMenuOpen(false)}
              >
                <User size={18} />
                Влизане
              </Link>
            </>
          )}
        </div>
      </div>
    </nav>
  );
};

export default Navbar;

