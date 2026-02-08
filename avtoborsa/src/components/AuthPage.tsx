import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";

const AuthPage: React.FC = () => {
  const navigate = useNavigate();
  const { login, setUserFromToken } = useAuth();
  const [isLogin, setIsLogin] = useState(true);
  const [formData, setFormData] = useState({
    email: "",
    password: "",
  });
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
        const response = await fetch("http://localhost:8000/api/auth/login/", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            email: formData.email,
            password: formData.password,
          }),
        });

        if (response.ok) {
          const data = await response.json();
          if (data.token && data.user) {
            setUserFromToken(data.user, data.token);
          }
          alert("Влизане успешно!");
          navigate("/");
        } else {
          const errorData = await response.json();
          setErrors({ submit: errorData.error || "Невалиден email или парола" });
        }
      } else {
        navigate("/profile");
      }
    } catch (error) {
      setErrors({ submit: "Грешка при свързване със сървъра" });
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
          border-color: #0066cc !important;
          box-shadow: 0 0 0 3px rgba(0,102,204,0.1);
          outline: none;
        }
        .auth-submit-btn {
          transition: background 0.2s ease, box-shadow 0.2s ease, opacity 0.2s ease;
        }
        .auth-submit-btn:hover:not(:disabled) {
          box-shadow: 0 4px 14px rgba(0,102,204,0.35);
        }
        .auth-toggle-link {
          transition: color 0.15s ease;
        }
        .auth-toggle-link:hover {
          color: #004a99 !important;
        }

        /* Tablet (768px - 1023px) */
        @media (min-width: 768px) and (max-width: 1023px) {
          .auth-outer { padding: 24px 16px !important; }
          .auth-hero { padding: 24px !important; }
          .auth-hero-title { font-size: 24px !important; }
        }

        /* Mobile Large (640px - 767px) */
        @media (min-width: 640px) and (max-width: 767px) {
          .auth-outer { padding: 20px 12px !important; }
          .auth-hero { padding: 22px 18px !important; margin-bottom: 20px !important; }
          .auth-hero-title { font-size: 22px !important; }
          .auth-hero-subtitle { font-size: 13px !important; }
          .auth-form-card { padding: 24px !important; }
        }

        /* Mobile Small (< 640px) */
        @media (max-width: 639px) {
          .auth-outer { padding: 16px 8px !important; }
          .auth-hero { padding: 20px 16px !important; margin-bottom: 18px !important; }
          .auth-hero-title { font-size: 20px !important; }
          .auth-hero-subtitle { font-size: 12px !important; }
          .auth-hero-icon { width: 44px !important; height: 44px !important; }
          .auth-hero-icon svg { width: 18px !important; height: 18px !important; }
          .auth-form-card { padding: 20px !important; }
          .auth-section-title { font-size: 14px !important; }
          .auth-label { font-size: 12px !important; }
          .auth-input { font-size: 13px !important; padding: 10px 12px !important; }
          .auth-submit-btn { font-size: 14px !important; padding: 11px 20px !important; }
        }
      `}</style>

      <div style={styles.outer} className="auth-outer">
        {/* Hero Header */}
        <div style={styles.hero} className="auth-hero">
          <div style={styles.heroContent}>
            <div style={styles.heroIcon} className="auth-hero-icon">
              <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <rect x="3" y="11" width="18" height="11" rx="2" ry="2" />
                <path d="M7 11V7a5 5 0 0 1 10 0v4" />
              </svg>
            </div>
            <div>
              <h1 style={styles.heroTitle} className="auth-hero-title">
                {isLogin ? "Влизане в профил" : "Регистрация"}
              </h1>
              <p style={styles.heroSubtitle} className="auth-hero-subtitle">
                {isLogin
                  ? "Влез в акаунта си за достъп до обявите"
                  : "Създай нов акаунт за публикуване на обяви"}
              </p>
            </div>
          </div>
        </div>

        {/* Form Card */}
        <form style={styles.formCard} className="auth-form-card" onSubmit={handleSubmit}>
          <h2 style={styles.sectionTitle} className="auth-section-title">
            {isLogin ? "Данни за вход" : "Данни за регистрация"}
          </h2>

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
                borderColor: errors.email ? "#fca5a5" : "#e6e9ef",
              }}
              type="email"
              name="email"
              placeholder="your@email.com"
              value={formData.email}
              onChange={handleChange}
              required
            />
          </div>

          <div style={styles.formRow}>
            <label style={styles.label} className="auth-label">Парола *</label>
            <input
              className="auth-input"
              style={{
                ...styles.input,
                borderColor: errors.password ? "#fca5a5" : "#e6e9ef",
              }}
              type="password"
              name="password"
              placeholder="Твоята парола"
              value={formData.password}
              onChange={handleChange}
              required
            />
          </div>

          {isLogin && (
            <div style={styles.forgotRow}>
              <span
                style={styles.forgotLink}
                className="auth-toggle-link"
                role="button"
                tabIndex={0}
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
    background: "#f5f5f5",
    width: "100%",
    boxSizing: "border-box",
  },
  outer: {
    maxWidth: 520,
    margin: "0 auto",
    padding: "32px 20px",
    boxSizing: "border-box",
  },

  // Hero
  hero: {
    background: "linear-gradient(135deg, #0f172a 0%, #1e293b 50%, #0f172a 100%)",
    borderRadius: 14,
    padding: "28px",
    marginBottom: 24,
    boxShadow: "0 6px 20px rgba(15,23,42,0.15)",
    position: "relative",
    overflow: "hidden",
  },
  heroContent: {
    display: "flex",
    alignItems: "center",
    gap: 16,
    position: "relative",
    zIndex: 1,
  },
  heroIcon: {
    width: 52,
    height: 52,
    borderRadius: 12,
    background: "rgba(255,255,255,0.1)",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    color: "#fff",
    flexShrink: 0,
  },
  heroTitle: {
    fontSize: 26,
    fontWeight: 800,
    color: "#fff",
    margin: 0,
    lineHeight: 1.2,
  },
  heroSubtitle: {
    fontSize: 14,
    color: "rgba(255,255,255,0.65)",
    margin: "4px 0 0",
  },

  // Form card
  formCard: {
    background: "#fff",
    borderRadius: 14,
    padding: 32,
    boxShadow: "0 4px 16px rgba(15,23,42,0.06)",
    border: "1px solid #eef2f7",
    boxSizing: "border-box",
  },
  sectionTitle: {
    fontSize: 15,
    fontWeight: 700,
    color: "#111827",
    marginTop: 0,
    marginBottom: 20,
    paddingBottom: 14,
    borderBottom: "1px solid #eef2f7",
  },

  // Error
  errorBanner: {
    display: "flex",
    alignItems: "center",
    gap: 10,
    padding: "12px 14px",
    background: "#fef2f2",
    border: "1px solid #fecaca",
    borderRadius: 10,
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
    color: "#374151",
  },
  input: {
    padding: "12px 14px",
    border: "1px solid #e6e9ef",
    borderRadius: 10,
    fontSize: 14,
    fontFamily: "inherit",
    width: "100%",
    boxSizing: "border-box",
    background: "#fff",
    color: "#111827",
  },

  // Forgot password
  forgotRow: {
    display: "flex",
    justifyContent: "flex-end",
    marginBottom: 20,
    marginTop: -4,
  },
  forgotLink: {
    fontSize: 13,
    color: "#0066cc",
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
    background: "#0066cc",
    color: "#fff",
    border: "none",
    borderRadius: 10,
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
    background: "#eef2f7",
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
    border: "1px solid #e6e9ef",
    borderRadius: 10,
    padding: "10px 22px",
    fontSize: 14,
    fontWeight: 600,
    color: "#0066cc",
    cursor: "pointer",
    fontFamily: "inherit",
  },
};

export default AuthPage;
