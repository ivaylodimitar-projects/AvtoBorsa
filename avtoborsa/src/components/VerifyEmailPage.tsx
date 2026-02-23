import React, { useEffect, useMemo, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { API_BASE_URL } from "../config/api";

type VerifyStatus = "pending" | "success" | "error";

const VerifyEmailPage: React.FC = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const [status, setStatus] = useState<VerifyStatus>("pending");
  const [message, setMessage] = useState("Потвърждаваме акаунта ти...");

  const params = useMemo(() => new URLSearchParams(location.search), [location.search]);
  const uid = params.get("uid");
  const token = params.get("token");

  useEffect(() => {
    if (!uid || !token) {
      setStatus("error");
      setMessage("Липсва информация за потвърждение. Провери линка от имейла.");
      return;
    }

    const verify = async () => {
      try {
        const response = await fetch(
          `${API_BASE_URL}/api/auth/verify-email/?uid=${encodeURIComponent(uid)}&token=${encodeURIComponent(token)}`
        );
        const data = await response.json();
        if (response.ok) {
          setStatus("success");
          setMessage(data?.message || "Акаунтът е потвърден успешно.");
        } else {
          setStatus("error");
          setMessage(data?.error || "Линкът е невалиден или изтекъл.");
        }
      } catch (error) {
        setStatus("error");
        setMessage("Грешка при свързване със сървъра. Опитай по-късно.");
        console.error("Verify email error:", error);
      }
    };

    verify();
  }, [uid, token]);

  const statusIcon =
    status === "success" ? (
      <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M20 6 9 17l-5-5" />
      </svg>
    ) : status === "error" ? (
      <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
        <circle cx="12" cy="12" r="10" />
        <path d="M15 9 9 15" />
        <path d="M9 9 15 15" />
      </svg>
    ) : (
      <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M12 6v6l4 2" />
        <circle cx="12" cy="12" r="10" />
      </svg>
    );

  return (
    <div style={styles.page}>
      <style>{`
        @media (max-width: 860px) {
          .verify-container {
            grid-template-columns: 1fr !important;
          }
        }
        @media (max-width: 560px) {
          .verify-card {
            padding: 24px 20px !important;
          }
          .verify-side {
            padding: 22px 20px !important;
          }
        }
      `}</style>
      <div style={styles.glow} aria-hidden="true" />
      <div style={styles.container} className="verify-container">
        <div style={styles.card} className="verify-card">
          <div
            style={{
              ...styles.iconWrap,
              ...(status === "success"
                ? styles.iconSuccess
                : status === "error"
                ? styles.iconError
                : styles.iconPending),
            }}
          >
            {statusIcon}
          </div>
          <h1 style={styles.title}>
            {status === "success"
              ? "Акаунтът е активиран"
              : status === "error"
              ? "Проблем с потвърждението"
              : "Потвърждаваме..."}
          </h1>
          <p style={styles.subtitle}>{message}</p>

          <div style={styles.actions}>
            <button style={styles.primaryBtn} type="button" onClick={() => navigate("/auth")}>
              Към вход
            </button>
            <button style={styles.secondaryBtn} type="button" onClick={() => navigate("/")}>
              Начало
            </button>
          </div>
        </div>
        <div style={styles.sideCard} className="verify-side">
          <div style={styles.sideTitle}>Какво следва?</div>
          <ul style={styles.sideList}>
            <li style={styles.sideItem}>Влез в профила си.</li>
            <li style={styles.sideItem}>Добави първата си обява.</li>
            <li style={styles.sideItem}>Свързвай се директно с купувачи.</li>
          </ul>
        </div>
      </div>
    </div>
  );
};

const styles: Record<string, React.CSSProperties> = {
  page: {
    minHeight: "100vh",
    background: "linear-gradient(180deg, #f8fafc 0%, #eef2f7 60%, #f8fafc 100%)",
    position: "relative",
    overflow: "hidden",
  },
  glow: {
    position: "absolute",
    top: -140,
    right: -120,
    width: 340,
    height: 340,
    borderRadius: "50%",
    background: "radial-gradient(circle, rgba(16,185,129,0.25) 0%, rgba(16,185,129,0) 70%)",
    filter: "blur(2px)",
    pointerEvents: "none",
  },
  container: {
    maxWidth: 980,
    margin: "0 auto",
    padding: "36px 20px 48px",
    display: "grid",
    gridTemplateColumns: "1.1fr 0.9fr",
    gap: 20,
  },
  card: {
    background: "#fff",
    borderRadius: 16, padding: "32px 30px",
    border: "1px solid #e5e7eb",
    boxShadow: "0 16px 40px rgba(15, 23, 42, 0.08)",
  },
  iconWrap: {
    width: 52,
    height: 52,
    borderRadius: 16, display: "flex",
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 16,
  },
  iconSuccess: {
    background: "rgba(16,185,129,0.12)",
    color: "#0f766e",
  },
  iconError: {
    background: "rgba(239,68,68,0.12)",
    color: "#dc2626",
  },
  iconPending: {
    background: "rgba(15,118,110,0.1)",
    color: "#0f766e",
  },
  title: {
    fontSize: 24,
    fontWeight: 800,
    color: "#0f172a",
    margin: "0 0 8px",
    fontFamily: "\"Space Grotesk\", \"Manrope\", \"Segoe UI\", sans-serif",
  },
  subtitle: {
    fontSize: 14,
    color: "#64748b",
    margin: "0 0 22px",
    lineHeight: 1.6,
  },
  actions: {
    display: "flex",
    gap: 12,
    flexWrap: "wrap",
  },
  primaryBtn: {
    background: "#0f766e",
    color: "#fff",
    border: "none",
    borderRadius: 16, padding: "12px 20px",
    fontSize: 14,
    fontWeight: 700,
    cursor: "pointer",
    boxShadow: "0 8px 18px rgba(15, 118, 110, 0.25)",
  },
  secondaryBtn: {
    background: "#fff",
    color: "#0f766e",
    border: "1px solid #cbd5f5",
    borderRadius: 16, padding: "12px 20px",
    fontSize: 14,
    fontWeight: 600,
    cursor: "pointer",
  },
  sideCard: {
    background: "linear-gradient(160deg, #ecfdf5 0%, #f8fafc 55%, #fff 100%)",
    borderRadius: 16, padding: "28px 24px",
    border: "1px solid #d1fae5",
    boxShadow: "0 12px 26px rgba(15, 118, 110, 0.12)",
  },
  sideTitle: {
    fontSize: 16,
    fontWeight: 700,
    color: "#0f766e",
    marginBottom: 12,
  },
  sideList: {
    margin: 0,
    padding: "0 0 0 18px",
    color: "#475569",
    fontSize: 13,
    lineHeight: 1.6,
  },
  sideItem: {
    marginBottom: 8,
  },
};

export default VerifyEmailPage;
