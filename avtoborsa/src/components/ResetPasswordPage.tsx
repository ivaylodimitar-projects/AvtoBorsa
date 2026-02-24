import React, { useMemo, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import karBgLogo from "../assets/karbglogo.png";
import { API_BASE_URL } from "../config/api";

const ResetPasswordPage: React.FC = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const params = useMemo(() => new URLSearchParams(location.search), [location.search]);
  const uid = params.get("uid") || "";
  const token = params.get("token") || "";

  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setMessage("");
    if (!uid || !token) {
      setError("Липсва информация за смяна на парола.");
      return;
    }
    if (!password.trim() || password.length < 6) {
      setError("Паролата трябва да е поне 6 символа.");
      return;
    }
    if (password !== confirm) {
      setError("Паролите не съвпадат.");
      return;
    }
    setLoading(true);
    try {
      const response = await fetch(`${API_BASE_URL}/api/auth/password-reset/confirm/`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ uid, token, new_password: password }),
      });
      const data = await response.json().catch(() => ({}));
      if (!response.ok) {
        setError(data?.error || "Грешка при смяна на парола.");
        return;
      }
      setMessage(data?.message || "Паролата е сменена успешно.");
    } catch {
      setError("Грешка при свързване със сървъра.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={styles.page} className="reset-page">
      <style>{`
        @media (max-width: 767px) {
          .reset-container {
            padding: 20px 12px !important;
          }
          .reset-card {
            padding: 20px !important;
          }
          .reset-title {
            font-size: 22px !important;
          }
          .reset-subtitle {
            font-size: 13px !important;
          }
        }

        @media (max-width: 480px) {
          .reset-container {
            padding: 14px 10px !important;
          }
          .reset-card {
            padding: 16px !important;
          }
          .reset-header {
            margin-bottom: 14px !important;
            padding-bottom: 14px !important;
          }
          .reset-primary-btn,
          .reset-link-btn {
            min-height: 42px !important;
          }
        }
      `}</style>
      <div style={styles.container} className="reset-container">
        <div style={styles.card} className="reset-card">
          <div style={styles.header} className="reset-header">
            <img src={karBgLogo} alt="Kar.bg logo" style={styles.badge} />
            <h1 style={styles.title} className="reset-title">Смяна на парола</h1>
            <p style={styles.subtitle} className="reset-subtitle">Въведи нова парола за акаунта си.</p>
          </div>

          {error && <div style={styles.errorBanner}>{error}</div>}
          {message && <div style={styles.successBanner}>{message}</div>}

          <form onSubmit={handleSubmit}>
            <div style={styles.formRow}>
              <label style={styles.label}>Нова парола</label>
              <input
                style={styles.input}
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Нова парола"
                required
              />
            </div>
            <div style={styles.formRow}>
              <label style={styles.label}>Повтори паролата</label>
              <input
                style={styles.input}
                type="password"
                value={confirm}
                onChange={(e) => setConfirm(e.target.value)}
                placeholder="Повтори паролата"
                required
              />
            </div>

            <button type="submit" style={styles.primaryBtn} className="reset-primary-btn" disabled={loading}>
              {loading ? "Записвам..." : "Запази"}
            </button>
          </form>

          <button type="button" style={styles.linkBtn} className="reset-link-btn" onClick={() => navigate("/auth")}>
            Към вход
          </button>
        </div>
      </div>
    </div>
  );
};

const styles: Record<string, React.CSSProperties> = {
  page: { minHeight: "100vh", background: "#f8fafc" },
  container: { maxWidth: 520, margin: "0 auto", padding: "40px 20px" },
  card: {
    background: "#fff",
    borderRadius: 16, border: "1px solid #e5e7eb",
    boxShadow: "0 12px 30px rgba(15,23,42,0.08)",
    padding: 28,
  },
  header: { marginBottom: 20, paddingBottom: 18, borderBottom: "1px solid #e2e8f0" },
  badge: {
    display: "block",
    width: 92,
    height: 42,
    borderRadius: 16, objectFit: "cover",
    marginBottom: 10,
    boxShadow: "0 6px 14px rgba(15, 118, 110, 0.18)",
  },
  title: {
    fontSize: 24,
    fontWeight: 800,
    color: "#0f172a",
    margin: 0,
    fontFamily: "\"Space Grotesk\", \"Manrope\", \"Segoe UI\", sans-serif",
  },
  subtitle: { fontSize: 14, color: "#64748b", margin: "6px 0 0" },
  formRow: { display: "flex", flexDirection: "column", gap: 6, marginBottom: 16 },
  label: { fontSize: 13, fontWeight: 600, color: "#334155" },
  input: {
    padding: "12px 14px",
    border: "1px solid #e2e8f0",
    borderRadius: 16, fontSize: 14,
    fontFamily: "inherit",
    width: "100%",
    boxSizing: "border-box",
  },
  primaryBtn: {
    width: "100%",
    padding: "12px 16px",
    borderRadius: 16, border: "none",
    background: "#0f766e",
    color: "#fff",
    fontWeight: 700,
    cursor: "pointer",
  },
  linkBtn: {
    marginTop: 14,
    width: "100%",
    background: "transparent",
    border: "1px solid #cbd5f5",
    borderRadius: 16, padding: "10px 14px",
    color: "#0f766e",
    fontWeight: 600,
    cursor: "pointer",
  },
  errorBanner: {
    background: "#fef2f2",
    color: "#991b1b",
    border: "1px solid #fecaca",
    borderRadius: 16, padding: "10px 12px",
    marginBottom: 14,
    fontSize: 13,
  },
  successBanner: {
    background: "#ecfdf5",
    color: "#0f766e",
    border: "1px solid #bbf7d0",
    borderRadius: 16, padding: "10px 12px",
    marginBottom: 14,
    fontSize: 13,
  },
};

export default ResetPasswordPage;
