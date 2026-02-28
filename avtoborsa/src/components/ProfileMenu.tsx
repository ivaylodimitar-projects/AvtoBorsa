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
import { API_BASE_URL } from "../config/api";
import { buildPublicProfilePath } from "../utils/profilePaths";
const STRIPE_SESSION_STORAGE_KEY = "stripe_checkout_session_id";
const PAYMENT_SYNC_MIN_MS = 650;
const PROCESSED_PAYMENT_SESSION_KEY_PREFIX = "karbg:processed-payment:v1:";
const processedPaymentKeysInMemory = new Set<string>();

const hasPaymentBeenProcessed = (paymentKey: string) => {
  if (processedPaymentKeysInMemory.has(paymentKey)) {
    return true;
  }
  if (typeof window === "undefined") {
    return false;
  }

  const storageKey = `${PROCESSED_PAYMENT_SESSION_KEY_PREFIX}${paymentKey}`;
  return sessionStorage.getItem(storageKey) === "1";
};

const markPaymentAsProcessed = (paymentKey: string) => {
  processedPaymentKeysInMemory.add(paymentKey);
  if (typeof window === "undefined") {
    return;
  }

  const storageKey = `${PROCESSED_PAYMENT_SESSION_KEY_PREFIX}${paymentKey}`;
  sessionStorage.setItem(storageKey, "1");
};

type DealerProfile = {
  email?: string;
  profile_image_url?: string | null;
};

type ProfileMenuProps = {
  onDropdownOpenChange?: (isOpen: boolean) => void;
  onTopUpModalOpenChange?: (isOpen: boolean) => void;
  closeRequestKey?: number;
  topUpModalCloseRequestKey?: number;
  compactTrigger?: boolean;
};

const ProfileMenu: React.FC<ProfileMenuProps> = ({
  onDropdownOpenChange,
  onTopUpModalOpenChange,
  closeRequestKey,
  topUpModalCloseRequestKey,
  compactTrigger = false,
}) => {
  const { user, updateBalance, logout } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();
  const { showToast } = useToast();
  const profilePath = buildPublicProfilePath(user);
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const [isTopUpModalOpen, setIsTopUpModalOpen] = useState(false);
  const [isLoggingOut, setIsLoggingOut] = useState(false);
  const [hoveredIcon, setHoveredIcon] = useState(false);
  const [profileImageUrl, setProfileImageUrl] = useState<string | null>(null);
  const [uploadingPhoto, setUploadingPhoto] = useState(false);
  const [isPaymentSyncing, setIsPaymentSyncing] = useState(false);
  const [isMobileViewport, setIsMobileViewport] = useState(
    () => typeof window !== "undefined" && window.innerWidth <= 960
  );
  const processedPaymentKeyRef = useRef<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const shouldHandlePaymentSync = compactTrigger ? isMobileViewport : !isMobileViewport;

  useEffect(() => {
    onDropdownOpenChange?.(isDropdownOpen);
    return () => {
      onDropdownOpenChange?.(false);
    };
  }, [isDropdownOpen, onDropdownOpenChange]);

  useEffect(() => {
    if (closeRequestKey === undefined) return;
    setIsDropdownOpen(false);
  }, [closeRequestKey]);

  useEffect(() => {
    onTopUpModalOpenChange?.(isTopUpModalOpen);
    return () => {
      onTopUpModalOpenChange?.(false);
    };
  }, [isTopUpModalOpen, onTopUpModalOpenChange]);

  useEffect(() => {
    if (topUpModalCloseRequestKey === undefined) return;
    setIsTopUpModalOpen(false);
  }, [topUpModalCloseRequestKey]);

  useEffect(() => {
    if (typeof window === "undefined") return;
    const onResize = () => {
      setIsMobileViewport(window.innerWidth <= 960);
    };
    window.addEventListener("resize", onResize);
    return () => {
      window.removeEventListener("resize", onResize);
    };
  }, []);

  useEffect(() => {
    if (!user || !shouldHandlePaymentSync) return;

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
    if (processedPaymentKeyRef.current === paymentKey || hasPaymentBeenProcessed(paymentKey)) {
      return;
    }
    processedPaymentKeyRef.current = paymentKey;
    markPaymentAsProcessed(paymentKey);

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

          const depositReference = sessionId ? `stripe-session:${sessionId}` : paymentKey;

          if (previousBalance !== null && nextBalance > previousBalance) {
            const delta = nextBalance - previousBalance;
            addDepositNotification(user.id, delta, "EUR", depositReference);
            showToast(
              `Балансът е обновен: €${nextBalance.toFixed(2)} (+€${delta.toFixed(2)}).`,
              { type: "success" }
            );
            return;
          }

          if (paymentAmount !== null) {
            addDepositNotification(user.id, paymentAmount, "EUR", depositReference);
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
  }, [
    location.hash,
    location.pathname,
    location.search,
    navigate,
    shouldHandlePaymentSync,
    showToast,
    updateBalance,
    user,
  ]);

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

      const response = await fetch(`${API_BASE_URL}/api/auth/profile/upload-photo/`, {
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
            const dealersRes = await fetch(`${API_BASE_URL}/api/auth/dealers/`, {
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
      borderRadius: 16,
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
    profileIconCompact: {
      width: 42,
      minWidth: 42,
      height: 42,
      padding: 0,
      justifyContent: "center",
      borderRadius: 14,
      border: "1px solid #cbd5e1",
      background: "#ffffff",
      boxShadow: "0 6px 14px rgba(15, 23, 42, 0.14)",
      gap: 0,
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
      borderRadius: 16,
      border: "1px solid #e0e0e0",
      boxShadow: "0 4px 16px rgba(0,0,0,0.12)",
      width: "min(92vw, 360px)",
      minWidth: "min(320px, 92vw)",
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
      borderRadius: 16,
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
      borderRadius: "16px",
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
      borderRadius: 16,
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
  const triggerAvatarSize = compactTrigger ? 22 : 20;
  const createdAtLabel = user.created_at
    ? new Date(user.created_at).toLocaleDateString("bg-BG", {
        day: "numeric",
        month: "short",
        year: "numeric",
      })
    : null;

  return (
    <>
      <div
        style={styles.profileContainer}
        className={`profile-menu-root ${compactTrigger ? "profile-menu-root-compact" : "profile-menu-root-default"}`}
      >
        <style>{`
          .profile-menu-backdrop {
            z-index: 999;
          }
          @media (max-width: 960px) {
            .profile-menu-trigger:not(.profile-menu-trigger-compact) {
              width: 100% !important;
              min-height: 44px !important;
              justify-content: flex-start !important;
              border: 1px solid #e2e8f0 !important;
              border-radius: 14px !important;
              background: #fff !important;
              padding: 0 14px !important;
            }
            .profile-menu-trigger.profile-menu-trigger-compact {
              width: 42px !important;
              min-width: 42px !important;
              height: 42px !important;
              min-height: 42px !important;
              padding: 0 !important;
              justify-content: center !important;
              border: 1px solid #99f6e4 !important;
              border-radius: 14px !important;
              background: linear-gradient(180deg, #ffffff 0%, #ecfdf5 100%) !important;
              box-shadow: 0 8px 18px rgba(15, 118, 110, 0.18) !important;
            }
            .profile-menu-trigger.profile-menu-trigger-compact .profile-menu-trigger-label {
              display: none !important;
            }
            .profile-menu-dropdown {
              position: fixed !important;
              top: calc(64px + env(safe-area-inset-top, 0px) + 8px) !important;
              left: 10px !important;
              right: 10px !important;
              width: auto !important;
              min-width: 0 !important;
              margin-top: 0 !important;
              border-radius: 18px !important;
              box-shadow: 0 18px 38px rgba(15, 23, 42, 0.22) !important;
              z-index: 370 !important;
              max-height: calc(100dvh - 84px) !important;
              overflow-y: auto !important;
              border: 1px solid #dbeafe !important;
              background: linear-gradient(180deg, #ffffff 0%, #f8fafc 100%) !important;
              display: flex !important;
              flex-direction: column !important;
            }
            .profile-menu-root-compact .profile-menu-dropdown {
              left: auto !important;
              right: 10px !important;
              width: min(360px, calc(100vw - 16px)) !important;
              max-width: calc(100vw - 16px) !important;
              min-width: 0 !important;
              border-radius: 20px !important;
            }
            .site-nav-header.mobile-sheet-open .profile-menu-dropdown {
              top: calc(82px + env(safe-area-inset-top, 0px) + 8px) !important;
              max-height: calc(100dvh - 102px) !important;
            }
            .site-nav-header.mobile-sheet-open .profile-menu-root-compact .profile-menu-dropdown {
              left: auto !important;
              right: 10px !important;
            }
            .profile-menu-photo-section {
              padding: 14px 14px 12px !important;
              gap: 10px !important;
              border-bottom: 1px solid #e2e8f0 !important;
            }
            .profile-menu-photo-name {
              font-size: 13px !important;
              line-height: 1.3 !important;
            }
            .profile-menu-photo-type {
              font-size: 11px !important;
            }
            .profile-menu-close-btn {
              width: 32px !important;
              height: 32px !important;
              padding: 0 !important;
              border-radius: 10px !important;
              background: rgba(15, 118, 110, 0.12) !important;
              color: #0f766e !important;
              flex-shrink: 0 !important;
            }
            .profile-menu-balance-section {
              padding: 14px !important;
            }
            .profile-menu-balance-value {
              font-size: 24px !important;
              line-height: 1.15 !important;
            }
            .profile-menu-topup-btn {
              min-height: 42px !important;
              padding: 0 14px !important;
              border-radius: 12px !important;
              font-size: 13px !important;
              font-weight: 700 !important;
              box-shadow: 0 5px 14px rgba(15, 118, 110, 0.22) !important;
            }
            .profile-menu-items {
              padding: 8px !important;
              display: flex !important;
              flex-direction: column !important;
              gap: 6px !important;
            }
            .profile-menu-item-link {
              min-height: 44px !important;
              border: 1px solid #e2e8f0 !important;
              border-radius: 12px !important;
              background: #fff !important;
              padding: 0 12px !important;
              font-size: 13px !important;
              font-weight: 700 !important;
            }
            .profile-menu-item-logout {
              border-color: #fecaca !important;
              background: #fff7f7 !important;
            }
            .profile-menu-divider {
              display: none !important;
            }
            .profile-menu-backdrop {
              z-index: 360 !important;
              background: rgba(15, 23, 42, 0.2) !important;
            }
          }
          @media (max-width: 640px) {
            .profile-menu-dropdown {
              top: calc(58px + env(safe-area-inset-top, 0px) + 8px) !important;
              left: 8px !important;
              right: 8px !important;
              border-radius: 16px !important;
              max-height: calc(100dvh - 74px) !important;
            }
            .profile-menu-root-compact .profile-menu-dropdown {
              left: auto !important;
              right: 8px !important;
              width: min(332px, calc(100vw - 12px)) !important;
              max-width: calc(100vw - 12px) !important;
              border-radius: 18px !important;
            }
            .site-nav-header.mobile-sheet-open .profile-menu-dropdown {
              top: calc(72px + env(safe-area-inset-top, 0px) + 8px) !important;
              max-height: calc(100dvh - 88px) !important;
            }
            .site-nav-header.mobile-sheet-open .profile-menu-root-compact .profile-menu-dropdown {
              left: auto !important;
              right: 8px !important;
            }
          }
        `}</style>
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
          className={`profile-menu-trigger ${compactTrigger ? "profile-menu-trigger-compact" : "profile-menu-trigger-default"}`}
          style={{
            ...styles.profileIcon,
            ...(compactTrigger ? styles.profileIconCompact : {}),
            ...(hoveredIcon || isDropdownOpen ? styles.profileIconHover : {}),
          }}
          onMouseEnter={() => setHoveredIcon(true)}
          onMouseLeave={() => setHoveredIcon(false)}
          onClick={() => setIsDropdownOpen(!isDropdownOpen)}
          title="Профилен меню"
          aria-label={profileTriggerLabel}
        >
          {profileImageUrl ? (
            <img
              src={profileImageUrl}
              alt=""
              style={{
                width: triggerAvatarSize,
                height: triggerAvatarSize,
                borderRadius: "50%",
                objectFit: "cover",
              }}
            />
          ) : (
            <User size={18} />
          )}
          {!compactTrigger && (
            <span style={styles.profileLabel} className="profile-menu-trigger-label">
              {profileTriggerLabel}
            </span>
          )}
        </button>

        {/* Dropdown Menu */}
        {isDropdownOpen && (
          <>
            {/* Backdrop */}
            <div
              className="profile-menu-backdrop"
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

            <div style={styles.dropdown} className="profile-menu-dropdown">
              {/* Profile photo + name section */}
              <div style={styles.photoSection} className="profile-menu-photo-section">
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
                  <div style={styles.photoName} className="profile-menu-photo-name">
                    {user.username || fullName || user.email}
                  </div>
                  <div style={styles.photoType} className="profile-menu-photo-type">
                    {isBusiness ? "Бизнес профил" : "Частен профил"}
                    {uploadingPhoto && " — качване..."}
                  </div>
                  {createdAtLabel && (
                    <div style={styles.photoSince}>Потребител от {createdAtLabel}</div>
                  )}
                </div>
                <button
                  style={styles.closeBtn}
                  className="profile-menu-close-btn"
                  onClick={closeDropdown}
                >
                  <X size={16} />
                </button>
              </div>

              {/* Balance Section */}
              <div style={styles.balanceSection} className="profile-menu-balance-section">
                <div style={styles.balanceHeader}>
                  <div style={styles.balanceInfo}>
                    <div style={styles.balanceLabel}>
                      <Wallet size={14} />
                      Баланс
                    </div>
                    <div style={styles.balanceValue} className="profile-menu-balance-value">
                      €{balance.toFixed(2)}
                    </div>
                    <div style={styles.balanceSubtext}>
                      EUR баланс
                    </div>
                  </div>
                </div>

                <button
                  style={styles.topupButton}
                  className="profile-menu-topup-btn"
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
              <div style={styles.menuSection} className="profile-menu-items">
                <Link
                  to={profilePath}
                  style={styles.menuItem}
                  className="profile-menu-item-link"
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

                <div style={styles.divider} className="profile-menu-divider" />

                <Link
                  to="/settings"
                  style={styles.menuItem}
                  className="profile-menu-item-link"
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

                <div style={styles.divider} className="profile-menu-divider" />

                <button
                  type="button"
                  className="profile-menu-item-link profile-menu-item-logout"
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
              borderRadius: 16,
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
