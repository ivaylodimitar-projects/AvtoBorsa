import React, { useState } from "react";
import { Link } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import {
  User,
  FileText,
  Heart,
  Settings,
  HelpCircle,
  Wallet,
  Plus,
  List,
  X
} from "lucide-react";
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
      color: "#1f2937", // Използваме по-тъмен текст за по-стилен вид
      textDecoration: "none",
      fontSize: 15,
      padding: "10px 16px",
      borderRadius: 8,
      fontWeight: 600,
      transition: "all 0.3s ease", // По-плавен преход
      whiteSpace: "nowrap",
      display: "flex",
      alignItems: "center",
      gap: 8,
      background: "#f0f4ff", // Лек фон за плавност
      border: "1px solid #c7dcff", // Граница с леко синкав оттенък
      cursor: "pointer",
    },
    profileIconHover: {
      background: "#0066cc", // По-силен активен фон
      color: "#fff",
      border: "1px solid #0066cc",
    },
    dropdown: {
      position: "absolute",
      top: "100%",
      right: 0,
      background: "#fff",
      borderRadius: 12,
      boxShadow: "0 8px 24px rgba(0,0,0,0.15)",
      minWidth: 320,
      marginTop: 12,
      zIndex: 1000,
      overflow: "hidden",
    },
    balanceSection: {
      padding: "20px",
      background: "linear-gradient(135deg, #667eea 0%, #764ba2 100%)",
      color: "#fff",
    },
    balanceHeader: {
      display: "flex",
      justifyContent: "space-between",
      alignItems: "flex-start",
      marginBottom: 16,
    },
    balanceInfo: {
      flex: 1,
    },
    closeBtn: {
      background: "rgba(255,255,255,0.2)",
      border: "none",
      borderRadius: 6,
      padding: 6,
      cursor: "pointer",
      display: "flex",
      alignItems: "center",
      justifyContent: "center",
      transition: "all 0.3s ease",
      color: "#fff",
    },
    balanceLabel: {
      fontSize: 12,
      color: "rgba(255,255,255,0.8)",
      fontWeight: 600,
      textTransform: "uppercase",
      letterSpacing: "0.5px",
      marginBottom: 8,
      display: "flex",
      alignItems: "center",
      gap: 6,
    },
    balanceValue: {
      fontSize: 28,
      fontWeight: 800,
      color: "#fff",
      marginBottom: 4,
    },
    balanceSubtext: {
      fontSize: 13,
      color: "rgba(255,255,255,0.7)",
      fontWeight: 500,
    },
    topupButton: {
      padding: "10px 18px",
      background: "#fff",
      color: "#667eea",
      border: "none",
      borderRadius: 8,
      cursor: "pointer",
      fontWeight: 700,
      fontSize: 14,
      transition: "all 0.3s ease",
      display: "flex",
      alignItems: "center",
      gap: 8,
      width: "100%",
      justifyContent: "center",
      boxShadow: "0 2px 8px rgba(0,0,0,0.1)",
    },
    menuSection: {
      padding: "8px",
    },
    menuItem: {
      display: "flex",
      alignItems: "center",
      gap: 12,
      padding: "12px 14px",
      color: "#333",
      textDecoration: "none",
      fontSize: 14,
      fontWeight: 500,
      cursor: "pointer",
      transition: "all 0.3s ease",
      border: "none",
      background: "none",
      width: "100%",
      textAlign: "left",
      borderRadius: 8,
    },
    divider: {
      height: 1,
      background: "#f0f0f0",
      margin: "8px 0",
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
            ...(hoveredIcon || isDropdownOpen ? styles.profileIconHover : {}),
          }}
          className="nav-link"
          onMouseEnter={() => setHoveredIcon(true)}
          onMouseLeave={() => setHoveredIcon(false)}
          onClick={() => setIsDropdownOpen(!isDropdownOpen)}
          title="Профилен меню"
        >
          <User size={18} />
          Профил
        </button>

        {/* Dropdown Menu */}
        {isDropdownOpen && (
          <>
            {/* Backdrop */}
            <div
              style={{
                position: "fixed",
                top: 0,
                left: 0,
                right: 0,
                bottom: 0,
                zIndex: 999,
              }}
              onClick={closeDropdown}
            />

            <div style={styles.dropdown}>
              {/* Balance Section */}
              <div style={styles.balanceSection}>
                <div style={styles.balanceHeader}>
                  <div style={styles.balanceInfo}>
                    <div style={styles.balanceLabel}>
                      <Wallet size={14} />
                      Баланс
                    </div>
                    <div style={styles.balanceValue}>
                      {balance.toFixed(2)} лв
                    </div>
                    <div style={styles.balanceSubtext}>
                      ≈ €{balanceEUR.toFixed(2)} EUR
                    </div>
                  </div>
                  <button
                    style={styles.closeBtn}
                    onClick={closeDropdown}
                    onMouseEnter={(e) => {
                      (e.target as HTMLElement).style.background = "rgba(255,255,255,0.3)";
                    }}
                    onMouseLeave={(e) => {
                      (e.target as HTMLElement).style.background = "rgba(255,255,255,0.2)";
                    }}
                  >
                    <X size={16} />
                  </button>
                </div>

                <button
                  style={styles.topupButton}
                  onMouseEnter={(e) => {
                    (e.target as HTMLElement).style.transform = "translateY(-2px)";
                    (e.target as HTMLElement).style.boxShadow = "0 4px 12px rgba(0,0,0,0.15)";
                  }}
                  onMouseLeave={(e) => {
                    (e.target as HTMLElement).style.transform = "translateY(0)";
                    (e.target as HTMLElement).style.boxShadow = "0 2px 8px rgba(0,0,0,0.1)";
                  }}
                  onClick={() => {
                    setIsTopUpModalOpen(true);
                    setIsDropdownOpen(false);
                  }}
                >
                  <Plus size={16} />
                  Добави средства
                </button>
              </div>

              {/* Menu Items */}
              <div style={styles.menuSection}>
                <Link
                  to="/my-ads"
                  style={styles.menuItem}
                  onMouseEnter={(e) => {
                    (e.currentTarget as HTMLElement).style.background = "#f5f5f5";
                    (e.currentTarget as HTMLElement).style.color = "#667eea";
                  }}
                  onMouseLeave={(e) => {
                    (e.currentTarget as HTMLElement).style.background = "none";
                    (e.currentTarget as HTMLElement).style.color = "#333";
                  }}
                  onClick={closeDropdown}
                >
                  <List size={18} />
                  <span>Моите обяви</span>
                </Link>

                <div style={styles.divider} />

                <button
                  style={styles.menuItem}
                  onMouseEnter={(e) => {
                    (e.currentTarget as HTMLElement).style.background = "#f5f5f5";
                    (e.currentTarget as HTMLElement).style.color = "#667eea";
                  }}
                  onMouseLeave={(e) => {
                    (e.currentTarget as HTMLElement).style.background = "none";
                    (e.currentTarget as HTMLElement).style.color = "#333";
                  }}
                  onClick={() => {
                    // TODO: Navigate to settings
                    closeDropdown();
                  }}
                >
                  <Settings size={18} />
                  <span>Настройки</span>
                </button>

                <button
                  style={styles.menuItem}
                  onMouseEnter={(e) => {
                    (e.currentTarget as HTMLElement).style.background = "#f5f5f5";
                    (e.currentTarget as HTMLElement).style.color = "#667eea";
                  }}
                  onMouseLeave={(e) => {
                    (e.currentTarget as HTMLElement).style.background = "none";
                    (e.currentTarget as HTMLElement).style.color = "#333";
                  }}
                  onClick={() => {
                    // TODO: Navigate to help
                    closeDropdown();
                  }}
                >
                  <HelpCircle size={18} />
                  <span>Помощ</span>
                </button>
              </div>
            </div>
          </>
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
