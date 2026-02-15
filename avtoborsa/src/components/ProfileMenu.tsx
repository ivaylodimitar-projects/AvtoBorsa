import React, { useState, useRef, useEffect } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import {
  User,
  Settings,
  HelpCircle,
  Wallet,
  Plus,
  List,
  X,
  Camera
} from "lucide-react";
import TopUpModal from "./TopUpModal";
import { useToast } from "../context/ToastContext";

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || "http://localhost:8000";
const STRIPE_SESSION_STORAGE_KEY = "stripe_checkout_session_id";

const ProfileMenu: React.FC = () => {
  const { user, updateBalance } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();
  const { showToast } = useToast();
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const [isTopUpModalOpen, setIsTopUpModalOpen] = useState(false);
  const [hoveredIcon, setHoveredIcon] = useState(false);
  const [profileImageUrl, setProfileImageUrl] = useState<string | null>(null);
  const [uploadingPhoto, setUploadingPhoto] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!user) return;

    const params = new URLSearchParams(location.search);
    const paymentState = params.get("payment");
    if (!paymentState) return;

    const token = localStorage.getItem("authToken");
    if (!token) return;

    const clearPaymentQueryParams = () => {
      navigate(location.pathname, { replace: true });
    };

    const clearStoredSessionId = () => {
      localStorage.removeItem(STRIPE_SESSION_STORAGE_KEY);
    };

    if (paymentState === "cancelled") {
      clearStoredSessionId();
      showToast("Payment was cancelled.", { type: "info" });
      clearPaymentQueryParams();
      return;
    }

    if (paymentState !== "success") {
      clearStoredSessionId();
      clearPaymentQueryParams();
      return;
    }

    const sessionId = params.get("session_id") || localStorage.getItem(STRIPE_SESSION_STORAGE_KEY);

    const syncBalanceAfterPayment = async () => {
      try {
        if (sessionId) {
          const statusResponse = await fetch(
            `${API_BASE_URL}/api/payments/session-status/?session_id=${encodeURIComponent(sessionId)}`,
            {
              headers: { Authorization: `Bearer ${token}` },
            }
          );

          if (statusResponse.ok) {
            const statusData = await statusResponse.json();
            if (typeof statusData.balance === "number") {
              updateBalance(statusData.balance);
            }

            if (statusData.status === "succeeded") {
              showToast("Balance updated successfully.", { type: "success" });
            } else if (statusData.status === "pending") {
              showToast("Payment is processing. Balance will update shortly.", { type: "info" });
            } else if (statusData.status === "failed" || statusData.status === "cancelled") {
              showToast("Payment was not completed.", { type: "error" });
            } else {
              showToast("Payment status received.", { type: "info" });
            }

            return;
          }
        }

        const meResponse = await fetch(`${API_BASE_URL}/api/auth/me/`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        if (meResponse.ok) {
          const meData = await meResponse.json();
          if (typeof meData.balance === "number") {
            updateBalance(meData.balance);
          }
        }

        showToast("Payment completed.", { type: "success" });
      } catch {
        showToast("Payment completed. Balance refresh failed.", { type: "info" });
      } finally {
        clearStoredSessionId();
        clearPaymentQueryParams();
      }
    };

    syncBalanceAfterPayment();
  }, [location.pathname, location.search, navigate, showToast, updateBalance, user]);

  // Fetch profile image for current user
  useEffect(() => {
    if (!user) return;
    const fetchProfileImage = async () => {
      try {
        const token = localStorage.getItem("authToken");
        if (!token) return;
        const response = await fetch(`${API_BASE_URL}/api/auth/me/`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        if (response.ok) {
          const meData = await response.json();
          if (meData?.profile_image_url) {
            setProfileImageUrl(meData.profile_image_url);
          }
        }
      } catch {
        // silent
      }
    };
    fetchProfileImage();
  }, [user]);

  if (!user) return null;

  const balance = user.balance ?? 0;

  const closeDropdown = () => setIsDropdownOpen(false);

  const handlePhotoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploadingPhoto(true);
    try {
      const token = localStorage.getItem("authToken");
      const formData = new FormData();
      formData.append("image", file);

      const response = await fetch("http://localhost:8000/api/auth/profile/upload-photo/", {
        method: "POST",
        headers: { Authorization: `Bearer ${token}` },
        body: formData,
      });

      if (response.ok) {
        const data = await response.json();
        setProfileImageUrl(data.profile_image_url);

        // Also refetch from dealers API to ensure persistence
        setTimeout(async () => {
          try {
            const dealersRes = await fetch("http://localhost:8000/api/auth/dealers/", {
              headers: { Authorization: `Bearer ${token}` },
            });
            if (dealersRes.ok) {
              const dealers = (await dealersRes.json()) as DealerProfile[];
              const myDealer = dealers.find((d) => d.email === user?.email);
              if (myDealer?.profile_image_url) {
                setProfileImageUrl(myDealer.profile_image_url);
              }
            }
          } catch (err) {
            console.error("Failed to refetch profile image:", err);
          }
        }, 500);
      } else {
        const errorData = await response.json();
        console.error("Upload failed:", errorData);
      }
    } catch (err) {
      console.error("Photo upload error:", err);
    } finally {
      setUploadingPhoto(false);
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  };

  const styles: Record<string, React.CSSProperties> = {
    profileContainer: {
      position: "relative",
    },
    profileIcon: {
      color: "#333",
      textDecoration: "none",
      fontSize: 14,
      padding: "0 16px",
      height: 40,
      borderRadius: 999,
      fontWeight: 600,
      transition: "all 0.3s ease",
      whiteSpace: "nowrap",
      display: "flex",
      alignItems: "center",
      gap: 8,
      background: "#ecfdf5",
      border: "1px solid #99f6e4",
      cursor: "pointer",
    },
    profileIconHover: {
      background: "#0f766e",
      color: "#fff",
      border: "1px solid #0f766e",
    },
    dropdown: {
      position: "absolute",
      top: "100%",
      right: 0,
      background: "#fff",
      borderRadius: 12,
      border: "1px solid #e0e0e0",
      boxShadow: "0 4px 16px rgba(0,0,0,0.12)",
      minWidth: 320,
      marginTop: 12,
      zIndex: 1000,
      overflow: "hidden",
    },
    balanceSection: {
      padding: "20px",
      background: "linear-gradient(135deg, #0f766e 0%, #0d9488 100%)",
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
      padding: "20px 64px",
      background: "#fff",
      color: "#0f766e",
      border: "none",
      borderRadius: "14px",
      cursor: "pointer",
      fontFamily:"Inter, sans-serif",
      fontWeight: 600,
      fontSize: "14px",
      transition: "all 0.3s ease",
      display: "flex",
      alignItems: "center",
      gap: 8,
      width: "100%",
      justifyContent: "center",
      boxShadow: "0 4px 20px rgba(0,0,0,0.1)",
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
    // Photo section
    photoSection: {
      display: "flex",
      alignItems: "center",
      gap: 14,
      padding: "16px 20px",
      borderBottom: "1px solid #f0f0f0",
    },
    avatarWrap: {
      position: "relative",
      width: 48,
      height: 48,
      borderRadius: "50%",
      overflow: "hidden",
      flexShrink: 0,
      cursor: "pointer",
    },
    avatarImg: {
      width: "100%",
      height: "100%",
      objectFit: "cover",
    },
    avatarFallback: {
      width: "100%",
      height: "100%",
      background: "linear-gradient(135deg, #0f766e 0%, #0d9488 100%)",
      display: "flex",
      alignItems: "center",
      justifyContent: "center",
      color: "#fff",
      fontSize: 18,
      fontWeight: 700,
    },
    avatarOverlay: {
      position: "absolute",
      inset: 0,
      background: "rgba(0,0,0,0.4)",
      display: "flex",
      alignItems: "center",
      justifyContent: "center",
      opacity: 0,
      transition: "opacity 0.2s",
    },
    photoInfo: {
      flex: 1,
    },
    photoName: {
      fontSize: 14,
      fontWeight: 600,
      color: "#111827",
    },
    photoType: {
      fontSize: 12,
      color: "#6b7280",
      marginTop: 2,
    },
    photoSince: {
      fontSize: 11,
      color: "#94a3b8",
      marginTop: 4,
      fontWeight: 600,
    },
  };

  const initial =
    user.username?.charAt(0)?.toUpperCase() ||
    user.first_name?.charAt(0)?.toUpperCase() ||
    user.last_name?.charAt(0)?.toUpperCase() ||
    user.email?.charAt(0)?.toUpperCase() ||
    "?";
  const fullName = [user.first_name, user.last_name].filter(Boolean).join(" ").trim();
  const isBusiness = user.userType === "business";
  const createdAtLabel = user.created_at
    ? new Date(user.created_at).toLocaleDateString("bg-BG", {
        day: "numeric",
        month: "short",
        year: "numeric",
      })
    : null;

  return (
    <>
      <div style={styles.profileContainer}>
        {/* Hidden file input */}
        {isBusiness && (
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            style={{ display: "none" }}
            onChange={handlePhotoUpload}
          />
        )}

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
          {profileImageUrl ? (
            <img src={profileImageUrl} alt="" style={{ width: 20, height: 20, borderRadius: "50%", objectFit: "cover" }} />
          ) : (
            <User size={18} />
          )}
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
              {/* Profile photo + name section */}
              <div style={styles.photoSection}>
                <div
                  style={styles.avatarWrap}
                  onClick={() => isBusiness && fileInputRef.current?.click()}
                  onMouseEnter={(e) => {
                    const overlay = e.currentTarget.querySelector(".avatar-overlay") as HTMLElement;
                    if (overlay) overlay.style.opacity = "1";
                  }}
                  onMouseLeave={(e) => {
                    const overlay = e.currentTarget.querySelector(".avatar-overlay") as HTMLElement;
                    if (overlay) overlay.style.opacity = "0";
                  }}
                >
                  {profileImageUrl ? (
                    <img src={profileImageUrl} alt="" style={styles.avatarImg} />
                  ) : (
                    <div style={styles.avatarFallback}>{initial}</div>
                  )}
                  {isBusiness && (
                    <div className="avatar-overlay" style={styles.avatarOverlay}>
                      <Camera size={16} color="#fff" />
                    </div>
                  )}
                </div>
                <div style={styles.photoInfo}>
                  <div style={styles.photoName}>{user.username || fullName || user.email}</div>
                  <div style={styles.photoType}>
                    {isBusiness ? "Бизнес профил" : "Частен профил"}
                    {uploadingPhoto && " — качване..."}
                  </div>
                  {createdAtLabel && (
                    <div style={styles.photoSince}>Потребител от {createdAtLabel}</div>
                  )}
                </div>
                <button
                  style={styles.closeBtn}
                  onClick={closeDropdown}
                >
                  <X size={16} />
                </button>
              </div>

              {/* Balance Section */}
              <div style={styles.balanceSection}>
                <div style={styles.balanceHeader}>
                  <div style={styles.balanceInfo}>
                    <div style={styles.balanceLabel}>
                      <Wallet size={14} />
                      Баланс
                    </div>
                    <div style={styles.balanceValue}>
                      €{balance.toFixed(2)}
                    </div>
                    <div style={styles.balanceSubtext}>
                      EUR balance
                    </div>
                  </div>
                </div>

                <button
                  style={styles.topupButton}
                  onMouseEnter={(e) => {
                    (e.target as HTMLElement).style.transform = "translateY(-2px)";
                    (e.target as HTMLElement).style.boxShadow = "0 4px 12px rgba(15,118,110,0.25)";
                  }}
                  onMouseLeave={(e) => {
                    (e.target as HTMLElement).style.transform = "translateY(0)";
                    (e.target as HTMLElement).style.boxShadow = "0 2px 8px rgba(15,118,110,0.18)";
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
                    (e.currentTarget as HTMLElement).style.background = "#ecfdf5";
                    (e.currentTarget as HTMLElement).style.color = "#0f766e";
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

                <Link
                  to="/settings"
                  style={styles.menuItem}
                  onMouseEnter={(e) => {
                    (e.currentTarget as HTMLElement).style.background = "#ecfdf5";
                    (e.currentTarget as HTMLElement).style.color = "#0f766e";
                  }}
                  onMouseLeave={(e) => {
                    (e.currentTarget as HTMLElement).style.background = "none";
                    (e.currentTarget as HTMLElement).style.color = "#333";
                  }}
                  onClick={closeDropdown}
                >
                  <Settings size={18} />
                  <span>Настройки</span>
                </Link>

                <button
                  style={styles.menuItem}
                  onMouseEnter={(e) => {
                    (e.currentTarget as HTMLElement).style.background = "#ecfdf5";
                    (e.currentTarget as HTMLElement).style.color = "#0f766e";
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
