import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { useToast } from "../context/ToastContext";

const AuthPage: React.FC = () => {
  const navigate = useNavigate();
  const { login } = useAuth();
  const { showToast } = useToast();
  const [isLogin, setIsLogin] = useState(true);
  const [formData, setFormData] = useState({
    email: "",
    password: "",
  });
  const [rememberPassword, setRememberPassword] = useState(true);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(false);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
    if (errors[name]) {
      setErrors((prev) => ({ ...prev, [name]: "" }));
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setErrors({});

    try {
      if (isLogin) {
        await login(formData.email, formData.password, {
          remember: rememberPassword,
        });
        showToast("Влизането е успешно.", { type: "success" });
        navigate("/");
      } else {
        navigate("/profile");
      }
    } catch (error) {
      const message =
        error instanceof Error
          ? error.message || "Грешка при свързване със сървъра"
          : "Грешка при свързване със сървъра";
      setErrors({ submit: message });
      console.error("Error:", error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={styles.page}>
      <style>{`
        .auth-input {
          transition: border-color 0.15s ease, box-shadow 0.15s ease;
        }
        .auth-input:focus {
          border-color: #0f766e !important;
          box-shadow: 0 0 0 3px rgba(15,118,110,0.15);
          outline: none;
        }
        .auth-submit-btn {
          transition: background 0.2s ease, box-shadow 0.2s ease, opacity 0.2s ease;
        }
        .auth-submit-btn:hover:not(:disabled) {
          background: #0b5f58 !important;
          box-shadow: 0 4px 10px rgba(15,118,110,0.18);
        }
        .auth-toggle-link {
          transition: color 0.15s ease;
        }
        .auth-toggle-link:hover {
          color: #0b5f58 !important;
        }

        /* Tablet (768px - 1023px) */
        @media (min-width: 768px) and (max-width: 1023px) {
          .auth-outer { padding: 24px 16px !important; }
          .auth-header-title { font-size: 22px !important; }
        }

        /* Mobile Large (640px - 767px) */
        @media (min-width: 640px) and (max-width: 767px) {
          .auth-outer { padding: 20px 12px !important; }
          .auth-form-card { padding: 24px !important; }
          .auth-header-title { font-size: 21px !important; }
          .auth-header-subtitle { font-size: 13px !important; }
        }

        /* Mobile Small (< 640px) */
        @media (max-width: 639px) {
          .auth-outer { padding: 16px 8px !important; }
          .auth-form-card { padding: 20px !important; }
          .auth-label { font-size: 12px !important; }
          .auth-input { font-size: 13px !important; padding: 10px 12px !important; }
          .auth-submit-btn { font-size: 14px !important; padding: 11px 20px !important; }
          .auth-header-title { font-size: 20px !important; }
          .auth-header-subtitle { font-size: 12px !important; }
        }
      `}</style>

      <div style={styles.outer} className="auth-outer">
        {/* Form Card */}
        <form style={styles.formCard} className="auth-form-card" onSubmit={handleSubmit}>
          <div style={styles.header}>
            <h1 style={styles.headerTitle} className="auth-header-title">
              {isLogin ? "Вход" : "Регистрация"}
            </h1>
            <p style={styles.headerSubtitle} className="auth-header-subtitle">
              {isLogin
                ? "Влез, за да управляваш профила си."
                : "Създай профил за публикуване на обяви."}
            </p>
          </div>

          {errors.submit && (
            <div style={styles.errorBanner}>
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#ef4444" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ flexShrink: 0 }}>
                <circle cx="12" cy="12" r="10" />
                <line x1="15" y1="9" x2="9" y2="15" />
                <line x1="9" y1="9" x2="15" y2="15" />
              </svg>
              <span>{errors.submit}</span>
            </div>
          )}

          <div style={styles.formRow}>
            <label style={styles.label} className="auth-label">Email *</label>
            <input
              className="auth-input"
              style={{
                ...styles.input,
                borderColor: errors.email ? "#fca5a5" : "#e2e8f0",
              }}
              type="email"
              name="email"
              placeholder="your@email.com"
              value={formData.email}
              onChange={handleChange}
              autoComplete="username"
              required
            />
          </div>

          <div style={styles.formRow}>
            <label style={styles.label} className="auth-label">Парола *</label>
            <input
              className="auth-input"
              style={{
                ...styles.input,
                borderColor: errors.password ? "#fca5a5" : "#e2e8f0",
              }}
              type="password"
              name="password"
              placeholder="Твоята парола"
              value={formData.password}
              onChange={handleChange}
              autoComplete="current-password"
              required
            />
          </div>

          {isLogin && (
            <div style={styles.loginOptionsRow}>
              <label style={styles.rememberLabel}>
                <input
                  type="checkbox"
                  checked={rememberPassword}
                  onChange={(event) => setRememberPassword(event.target.checked)}
                  style={styles.rememberCheckbox}
                />
                <span>Запомни парола</span>
              </label>
              <span
                style={styles.forgotLink}
                className="auth-toggle-link"
                role="button"
                tabIndex={0}
                onClick={() => navigate("/forgot-password")}
                onKeyDown={(e) => e.key === "Enter" && navigate("/forgot-password")}
              >
                Забравена парола?
              </span>
            </div>
          )}

          <button
            className="auth-submit-btn"
            style={{
              ...styles.submitBtn,
              opacity: loading ? 0.6 : 1,
            }}
            type="submit"
            disabled={loading}
          >
            {loading ? (
              "Зареждане..."
            ) : isLogin ? (
              <>
                Влизане
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" style={{ marginLeft: 8 }}>
                  <path d="M5 12h14" />
                  <path d="m12 5 7 7-7 7" />
                </svg>
              </>
            ) : (
              "Регистрация"
            )}
          </button>

          {/* Divider + toggle */}
          <div style={styles.divider}>
            <div style={styles.dividerLine} />
            <span style={styles.dividerText}>или</span>
            <div style={styles.dividerLine} />
          </div>

          <div style={styles.toggleSection}>
            <p style={styles.toggleText}>
              {isLogin ? "Нямаш профил?" : "Вече имаш профил?"}
            </p>
            <button
              type="button"
              className="auth-toggle-link"
              style={styles.toggleBtn}
              onClick={() => {
                if (isLogin) {
                  navigate("/profile");
                } else {
                  setIsLogin(true);
                  setFormData({ email: "", password: "" });
                }
              }}
            >
              {isLogin ? (
                <>
                  Създай профил
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" style={{ marginLeft: 6 }}>
                    <path d="M5 12h14" />
                    <path d="m12 5 7 7-7 7" />
                  </svg>
                </>
              ) : (
                "Влизане"
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

const styles: Record<string, React.CSSProperties> = {
  page: {
    minHeight: "100vh",
    background: "#f8fafc",
    width: "100%",
    boxSizing: "border-box",
  },
  outer: {
    maxWidth: 520,
    margin: "0 auto",
    padding: "40px 20px",
    boxSizing: "border-box",
  },

  // Header
  header: {
    marginBottom: 20,
    paddingBottom: 18,
    borderBottom: "1px solid #e2e8f0",
  },
  headerBadge: {
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
  headerTitle: {
    fontSize: 24,
    fontWeight: 800,
    color: "#0f172a",
    margin: 0,
    lineHeight: 1.2,
    fontFamily: "\"Space Grotesk\", \"Manrope\", \"Segoe UI\", sans-serif",
  },
  headerSubtitle: {
    fontSize: 14,
    color: "#64748b",
    margin: "6px 0 0",
  },

  // Form card
  formCard: {
    background: "#fff",
    borderRadius: 16,
    padding: 28,
    boxShadow: "0 12px 30px rgba(15,23,42,0.08)",
    border: "1px solid #e5e7eb",
    boxSizing: "border-box",
  },

  // Error
  errorBanner: {
    display: "flex",
    alignItems: "center",
    gap: 10,
    padding: "12px 14px",
    background: "#fef2f2",
    border: "1px solid #fecaca",
    borderRadius: 16,
    fontSize: 13,
    color: "#991b1b",
    marginBottom: 18,
  },

  // Form fields
  formRow: {
    display: "flex",
    flexDirection: "column",
    gap: 6,
    marginBottom: 16,
  },
  label: {
    fontSize: 13,
    fontWeight: 600,
    color: "#334155",
  },
  input: {
    padding: "12px 14px",
    border: "1px solid #e2e8f0",
    borderRadius: 16,
    fontSize: 14,
    fontFamily: "inherit",
    width: "100%",
    boxSizing: "border-box",
    background: "#fff",
    color: "#111827",
  },

  // Login options
  loginOptionsRow: {
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 12,
    flexWrap: "wrap",
    marginBottom: 20,
    marginTop: -4,
  },
  rememberLabel: {
    display: "inline-flex",
    alignItems: "center",
    gap: 8,
    fontSize: 13,
    color: "#334155",
    fontWeight: 600,
    cursor: "pointer",
    userSelect: "none",
  },
  rememberCheckbox: {
    width: 16,
    height: 16,
    accentColor: "#0f766e",
    margin: 0,
    cursor: "pointer",
  },
  forgotLink: {
    fontSize: 13,
    color: "#0f766e",
    cursor: "pointer",
    fontWeight: 500,
  },

  // Submit
  submitBtn: {
    display: "inline-flex",
    alignItems: "center",
    justifyContent: "center",
    width: "100%",
    padding: "13px 24px",
    background: "#0f766e",
    color: "#fff",
    border: "none",
    borderRadius: 16,
    fontSize: 15,
    fontWeight: 700,
    cursor: "pointer",
    boxSizing: "border-box",
  },

  // Divider
  divider: {
    display: "flex",
    alignItems: "center",
    gap: 14,
    margin: "24px 0",
  },
  dividerLine: {
    flex: 1,
    height: 1,
    background: "#e2e8f0",
  },
  dividerText: {
    fontSize: 12,
    color: "#9ca3af",
    fontWeight: 500,
    textTransform: "uppercase",
    letterSpacing: 0.5,
  },

  // Toggle section
  toggleSection: {
    textAlign: "center",
  },
  toggleText: {
    fontSize: 14,
    color: "#6b7280",
    margin: "0 0 10px",
  },
  toggleBtn: {
    display: "inline-flex",
    alignItems: "center",
    justifyContent: "center",
    background: "none",
    border: "1px solid #cbd5f5",
    borderRadius: 16,
    padding: "10px 22px",
    fontSize: 14,
    fontWeight: 600,
    color: "#0f766e",
    cursor: "pointer",
    fontFamily: "inherit",
  },
};

export default AuthPage;
