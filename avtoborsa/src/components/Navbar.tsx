import React from "react";
import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";

const Navbar: React.FC = () => {
  const navigate = useNavigate();
  const { user, logout, isAuthenticated } = useAuth();
  const [mobileMenuOpen, setMobileMenuOpen] = React.useState(false);
  const [savedCount, setSavedCount] = React.useState(0);
  const [draftCount, setDraftCount] = React.useState(0);
  const [hoveredIcon, setHoveredIcon] = React.useState<string | null>(null);

  const handleLogout = async () => {
    await logout();
    setMobileMenuOpen(false);
    navigate("/");
  };

  const styles: Record<string, React.CSSProperties> = {
    navbar: {
      background: "#fff",
      borderBottom: "1px solid #e0e0e0",
      boxShadow: "0 1px 3px rgba(0,0,0,0.08)",
      width: "100%",
      position: "sticky",
      top: 0,
      zIndex: 100,
    },
    navInner: {
      maxWidth: 1200,
      margin: "0 auto",
      padding: "12px 20px",
      display: "flex",
      alignItems: "center",
      justifyContent: "space-between",
      gap: 16,
    },
    brandRow: {
      display: "flex",
      alignItems: "center",
      gap: 12,
      minWidth: 0,
    },
    logo: {
      width: 40,
      height: 40,
      borderRadius: 6,
      display: "grid",
      placeItems: "center",
      fontWeight: 800,
      letterSpacing: 0.5,
      background: "#0066cc",
      color: "#fff",
      fontSize: 14,
      flexShrink: 0,
    },
    brandName: {
      fontSize: 18,
      fontWeight: 700,
      lineHeight: 1.1,
      color: "#0066cc",
      whiteSpace: "nowrap",
    },
    navLinks: {
      display: "flex",
      alignItems: "center",
      gap: 16,
      flexWrap: "wrap",
      justifyContent: "flex-end",
    },
    navLink: {
      color: "#333",
      textDecoration: "none",
      fontSize: 14,
      padding: "6px 12px",
      borderRadius: 4,
      fontWeight: 500,
      transition: "background-color 0.2s",
      whiteSpace: "nowrap",
    },
    navLinkActive: {
      background: "#f0f0f0",
      color: "#0066cc",
    },
    primaryBtn: {
      height: 36,
      padding: "0 20px",
      borderRadius: 4,
      border: "none",
      background: "#0066cc",
      color: "#fff",
      fontWeight: 600,
      fontSize: 14,
      cursor: "pointer",
      textDecoration: "none",
      display: "inline-flex",
      alignItems: "center",
      whiteSpace: "nowrap",
      flexShrink: 0,
    },
    iconBtn: {
      background: "none",
      border: "none",
      cursor: "pointer",
      fontSize: 20,
      color: "#333",
      padding: "6px 8px",
      display: "flex",
      alignItems: "center",
      justifyContent: "center",
      borderRadius: 4,
      transition: "background-color 0.2s, color 0.2s",
      position: "relative",
    },
    iconBtnHover: {
      background: "#f0f0f0",
      color: "#0066cc",
    },
    badge: {
      position: "absolute",
      top: -4,
      right: -4,
      background: "#d32f2f",
      color: "#fff",
      borderRadius: "50%",
      width: 20,
      height: 20,
      display: "flex",
      alignItems: "center",
      justifyContent: "center",
      fontSize: 11,
      fontWeight: 700,
    },
    logoutBtn: {
      height: 36,
      padding: "0 20px",
      borderRadius: 4,
      border: "1px solid #d32f2f",
      background: "#fff",
      color: "#d32f2f",
      fontWeight: 600,
      fontSize: 14,
      cursor: "pointer",
      textDecoration: "none",
      display: "inline-flex",
      alignItems: "center",
      whiteSpace: "nowrap",
      flexShrink: 0,
      transition: "background-color 0.2s, color 0.2s",
    },
    hamburger: {
      display: "none",
      background: "none",
      border: "none",
      fontSize: 24,
      cursor: "pointer",
      color: "#333",
      padding: 0,
    },
  };

  return (
    <nav style={styles.navbar}>
      <style>{`
        @media (max-width: 768px) {
          .nav-links {
            display: ${mobileMenuOpen ? "flex" : "none"} !important;
            position: absolute;
            top: 100%;
            left: 0;
            right: 0;
            background: #fff;
            flex-direction: column;
            gap: 0 !important;
            border-top: 1px solid #e0e0e0;
            padding: 12px 0;
            z-index: 99;
          }
          .nav-links a, .nav-links button {
            padding: 12px 20px !important;
            border-radius: 0 !important;
            width: 100%;
            text-align: left;
            border-bottom: 1px solid #f0f0f0;
          }
          .nav-links button {
            background: #0066cc !important;
            color: #fff !important;
            border: none !important;
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
            padding: 10px 16px !important;
          }
        }
      `}</style>
      <div style={styles.navInner} className="nav-inner">
        <Link to="/" style={{ textDecoration: "none", display: "flex", alignItems: "center", gap: 12 }}>
          <div style={styles.logo}>AB</div>
          <div style={styles.brandName} className="brand-name">AvtoBorsa.bg</div>
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
          <Link to="/" style={{ ...styles.navLink }} onClick={() => setMobileMenuOpen(false)}>
            Начало
          </Link>
          <Link to="/publish" style={{ ...styles.navLink }} onClick={() => setMobileMenuOpen(false)}>
            Публикуване
          </Link>
          <Link to="/dealers" style={{ ...styles.navLink }} onClick={() => setMobileMenuOpen(false)}>
            Дилъри
          </Link>

          {/* Saved Listings Icon - Only show when logged in */}
          {isAuthenticated && (
            <Link
              to="/saved"
              style={{
                ...styles.iconBtn,
                ...(hoveredIcon === "saved" ? styles.iconBtnHover : {}),
              }}
              onMouseEnter={() => setHoveredIcon("saved")}
              onMouseLeave={() => setHoveredIcon(null)}
              onClick={() => setMobileMenuOpen(false)}
              title="Запазени обяви"
            >
              ❤️
              {savedCount > 0 && <div style={styles.badge}>{savedCount}</div>}
            </Link>
          )}

          {/* Draft Ads Icon - Only show when logged in */}
          {isAuthenticated && (
            <Link
              to="/drafts"
              style={{
                ...styles.iconBtn,
                ...(hoveredIcon === "drafts" ? styles.iconBtnHover : {}),
              }}
              onMouseEnter={() => setHoveredIcon("drafts")}
              onMouseLeave={() => setHoveredIcon(null)}
              onClick={() => setMobileMenuOpen(false)}
              title="Чернови обяви"
            >
              📝
              {draftCount > 0 && <div style={styles.badge}>{draftCount}</div>}
            </Link>
          )}

          {isAuthenticated ? (
            <>
              {/* My Ads Button - Only show when logged in */}
              <Link
                to="/my-ads"
                style={styles.primaryBtn}
                onClick={() => setMobileMenuOpen(false)}
                title="Моите обяви"
              >
                Моите Обяви
              </Link>

              {/* Logout Button */}
              <button
                style={styles.logoutBtn}
                onClick={handleLogout}
                title="Изход"
              >
                Изход
              </button>
            </>
          ) : (
            <>
              {/* Login Button - Only show when not logged in */}
              <Link to="/auth" style={styles.primaryBtn} onClick={() => setMobileMenuOpen(false)}>
                Влизане
              </Link>
              {/* Profile Button - Only show when not logged in */}
              <Link to="/profile" style={styles.primaryBtn} onClick={() => setMobileMenuOpen(false)}>
                Профил
              </Link>
            </>
          )}
        </div>
      </div>
    </nav>
  );
};

export default Navbar;

