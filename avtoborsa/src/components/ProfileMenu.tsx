import React, { useState, useRef, useEffect } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import {
  User,
  Settings,
  Wallet,
  Plus,
  List,
  X,
  Camera,
  LogOut,
} from "lucide-react";
import TopUpModal from "./TopUpModal";
import { useToast } from "../context/ToastContext";
import { addDepositNotification } from "../utils/notifications";

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || "http://localhost:8000";
const STRIPE_SESSION_STORAGE_KEY = "stripe_checkout_session_id";
const PAYMENT_SYNC_MIN_MS = 650;

type DealerProfile = {
  email: string;
  profile_image_url?: string | null;
};

const ProfileMenu: React.FC = () => {
  const { user, updateBalance, logout } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();
  const { showToast } = useToast();
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const [isTopUpModalOpen, setIsTopUpModalOpen] = useState(false);
  const [isLoggingOut, setIsLoggingOut] = useState(false);
  const [hoveredIcon, setHoveredIcon] = useState(false);
  const [profileImageUrl, setProfileImageUrl] = useState<string | null>(null);
  const [uploadingPhoto, setUploadingPhoto] = useState(false);
  const [isPaymentSyncing, setIsPaymentSyncing] = useState(false);
  const processedPaymentKeyRef = useRef<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!user) return;

    const params = new URLSearchParams(location.search);
    const paymentState = params.get("payment");
    if (!paymentState) {
      processedPaymentKeyRef.current = null;
      return;
    }

    const token = localStorage.getItem("authToken");
    if (!token) return;

    const sessionId = params.get("session_id") || localStorage.getItem(STRIPE_SESSION_STORAGE_KEY) || "";
    const paymentKey = `${paymentState}:${sessionId || "no-session"}`;
    if (processedPaymentKeyRef.current === paymentKey) return;
    processedPaymentKeyRef.current = paymentKey;

    const clearPaymentQueryParams = () => {
      navigate({ pathname: location.pathname, hash: location.hash }, { replace: true });
    };

    const clearStoredSessionId = () => {
      localStorage.removeItem(STRIPE_SESSION_STORAGE_KEY);
    };

    const applyMinimumSyncDuration = async (startedAt: number) => {
      const elapsed = Date.now() - startedAt;
      if (elapsed >= PAYMENT_SYNC_MIN_MS) return;
      await new Promise((resolve) => setTimeout(resolve, PAYMENT_SYNC_MIN_MS - elapsed));
    };

    const syncBalanceAfterPayment = async () => {
      const startedAt = Date.now();
      setIsPaymentSyncing(true);

      try {
        if (paymentState === "cancelled") {
          showToast("Плащането беше отменено.", { type: "info" });
          return;
        }

        if (paymentState !== "success") {
          return;
        }

        let paymentStatus: string | null = null;
        let paymentAmount: number | null = null;
        let nextBalance: number | null = null;

        if (sessionId) {
          const statusResponse = await fetch(
            `${API_BASE_URL}/api/payments/session-status/?session_id=${encodeURIComponent(sessionId)}`,
            {
              headers: { Authorization: `Bearer ${token}` },
            }
          );
          if (statusResponse.ok) {
            const statusData = await statusResponse.json();
            paymentStatus = typeof statusData.status === "string" ? statusData.status : null;
            const amountCandidate =
              typeof statusData.amount === "number"
                ? statusData.amount
                : typeof statusData.credited_amount === "number"
                  ? statusData.credited_amount
                  : null;
            if (
              typeof amountCandidate === "number" &&
              Number.isFinite(amountCandidate) &&
              amountCandidate > 0
            ) {
              paymentAmount = amountCandidate;
            }
            if (typeof statusData.balance === "number") {
              nextBalance = statusData.balance;
            }
          }
        }

        if (nextBalance === null) {
          const meResponse = await fetch(`${API_BASE_URL}/api/auth/me/`, {
            headers: { Authorization: `Bearer ${token}` },
          });
          if (meResponse.ok) {
            const meData = await meResponse.json();
            if (typeof meData.balance === "number") {
              nextBalance = meData.balance;
            }
          }
        }

        if (typeof nextBalance === "number") {
          const previousBalance =
            typeof user.balance === "number" && Number.isFinite(user.balance) ? user.balance : null;
          updateBalance(nextBalance);

          if (paymentStatus === "pending") {
            showToast("Плащането се обработва. Балансът ще се обнови автоматично.", { type: "info" });
            return;
          }

          if (paymentStatus === "failed" || paymentStatus === "cancelled") {
            showToast("Плащането не беше завършено успешно.", { type: "error" });
            return;
          }

          if (previousBalance !== null && nextBalance > previousBalance) {
            const delta = nextBalance - previousBalance;
            addDepositNotification(user.id, delta);
            showToast(
              `Балансът е обновен: €${nextBalance.toFixed(2)} (+€${delta.toFixed(2)}).`,
              { type: "success" }
            );
            return;
          }

          if (paymentAmount !== null) {
            addDepositNotification(user.id, paymentAmount);
          }

          showToast(`Балансът е обновен: €${nextBalance.toFixed(2)}.`, { type: "success" });
          return;
        }

        if (paymentStatus === "pending") {
          showToast("Плащането се обработва. Балансът ще се обнови автоматично.", { type: "info" });
          return;
        }

        showToast("Плащането е потвърдено. Обновяваме баланса.", { type: "info" });
      } catch {
        showToast("Плащането е завършено, но балансът не се обнови веднага.", { type: "info" });
      } finally {
        await applyMinimumSyncDuration(startedAt);
        setIsPaymentSyncing(false);
        clearStoredSessionId();
        clearPaymentQueryParams();
      }
    };

    syncBalanceAfterPayment();
  }, [location.hash, location.pathname, location.search, navigate, showToast, updateBalance, user]);

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
  const handleLogout = async () => {
    setIsLoggingOut(true);
    try {
      await logout();
      setIsDropdownOpen(false);
      navigate("/");
    } finally {
      setIsLoggingOut(false);
    }
  };

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
      color: "#334155",
      textDecoration: "none",
      fontSize: 14,
      padding: "0 6px",
      height: 40,
      borderRadius: 8,
      fontWeight: 650,
      transition: "color 0.2s ease",
      whiteSpace: "nowrap",
      display: "flex",
      alignItems: "center",
      gap: 7,
      background: "transparent",
      border: "none",
      cursor: "pointer",
    },
    profileIconHover: {
      background: "transparent",
      color: "#0f766e",
      border: "none",
    },
    profileLabel: {
      maxWidth: 96,
      overflow: "hidden",
      textOverflow: "ellipsis",
      whiteSpace: "nowrap",
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
    menuItemDanger: {
      color: "#6b7280",
      fontWeight: 600,
    },
    menuItemDangerDisabled: {
      opacity: 0.7,
      cursor: "not-allowed",
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
  const profileTriggerLabel =
    user.username?.trim() || user.first_name?.trim() || fullName || "Профил";
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
          <span style={styles.profileLabel}>{profileTriggerLabel}</span>
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
                      EUR баланс
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

                <div style={styles.divider} />

                <button
                  type="button"
                  style={{
                    ...styles.menuItem,
                    ...styles.menuItemDanger,
                    ...(isLoggingOut ? styles.menuItemDangerDisabled : {}),
                  }}
                  onMouseEnter={(e) => {
                    if (isLoggingOut) return;
                    (e.currentTarget as HTMLElement).style.background = "#fef2f2";
                    (e.currentTarget as HTMLElement).style.color = "#b91c1c";
                  }}
                  onMouseLeave={(e) => {
                    (e.currentTarget as HTMLElement).style.background = "none";
                    (e.currentTarget as HTMLElement).style.color = "#6b7280";
                  }}
                  onClick={handleLogout}
                  disabled={isLoggingOut}
                >
                  <LogOut size={18} />
                  <span>{isLoggingOut ? "Излизане..." : "Изход"}</span>
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
      {isPaymentSyncing && (
        <div
          style={{
            position: "fixed",
            inset: 0,
            zIndex: 5200,
            display: "grid",
            placeItems: "center",
            background: "rgba(248, 250, 252, 0.94)",
            backdropFilter: "blur(4px)",
            padding: 16,
          }}
        >
          <div
            style={{
              width: "100%",
              maxWidth: 420,
              background: "#ffffff",
              border: "1px solid #e2e8f0",
              borderRadius: 14,
              padding: "24px 22px",
              textAlign: "center",
              boxShadow: "0 14px 36px rgba(15, 23, 42, 0.14)",
            }}
          >
            <div
              style={{
                width: 40,
                height: 40,
                borderRadius: "50%",
                margin: "0 auto 12px",
                border: "3px solid #ccfbf1",
                borderTopColor: "#0f766e",
                animation: "payment-sync-spin 0.9s linear infinite",
              }}
            />
            <h2 style={{ margin: 0, fontSize: 18, fontWeight: 800, color: "#0f172a" }}>
              Обновяване на баланса...
            </h2>
            <p style={{ margin: "8px 0 0", fontSize: 13, color: "#475569" }}>
              Моля, изчакайте секунда.
            </p>
          </div>
          <style>{`
            @keyframes payment-sync-spin {
              from { transform: rotate(0deg); }
              to { transform: rotate(360deg); }
            }
          `}</style>
        </div>
      )}
    </>
  );
};

export default ProfileMenu;
