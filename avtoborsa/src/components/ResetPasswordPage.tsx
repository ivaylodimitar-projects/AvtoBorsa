import React, { useMemo, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";

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
      const response = await fetch("http://localhost:8000/api/auth/password-reset/confirm/", {
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
    <div style={styles.page}>
      <div style={styles.container}>
        <div style={styles.card}>
          <div style={styles.header}>
            <div style={styles.badge}>Kar.bg</div>
            <h1 style={styles.title}>Смяна на парола</h1>
            <p style={styles.subtitle}>Въведи нова парола за акаунта си.</p>
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

            <button type="submit" style={styles.primaryBtn} disabled={loading}>
              {loading ? "Записвам..." : "Запази"}
            </button>
          </form>

          <button type="button" style={styles.linkBtn} onClick={() => navigate("/auth")}>
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
    borderRadius: 12,
    border: "1px solid #e5e7eb",
    boxShadow: "0 12px 30px rgba(15,23,42,0.08)",
    padding: 28,
  },
  header: { marginBottom: 20, paddingBottom: 18, borderBottom: "1px solid #e2e8f0" },
  badge: {
    display: "inline-flex",
    alignItems: "center",
    padding: "4px 10px",
    borderRadius: 999,
    fontSize: 11,
    fontWeight: 700,
    letterSpacing: 0.4,
    textTransform: "uppercase",
    color: "#0f766e",
    background: "#ecfdf5",
    border: "1px solid #bbf7d0",
    marginBottom: 10,
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
    borderRadius: 10,
    fontSize: 14,
    fontFamily: "inherit",
    width: "100%",
    boxSizing: "border-box",
  },
  primaryBtn: {
    width: "100%",
    padding: "12px 16px",
    borderRadius: 12,
    border: "none",
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
    borderRadius: 12,
    padding: "10px 14px",
    color: "#0f766e",
    fontWeight: 600,
    cursor: "pointer",
  },
  errorBanner: {
    background: "#fef2f2",
    color: "#991b1b",
    border: "1px solid #fecaca",
    borderRadius: 10,
    padding: "10px 12px",
    marginBottom: 14,
    fontSize: 13,
  },
  successBanner: {
    background: "#ecfdf5",
    color: "#0f766e",
    border: "1px solid #bbf7d0",
    borderRadius: 10,
    padding: "10px 12px",
    marginBottom: 14,
    fontSize: 13,
  },
};

export default ResetPasswordPage;
