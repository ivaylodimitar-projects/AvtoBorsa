import React, { useState } from "react";
import { Link } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import TopUpModal from "./TopUpModal";

const ProfileMenu: React.FC = () => {
  const { user } = useAuth();
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const [isTopUpModalOpen, setIsTopUpModalOpen] = useState(false);
  const [hoveredIcon, setHoveredIcon] = useState(false);

  if (!user) return null;

  const balance = user.balance ?? 0;

  const closeDropdown = () => setIsDropdownOpen(false);

  const styles: Record<string, React.CSSProperties> = {
    profileContainer: {
      position: "relative",
    },
    profileIcon: {
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
    },
    profileIconHover: {
      background: "#f0f0f0",
      color: "#0066cc",
    },
    dropdown: {
      position: "absolute",
      top: "100%",
      right: 0,
      background: "#fff",
      border: "1px solid #e0e0e0",
      borderRadius: 6,
      boxShadow: "0 4px 16px rgba(0,0,0,0.15)",
      minWidth: 280,
      marginTop: 8,
      zIndex: 1000,
      overflow: "hidden",
    },
    balanceSection: {
      padding: "16px",
      background: "#f9f9f9",
      borderBottom: "1px solid #e0e0e0",
      display: "flex",
      justifyContent: "space-between",
      alignItems: "center",
    },
    balanceInfo: {
      display: "flex",
      flexDirection: "column" as const,
      gap: 4,
    },
    balanceLabel: {
      fontSize: 12,
      color: "#666",
      fontWeight: 500,
    },
    balanceValue: {
      fontSize: 18,
      fontWeight: 700,
      color: "#0066cc",
    },
    topupButton: {
      padding: "6px 12px",
      background: "#0066cc",
      color: "#fff",
      border: "none",
      borderRadius: 4,
      cursor: "pointer",
      fontWeight: 600,
      fontSize: 12,
      transition: "background-color 0.2s",
    },
    menuSection: {
      padding: "8px 0",
      borderBottom: "1px solid #f0f0f0",
    },
    menuItem: {
      display: "flex",
      alignItems: "center",
      gap: 12,
      padding: "12px 16px",
      color: "#333",
      textDecoration: "none",
      fontSize: 14,
      cursor: "pointer",
      transition: "background-color 0.2s",
      border: "none",
      background: "none",
      width: "100%",
      textAlign: "left" as const,
    },
    menuItemHover: {
      background: "#f5f5f5",
    },
    menuIcon: {
      fontSize: 16,
      minWidth: 20,
    },
  };

  // Exchange rate BGN to EUR (approximately 1 BGN = 0.51 EUR)
  const BGN_TO_EUR = 0.51;
  const balanceEUR = balance * BGN_TO_EUR;

  return (
    <>
      <div style={styles.profileContainer}>
        {/* Profile Icon */}
        <button
          style={{
            ...styles.profileIcon,
            ...(hoveredIcon ? styles.profileIconHover : {}),
          }}
          onMouseEnter={() => setHoveredIcon(true)}
          onMouseLeave={() => setHoveredIcon(false)}
          onClick={() => setIsDropdownOpen(!isDropdownOpen)}
          title="Профилен меню"
        >
          👤
        </button>

        {/* Dropdown Menu */}
        {isDropdownOpen && (
          <div style={styles.dropdown}>
            {/* Balance Section */}
            <div style={styles.balanceSection}>
              <div style={styles.balanceInfo}>
                <div style={styles.balanceLabel}>Баланс</div>
                <div style={styles.balanceValue}>
                  💰 {balance.toFixed(2)} BGN
                </div>
                <div style={{ fontSize: 12, color: "#999" }}>
                  ≈ €{balanceEUR.toFixed(2)} EUR
                </div>
              </div>
              <button
                style={styles.topupButton}
                onMouseEnter={(e) => {
                  (e.target as HTMLElement).style.background = "#0052a3";
                }}
                onMouseLeave={(e) => {
                  (e.target as HTMLElement).style.background = "#0066cc";
                }}
                onClick={() => {
                  setIsTopUpModalOpen(true);
                  setIsDropdownOpen(false);
                }}
              >
                Пълнене
              </button>
            </div>

            {/* My Ads Section */}
            <div style={styles.menuSection}>
              <Link
                to="/my-ads"
                style={styles.menuItem}
                onMouseEnter={(e) => {
                  (e.currentTarget as HTMLElement).style.background = "#f5f5f5";
                }}
                onMouseLeave={(e) => {
                  (e.currentTarget as HTMLElement).style.background = "none";
                }}
                onClick={closeDropdown}
              >
                <span style={styles.menuIcon}>📋</span>
                <span>Моите обяви</span>
              </Link>
              <Link
                to="/drafts"
                style={styles.menuItem}
                onMouseEnter={(e) => {
                  (e.currentTarget as HTMLElement).style.background = "#f5f5f5";
                }}
                onMouseLeave={(e) => {
                  (e.currentTarget as HTMLElement).style.background = "none";
                }}
                onClick={closeDropdown}
              >
                <span style={styles.menuIcon}>📝</span>
                <span>Чернови обяви</span>
              </Link>
            </div>

            {/* Favorites Section */}
            <div style={styles.menuSection}>
              <Link
                to="/saved"
                style={styles.menuItem}
                onMouseEnter={(e) => {
                  (e.currentTarget as HTMLElement).style.background = "#f5f5f5";
                }}
                onMouseLeave={(e) => {
                  (e.currentTarget as HTMLElement).style.background = "none";
                }}
                onClick={closeDropdown}
              >
                <span style={styles.menuIcon}>❤️</span>
                <span>Любими обяви</span>
              </Link>
            </div>

            {/* Settings Section */}
            <div style={styles.menuSection}>
              <button
                style={styles.menuItem}
                onMouseEnter={(e) => {
                  (e.currentTarget as HTMLElement).style.background = "#f5f5f5";
                }}
                onMouseLeave={(e) => {
                  (e.currentTarget as HTMLElement).style.background = "none";
                }}
                onClick={() => {
                  // TODO: Navigate to settings
                  closeDropdown();
                }}
              >
                <span style={styles.menuIcon}>⚙️</span>
                <span>Настройки</span>
              </button>
              <button
                style={styles.menuItem}
                onMouseEnter={(e) => {
                  (e.currentTarget as HTMLElement).style.background = "#f5f5f5";
                }}
                onMouseLeave={(e) => {
                  (e.currentTarget as HTMLElement).style.background = "none";
                }}
                onClick={() => {
                  // TODO: Navigate to help
                  closeDropdown();
                }}
              >
                <span style={styles.menuIcon}>❓</span>
                <span>Помощ</span>
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Top Up Modal */}
      {isTopUpModalOpen && (
        <TopUpModal
          onClose={() => setIsTopUpModalOpen(false)}
          onSuccess={() => setIsTopUpModalOpen(false)}
        />
      )}
    </>
  );
};

export default ProfileMenu;

