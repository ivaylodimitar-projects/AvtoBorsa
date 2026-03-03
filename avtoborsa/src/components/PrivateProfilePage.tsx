import React, { useState } from "react";
import { useNavigate } from "react-router-dom";

import { API_BASE_URL, RECAPTCHA_ENABLED, RECAPTCHA_SITE_KEY } from "../config/api";
import RecaptchaField from "./RecaptchaField";

const PASSWORD_POLICY_MESSAGE =
  "ÐŸÐ°Ñ€Ð¾Ð»Ð°Ñ‚Ð° Ñ‚Ñ€ÑÐ±Ð²Ð° Ð´Ð° Ðµ Ð¿Ð¾Ð½Ðµ 8 ÑÐ¸Ð¼Ð²Ð¾Ð»Ð°, Ñ Ð¿Ð¾Ð½Ðµ 1 Ð³Ð»Ð°Ð²Ð½Ð° Ð±ÑƒÐºÐ²Ð° Ð¸ 1 Ñ†Ð¸Ñ„Ñ€Ð°";
const EMAIL_CONFIRMATION_MESSAGE =
  "Ð©Ðµ Ð¸Ð·Ð¿Ñ€Ð°Ñ‚Ð¸Ð¼ Ð»Ð¸Ð½Ðº Ð·Ð° Ð¿Ð¾Ñ‚Ð²ÑŠÑ€Ð¶Ð´ÐµÐ½Ð¸Ðµ Ð½Ð° Ñ‚Ð¾Ð·Ð¸ Ð¸Ð¼ÐµÐ¹Ð».";
const PUBLIC_PROFILE_BASE_URL = "https://kar.bg";

const isPasswordValid = (password: string) =>
  password.length >= 8 && /\p{Lu}/u.test(password) && /\d/.test(password);

const normalizeUsername = (value: string) =>
  value
    .toLowerCase()
    .replace(/[^a-z0-9]/g, "")
    .slice(0, 32);

const PrivateProfilePage: React.FC = () => {
  const navigate = useNavigate();
  const [formData, setFormData] = useState({
    username: "",
    email: "",
    password: "",
    confirmPassword: "",
  });

  const [errors, setErrors] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(false);
  const [successMessage, setSuccessMessage] = useState("");
  const [recaptchaToken, setRecaptchaToken] = useState<string | null>(null);
  const [recaptchaResetKey, setRecaptchaResetKey] = useState(0);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    const nextValue = name === "username" ? normalizeUsername(value) : value;
    setFormData((prev) => ({ ...prev, [name]: nextValue }));
    if (errors[name]) {
      setErrors((prev) => ({ ...prev, [name]: "" }));
    }
  };

  const validateForm = (): boolean => {
    const newErrors: Record<string, string> = {};

    if (!formData.username.trim()) {
      newErrors.username = "ÐŸÐ¾Ñ‚Ñ€ÐµÐ±Ð¸Ñ‚ÐµÐ»ÑÐºÐ¾Ñ‚Ð¾ Ð¸Ð¼Ðµ Ðµ Ð·Ð°Ð´ÑŠÐ»Ð¶Ð¸Ñ‚ÐµÐ»Ð½Ð¾";
    } else if (!/^[a-z0-9]{3,32}$/.test(formData.username.trim().toLowerCase())) {
      newErrors.username = "ÐŸÐ¾Ð·Ð²Ð¾Ð»ÐµÐ½Ð¸ ÑÐ° ÑÐ°Ð¼Ð¾ Ð¼Ð°Ð»ÐºÐ¸ Ð»Ð°Ñ‚Ð¸Ð½ÑÐºÐ¸ Ð±ÑƒÐºÐ²Ð¸ Ð¸ Ñ†Ð¸Ñ„Ñ€Ð¸ (3-32)";
    }

    if (!formData.email.trim()) {
      newErrors.email = "Email Ðµ Ð·Ð°Ð´ÑŠÐ»Ð¶Ð¸Ñ‚ÐµÐ»ÐµÐ½";
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email)) {
      newErrors.email = "ÐÐµÐ²Ð°Ð»Ð¸Ð´ÐµÐ½ email Ð°Ð´Ñ€ÐµÑ";
    }

    if (!formData.password.trim()) {
      newErrors.password = "ÐŸÐ°Ñ€Ð¾Ð»Ð°Ñ‚Ð° Ðµ Ð·Ð°Ð´ÑŠÐ»Ð¶Ð¸Ñ‚ÐµÐ»Ð½Ð°";
    } else if (!isPasswordValid(formData.password)) {
      newErrors.password = PASSWORD_POLICY_MESSAGE;
    }

    if (!formData.confirmPassword.trim()) {
      newErrors.confirmPassword = "ÐŸÐ¾Ñ‚Ð²ÑŠÑ€Ð¶Ð´ÐµÐ½Ð¸ÐµÑ‚Ð¾ Ð½Ð° Ð¿Ð°Ñ€Ð¾Ð»Ð°Ñ‚Ð° Ðµ Ð·Ð°Ð´ÑŠÐ»Ð¶Ð¸Ñ‚ÐµÐ»Ð½Ð¾";
    } else if (formData.password !== formData.confirmPassword) {
      newErrors.confirmPassword = "ÐŸÐ°Ñ€Ð¾Ð»Ð¸Ñ‚Ðµ Ð½Ðµ ÑÑŠÐ²Ð¿Ð°Ð´Ð°Ñ‚";
    }

    if (RECAPTCHA_ENABLED) {
      if (!RECAPTCHA_SITE_KEY) {
        newErrors.recaptcha = "Ð›Ð¸Ð¿ÑÐ²Ð° VITE_RECAPTCHA_SITE_KEY Ð²ÑŠÐ² frontend .env.";
      } else if (!recaptchaToken) {
        newErrors.recaptcha = "ÐœÐ¾Ð»Ñ, Ð¿Ð¾Ñ‚Ð²ÑŠÑ€Ð´Ð¸, Ñ‡Ðµ Ð½Ðµ ÑÐ¸ Ñ€Ð¾Ð±Ð¾Ñ‚.";
      }
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();

    if (!validateForm()) {
      return;
    }

    setLoading(true);
    try {
      const payload: Record<string, unknown> = {
        username: formData.username.trim().toLowerCase(),
        email: formData.email.trim().toLowerCase(),
        password: formData.password,
        confirm_password: formData.confirmPassword,
      };

      if (RECAPTCHA_ENABLED) {
        payload.recaptcha_token = recaptchaToken;
      }

      const response = await fetch(`${API_BASE_URL}/api/auth/register/private/`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(payload),
      });

      if (response.ok) {
        const data = await response.json();
        setSuccessMessage(data.message || "Ð ÐµÐ³Ð¸ÑÑ‚Ñ€Ð°Ñ†Ð¸ÑÑ‚Ð° Ðµ ÑƒÑÐ¿ÐµÑˆÐ½Ð°. Ð˜Ð·Ð¿Ñ€Ð°Ñ‚Ð¸Ñ…Ð¼Ðµ Ñ‚Ð¸ Ð¸Ð¼ÐµÐ¹Ð» Ð·Ð° Ð¿Ð¾Ñ‚Ð²ÑŠÑ€Ð¶Ð´ÐµÐ½Ð¸Ðµ.");
        setErrors({});
        setFormData({ username: "", email: "", password: "", confirmPassword: "" });
        setRecaptchaToken(null);
        setRecaptchaResetKey((prev) => prev + 1);
      } else {
        const errorData = await response.json();
        console.error("Backend error response:", errorData);
        if (errorData?.error) {
          setErrors({ submit: errorData.error });
        } else {
          setErrors(errorData);
        }
        if (RECAPTCHA_ENABLED) {
          setRecaptchaToken(null);
          setRecaptchaResetKey((prev) => prev + 1);
        }
      }
    } catch (error) {
      setErrors({ submit: "Ð“Ñ€ÐµÑˆÐºÐ° Ð¿Ñ€Ð¸ ÑÐ²ÑŠÑ€Ð·Ð²Ð°Ð½Ðµ ÑÑŠÑ ÑÑŠÑ€Ð²ÑŠÑ€Ð°" });
      if (RECAPTCHA_ENABLED) {
        setRecaptchaToken(null);
        setRecaptchaResetKey((prev) => prev + 1);
      }
      console.error("Error:", error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={styles.page}>
      <style>{`
        .priv-input {
          transition: border-color 0.15s ease, box-shadow 0.15s ease;
        }
        .priv-input:focus {
          border-color: #0f766e !important;
          box-shadow: 0 0 0 3px rgba(15,118,110,0.15);
          outline: none;
        }
        .priv-submit-btn {
          transition: background 0.2s ease, box-shadow 0.2s ease, opacity 0.2s ease;
        }
        .priv-submit-btn:hover:not(:disabled) {
          box-shadow: 0 10px 24px rgba(15,118,110,0.28);
        }
        .priv-submit-btn:active:not(:disabled) {
          transform: translateY(1px);
        }
        .priv-submit-btn:disabled {
          opacity: 0.6;
          cursor: not-allowed;
        }
        .priv-ghost-btn {
          transition: border-color 0.15s ease, color 0.15s ease;
        }
        .priv-ghost-btn:hover {
          border-color: #0f766e !important;
          color: #0b5f58 !important;
        }

        /* Tablet (768px - 1023px) */
        @media (min-width: 768px) and (max-width: 1023px) {
          .priv-outer { padding: 24px 16px !important; }
          .priv-hero { padding: 24px !important; }
          .priv-hero-title { font-size: 24px !important; }
          .priv-password-grid { grid-template-columns: 1fr 1fr !important; }
          .priv-success-banner { flex-wrap: wrap !important; }
          .priv-success-banner button { margin-left: auto !important; }
        }

        /* Mobile Large (640px - 767px) */
        @media (min-width: 640px) and (max-width: 767px) {
          .priv-outer { padding: 20px 12px !important; }
          .priv-hero { padding: 22px 18px !important; margin-bottom: 20px !important; }
          .priv-hero-content { align-items: flex-start !important; }
          .priv-hero-title { font-size: 22px !important; }
          .priv-hero-subtitle { font-size: 13px !important; }
          .priv-form-card { padding: 24px !important; }
          .priv-password-grid { grid-template-columns: 1fr !important; }
          .priv-success-banner { flex-direction: column !important; align-items: flex-start !important; gap: 10px !important; }
          .priv-success-main { width: 100% !important; }
          .priv-success-banner button { width: 100% !important; }
          .priv-actions { flex-direction: column !important; }
          .priv-actions button { width: 100% !important; }
        }

        /* Mobile Small (< 640px) */
        @media (max-width: 639px) {
          .priv-outer { padding: 16px 8px !important; }
          .priv-hero { padding: 20px 16px !important; margin-bottom: 18px !important; }
          .priv-hero-content { flex-direction: column !important; align-items: flex-start !important; gap: 12px !important; }
          .priv-hero-copy { width: 100% !important; }
          .priv-hero-title { font-size: 20px !important; }
          .priv-hero-subtitle { font-size: 12px !important; }
          .priv-hero-icon { width: 44px !important; height: 44px !important; }
          .priv-hero-icon svg { width: 18px !important; height: 18px !important; }
          .priv-form-card { padding: 20px !important; }
          .priv-section-title { font-size: 14px !important; }
          .priv-label { font-size: 12px !important; }
          .priv-input { font-size: 13px !important; padding: 10px 12px !important; }
          .priv-submit-btn { font-size: 14px !important; padding: 11px 20px !important; }
          .priv-password-grid { grid-template-columns: 1fr !important; }
          .priv-success-banner { flex-direction: column !important; align-items: flex-start !important; gap: 10px !important; }
          .priv-success-main { width: 100% !important; }
          .priv-success-banner button { width: 100% !important; }
          .priv-actions { flex-direction: column !important; }
          .priv-actions button { width: 100% !important; }
          .priv-footer-note { margin-top: 20px !important; padding-top: 16px !important; font-size: 13px !important; }
        }

        @media (hover: none) {
          .priv-submit-btn:hover:not(:disabled),
          .priv-ghost-btn:hover {
            box-shadow: none !important;
          }
        }
      `}</style>

      <div style={styles.outer} className="priv-outer">
        {/* Hero Header */}
        <div style={styles.hero} className="priv-hero">
          <div style={styles.heroContent} className="priv-hero-content">
            <div style={styles.heroIcon} className="priv-hero-icon">
              <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
                <circle cx="12" cy="7" r="4" />
              </svg>
            </div>
            <div className="priv-hero-copy">
              <h1 style={styles.heroTitle} className="priv-hero-title">Ð§Ð°ÑÑ‚ÐµÐ½ Ð¿Ñ€Ð¾Ñ„Ð¸Ð»</h1>
              <p style={styles.heroSubtitle} className="priv-hero-subtitle">
                Ð¡ÑŠÐ·Ð´Ð°Ð¹ Ð°ÐºÐ°ÑƒÐ½Ñ‚, Ð·Ð° Ð´Ð° Ð¿ÑƒÐ±Ð»Ð¸ÐºÑƒÐ²Ð°Ñˆ Ð¸ ÑƒÐ¿Ñ€Ð°Ð²Ð»ÑÐ²Ð°Ñˆ Ð¾Ð±ÑÐ²Ð¸
              </p>
            </div>
          </div>
        </div>

        {/* Form Card */}
        <form style={styles.formCard} className="priv-form-card" onSubmit={handleSubmit}>
          {/* Email Section */}
          <div style={styles.section}>
            <h2 style={styles.sectionTitle} className="priv-section-title">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#0f766e" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ marginRight: 8, verticalAlign: "middle" }}>
                <path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z" />
                <polyline points="22,6 12,13 2,6" />
              </svg>
              Email Ð°Ð´Ñ€ÐµÑ
            </h2>

            <div style={styles.formRow}>
              <label style={styles.label} className="priv-label">ÐŸÐ¾Ñ‚Ñ€ÐµÐ±Ð¸Ñ‚ÐµÐ»ÑÐºÐ¾ Ð¸Ð¼Ðµ *</label>
              <input
                className="priv-input"
                style={{
                  ...styles.input,
                  borderColor: errors.username ? "#fca5a5" : "#e2e8f0",
                }}
                type="text"
                name="username"
                placeholder="ÐŸÐ¾Ñ‚Ñ€ÐµÐ±Ð¸Ñ‚ÐµÐ»ÑÐºÐ¾ Ð¸Ð¼Ðµ"
                value={formData.username}
                onChange={handleChange}
                autoComplete="username"
              />
              {errors.username && <div style={styles.errorText}>{errors.username}</div>}
              <p style={styles.hint}>
                Ð©Ðµ ÑÐµ Ð¸Ð·Ð¿Ð¾Ð»Ð·Ð²Ð° Ð·Ð° ÑÐ¿Ð¾Ð´ÐµÐ»ÑÐ½Ðµ Ð½Ð° Ð¿Ñ€Ð¾Ñ„Ð¸Ð»Ð° Ñ‚Ð¸:{" "}
                <strong>{PUBLIC_PROFILE_BASE_URL}/{normalizeUsername(formData.username || "ÐŸÐ¾Ñ‚Ñ€ÐµÐ±Ð¸Ñ‚Ð»ÑÐºÐ¾ Ð¸Ð¼Ðµ")}</strong>
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

            {successMessage && (
              <div style={styles.successBanner} className="priv-success-banner">
                <div style={styles.successIcon}>
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M20 6 9 17l-5-5" />
                  </svg>
                </div>
                <div style={{ flex: 1 }} className="priv-success-main">
                  <div style={styles.successTitle}>ÐŸÑ€Ð¾Ð²ÐµÑ€Ð¸ Ð¿Ð¾Ñ‰Ð°Ñ‚Ð° ÑÐ¸</div>
                  <div style={styles.successText}>{successMessage}</div>
                </div>
                <button type="button" style={styles.successButton} onClick={() => navigate("/auth")}>
                  Ð’Ñ…Ð¾Ð´
                </button>
              </div>
            )}

            <div style={styles.formRow}>
              <label style={styles.label} className="priv-label">Email *</label>
              <input
                className="priv-input"
                style={{
                  ...styles.input,
                  borderColor: errors.email ? "#fca5a5" : "#e2e8f0",
                }}
                type="email"
                name="email"
                placeholder="your@email.com"
                value={formData.email}
                onChange={handleChange}
              />
              {errors.email && <span style={styles.errorText}>{errors.email}</span>}
              <p style={styles.hint}>{EMAIL_CONFIRMATION_MESSAGE}</p>
            </div>
          </div>

          {/* Password Section */}
          <div style={styles.section}>
            <h2 style={styles.sectionTitle} className="priv-section-title">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#0f766e" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ marginRight: 8, verticalAlign: "middle" }}>
                <rect x="3" y="11" width="18" height="11" rx="2" ry="2" />
                <path d="M7 11V7a5 5 0 0 1 10 0v4" />
              </svg>
              ÐŸÐ°Ñ€Ð¾Ð»Ð°
            </h2>

            <div style={styles.passwordGrid} className="priv-password-grid">
              <div style={styles.formRow}>
                <label style={styles.label} className="priv-label">ÐŸÐ°Ñ€Ð¾Ð»Ð° *</label>
                <input
                  className="priv-input"
                  style={{
                    ...styles.input,
                    borderColor: errors.password ? "#fca5a5" : "#e2e8f0",
                  }}
                  type="password"
                  name="password"
                  placeholder="Ð’ÑŠÐ²ÐµÐ´Ð¸ Ð¿Ð°Ñ€Ð¾Ð»Ð°"
                  value={formData.password}
                  onChange={handleChange}
                />
                {errors.password && <span style={styles.errorText}>{errors.password}</span>}
              </div>

              <div style={styles.formRow}>
                <label style={styles.label} className="priv-label">ÐŸÐ¾Ñ‚Ð²ÑŠÑ€Ð´Ð¸ Ð¿Ð°Ñ€Ð¾Ð»Ð° *</label>
                <input
                  className="priv-input"
                  style={{
                    ...styles.input,
                    borderColor: errors.confirmPassword ? "#fca5a5" : "#e2e8f0",
                  }}
                  type="password"
                  name="confirmPassword"
                  placeholder="ÐŸÐ¾Ñ‚Ð²ÑŠÑ€Ð´Ð¸ Ð¿Ð°Ñ€Ð¾Ð»Ð°Ñ‚Ð°"
                  value={formData.confirmPassword}
                  onChange={handleChange}
                />
                {errors.confirmPassword && <span style={styles.errorText}>{errors.confirmPassword}</span>}
              </div>
            </div>

            <p style={styles.hint}>{PASSWORD_POLICY_MESSAGE}</p>
          </div>

          <RecaptchaField
            error={errors.recaptcha}
            onChange={(token) => {
              setRecaptchaToken(token);
              if (errors.recaptcha) {
                setErrors((prev) => ({ ...prev, recaptcha: "" }));
              }
            }}
            resetKey={recaptchaResetKey}
          />

          {/* Actions */}
          <div style={styles.actions} className="priv-actions">
            <button
              className="priv-submit-btn"
              style={styles.submitBtn}
              type="submit"
              disabled={loading}
            >
              {loading ? "Ð¡ÑŠÐ·Ð´Ð°Ð²Ð°Ð¼..." : (
                <>
                  Ð¡ÑŠÐ·Ð´Ð°Ð¹ Ð¿Ñ€Ð¾Ñ„Ð¸Ð»
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" style={{ marginLeft: 8 }}>
                    <path d="M5 12h14" />
                    <path d="m12 5 7 7-7 7" />
                  </svg>
                </>
              )}
            </button>

            <button
              type="button"
              className="priv-ghost-btn"
              style={styles.ghostBtn}
              onClick={() => navigate("/profile")}
            >
              ÐÐ°Ð·Ð°Ð´
            </button>
          </div>

          <p style={styles.requiredNote}>* Ð—Ð°Ð´ÑŠÐ»Ð¶Ð¸Ñ‚ÐµÐ»Ð½Ð¸ Ð¿Ð¾Ð»ÐµÑ‚Ð°</p>

          {/* Login link */}
          <div style={styles.footerNote} className="priv-footer-note">
            <span style={{ color: "#6b7280" }}>Ð’ÐµÑ‡Ðµ Ð¸Ð¼Ð°Ñˆ Ð°ÐºÐ°ÑƒÐ½Ñ‚?</span>{" "}
            <span
              style={styles.loginLink}
              role="button"
              tabIndex={0}
              onClick={() => navigate("/auth")}
              onKeyDown={(e) => e.key === "Enter" && navigate("/auth")}
            >
              Ð’Ð»ÐµÐ· Ñ‚ÑƒÐº
            </span>
          </div>
        </form>
      </div>
    </div>
  );
};

const styles: Record<string, React.CSSProperties> = {
  page: {
    minHeight: "100vh",
    background: "linear-gradient(180deg, #f8fafc 0%, #eef2f7 60%, #f8fafc 100%)",
    width: "100%",
    boxSizing: "border-box",
  },
  outer: {
    maxWidth: 760,
    margin: "0 auto",
    padding: "36px 20px",
    boxSizing: "border-box",
  },

  // Hero
  hero: {
    background: "linear-gradient(135deg, #0f766e 0%, #0b5f58 55%, #0f766e 100%)",
    borderRadius: 16,
    padding: "28px",
    marginBottom: 24,
    boxShadow: "0 20px 40px rgba(15,118,110,0.18)",
    position: "relative",
    overflow: "hidden",
    border: "1px solid rgba(15,118,110,0.25)",
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
    borderRadius: 16,
    background: "rgba(255,255,255,0.18)",
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
    fontFamily: "\"Space Grotesk\", \"Manrope\", \"Segoe UI\", sans-serif",
  },
  heroSubtitle: {
    fontSize: 14,
    color: "rgba(255,255,255,0.78)",
    margin: "4px 0 0",
  },

  // Form card
  formCard: {
    background: "#fff",
    borderRadius: 16,
    padding: 32,
    boxShadow: "0 16px 40px rgba(15,23,42,0.08)",
    border: "1px solid #e5e7eb",
    boxSizing: "border-box",
  },

  // Section
  section: {
    marginBottom: 24,
    paddingBottom: 24,
    borderBottom: "1px solid #e2e8f0",
  },
  sectionTitle: {
    fontSize: 15,
    fontWeight: 700,
    color: "#0f766e",
    marginTop: 0,
    marginBottom: 16,
    display: "flex",
    alignItems: "center",
    fontFamily: "\"Space Grotesk\", \"Manrope\", \"Segoe UI\", sans-serif",
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
    marginBottom: 0,
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
  errorText: {
    fontSize: 12,
    color: "#ef4444",
    marginTop: 4,
  },

  // Password grid
  passwordGrid: {
    display: "grid",
    gridTemplateColumns: "1fr 1fr",
    gap: 14,
  },

  hint: {
    fontSize: 12,
    color: "#94a3b8",
    marginTop: 10,
    marginBottom: 0,
  },

  // Actions
  actions: {
    display: "flex",
    gap: 12,
    alignItems: "center",
  },
  submitBtn: {
    display: "inline-flex",
    alignItems: "center",
    justifyContent: "center",
    padding: "13px 28px",
    background: "#0f766e",
    color: "#fff",
    border: "none",
    borderRadius: 16,
    fontSize: 15,
    fontWeight: 700,
    cursor: "pointer",
    boxSizing: "border-box",
    flex: 1,
  },
  ghostBtn: {
    display: "inline-flex",
    alignItems: "center",
    justifyContent: "center",
    padding: "12px 22px",
    background: "transparent",
    border: "1px solid #cbd5f5",
    borderRadius: 16,
    fontSize: 14,
    fontWeight: 600,
    cursor: "pointer",
    color: "#0f766e",
    fontFamily: "inherit",
  },

  requiredNote: {
    fontSize: 12,
    color: "#94a3b8",
    marginTop: 14,
    marginBottom: 0,
  },

  // Footer note
  footerNote: {
    textAlign: "center",
    marginTop: 24,
    paddingTop: 20,
    borderTop: "1px solid #e2e8f0",
    fontSize: 14,
  },
  loginLink: {
    color: "#0f766e",
    fontWeight: 600,
    cursor: "pointer",
  },
  successBanner: {
    display: "flex",
    alignItems: "center",
    gap: 12,
    padding: "12px 14px",
    background: "#ecfdf5",
    border: "1px solid #bbf7d0",
    borderRadius: 16,
    fontSize: 13,
    color: "#0f766e",
    marginBottom: 18,
  },
  successIcon: {
    width: 30,
    height: 30,
    borderRadius: 16,
    background: "rgba(16,185,129,0.2)",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    color: "#0f766e",
    flexShrink: 0,
  },
  successTitle: {
    fontSize: 13,
    fontWeight: 700,
    color: "#0f766e",
    marginBottom: 2,
  },
  successText: {
    fontSize: 12,
    color: "#475569",
    lineHeight: 1.5,
  },
  successButton: {
    background: "#0f766e",
    color: "#fff",
    border: "none",
    borderRadius: 16,
    padding: "8px 14px",
    fontSize: 12,
    fontWeight: 700,
    cursor: "pointer",
  },
};

export default PrivateProfilePage;




