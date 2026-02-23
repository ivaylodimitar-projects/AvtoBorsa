import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import karBgLogo from "../assets/karbglogo.jpg";
import { API_BASE_URL } from "../config/api";

const ForgotPasswordPage: React.FC = () => {
  const navigate = useNavigate();
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setMessage("");
    if (!email.trim()) {
      setError("Въведи имейл.");
      return;
    }
    setLoading(true);
    try {
      const response = await fetch(`${API_BASE_URL}/api/auth/password-reset/`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: email.trim() }),
      });
      const data = await response.json().catch(() => ({}));
      if (!response.ok) {
        setError(data?.error || "Грешка при изпращане на имейл.");
        return;
      }
      setMessage(data?.message || "Провери пощата си за инструкции.");
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
            <img src={karBgLogo} alt="Kar.bg logo" style={styles.badge} />
            <h1 style={styles.title}>Забравена парола</h1>
            <p style={styles.subtitle}>Ще ти изпратим линк за смяна на парола.</p>
          </div>

          {error && <div style={styles.errorBanner}>{error}</div>}
          {message && <div style={styles.successBanner}>{message}</div>}

          <form onSubmit={handleSubmit}>
            <div style={styles.formRow}>
              <label style={styles.label}>Имейл</label>
              <input
                style={styles.input}
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="you@email.com"
                required
              />
            </div>

            <button type="submit" style={styles.primaryBtn} disabled={loading}>
              {loading ? "Изпращам..." : "Изпрати линк"}
            </button>
          </form>

          <button type="button" style={styles.linkBtn} onClick={() => navigate("/auth")}>
            Върни се към вход
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

export default ForgotPasswordPage;
