import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import { API_BASE_URL } from "../config/api";

const PASSWORD_POLICY_MESSAGE =
  "Паролата трябва да е поне 8 символа, с поне 1 главна буква и 1 цифра";
const EMAIL_CONFIRMATION_MESSAGE =
  "Ще изпратим линк за потвърждение на този имейл.";

const isPasswordValid = (password: string) =>
  password.length >= 8 && /\p{Lu}/u.test(password) && /\d/.test(password);

const CITIES = [
  "София", "Пловдив", "Варна", "Бургас", "Русе", "Стара Загора", "Плевен",
  "Сливен", "Добрич", "Шумен", "Перник", "Дупница", "Монтана", "Ловеч",
  "Велико Търново", "Габрово", "Разград", "Видин", "Враца", "Кюстендил",
  "Пазарджик", "Благоевград", "Кърджали", "Смолян", "Хасково", "Ямбол",
  "Силистра", "Търговище", "Извън страната"
];

const BusinessProfilePage: React.FC = () => {
  const navigate = useNavigate();
  const [formData, setFormData] = useState({
    dealerName: "",
    city: "",
    address: "",
    phone: "",
    email: "",
    website: "",
    username: "",
    password: "",
    confirmPassword: "",
    companyName: "",
    registrationAddress: "",
    mol: "",
    bulstat: "",
    vatNumber: "",
    adminName: "",
    adminPhone: "",
    description: "",
  });

  const [errors, setErrors] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(false);
  const [successMessage, setSuccessMessage] = useState("");

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
    // Clear error for this field when user starts typing
    if (errors[name]) {
      setErrors((prev) => ({ ...prev, [name]: "" }));
    }
  };

  const validateForm = (): boolean => {
    const newErrors: Record<string, string> = {};

    // Име и контакти
    if (!formData.dealerName.trim()) {
      newErrors.dealerName = "Име на дилъра е задължително";
    }
    if (!formData.city.trim()) {
      newErrors.city = "Местоположение е задължително";
    }
    if (!formData.address.trim()) {
      newErrors.address = "Адрес е задължителен";
    }
    if (!formData.phone.trim()) {
      newErrors.phone = "Телефон е задължителен";
    }
    if (!formData.email.trim()) {
      newErrors.email = "Email е задължителен";
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email)) {
      newErrors.email = "Невалиден email адрес";
    }

    // Потребителско име и парола
    if (!formData.username.trim()) {
      newErrors.username = "Потребителско име е задължително";
    } else if (formData.username.length < 3) {
      newErrors.username = "Потребителското име трябва да е поне 3 символа";
    }
    if (!formData.password.trim()) {
      newErrors.password = "Паролата е задължителна";
    } else if (!isPasswordValid(formData.password)) {
      newErrors.password = PASSWORD_POLICY_MESSAGE;
    }
    if (!formData.confirmPassword.trim()) {
      newErrors.confirmPassword = "Потвърждението на паролата е задължително";
    } else if (formData.password !== formData.confirmPassword) {
      newErrors.confirmPassword = "Паролите не съвпадат";
    }

    // Фирмени данни
    if (!formData.companyName.trim()) {
      newErrors.companyName = "Фирма е задължителна";
    }
    if (!formData.registrationAddress.trim()) {
      newErrors.registrationAddress = "Адресна регистрация е задължителна";
    }
    if (!formData.mol.trim()) {
      newErrors.mol = "МОЛ е задължителен";
    }
    if (!formData.bulstat.trim()) {
      newErrors.bulstat = "БУЛСТАТ е задължителен";
    }

    // Администратор
    if (!formData.adminName.trim()) {
      newErrors.adminName = "Име и Фамилия на администратор е задължително";
    }
    if (!formData.adminPhone.trim()) {
      newErrors.adminPhone = "Мобилен телефон на администратор е задължителен";
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (validateForm()) {
      setLoading(true);
      try {
        const payloadData: any = {
          dealer_name: formData.dealerName,
          city: formData.city,
          address: formData.address,
          phone: formData.phone,
          email: formData.email.trim().toLowerCase(),
          username: formData.username,
          password: formData.password,
          confirm_password: formData.confirmPassword,
          company_name: formData.companyName,
          registration_address: formData.registrationAddress,
          mol: formData.mol,
          bulstat: formData.bulstat,
          vat_number: formData.vatNumber,
          admin_name: formData.adminName,
          admin_phone: formData.adminPhone,
          description: formData.description,
        };

        // Only include website if it's provided and non-empty
        if (formData.website.trim()) {
          payloadData.website = formData.website.trim();
        }

        const response = await fetch(`${API_BASE_URL}/api/auth/register/business/`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify(payloadData),
        });

        if (response.ok) {
          const data = await response.json();
          setSuccessMessage(data.message || "Регистрацията е успешна. Изпратихме ти имейл за потвърждение.");
          setErrors({});
          setFormData({
            dealerName: "",
            city: "",
            address: "",
            phone: "",
            email: "",
            website: "",
            username: "",
            password: "",
            confirmPassword: "",
            companyName: "",
            registrationAddress: "",
            mol: "",
            bulstat: "",
            vatNumber: "",
            adminName: "",
            adminPhone: "",
            description: "",
          });
        } else {
          const errorData = await response.json();
          console.error("Backend error response:", errorData);
          if (errorData?.error) {
            setErrors({ submit: errorData.error });
          } else {
            setErrors(errorData);
          }
        }
      } catch (error) {
        setErrors({ submit: "Грешка при свързване със сървъра" });
        console.error("Error:", error);
      } finally {
        setLoading(false);
      }
    }
  };

  const styles: Record<string, React.CSSProperties> = {
    page: { minHeight: "100vh", background: "linear-gradient(180deg, #f8fafc 0%, #eef2f7 60%, #f8fafc 100%)", width: "100%", boxSizing: "border-box" },
    container: { maxWidth: 1100, margin: "0 auto", padding: "36px 20px", boxSizing: "border-box" },
    header: {
      background: "linear-gradient(135deg, #0f766e 0%, #0b5f58 55%, #0f766e 100%)",
      padding: "28px",
      borderRadius: 16,
      marginBottom: 28,
      color: "#fff",
      boxShadow: "0 20px 40px rgba(15,118,110,0.18)",
      display: "flex",
      alignItems: "center",
      justifyContent: "space-between",
      gap: 16,
      flexWrap: "wrap",
      border: "1px solid rgba(15,118,110,0.25)",
    },
    headerLeft: { display: "flex", gap: 16, alignItems: "center" },
    headerTitle: { fontSize: 26, fontWeight: 800, margin: 0, fontFamily: "\"Space Grotesk\", \"Manrope\", \"Segoe UI\", sans-serif" },
    headerSubtitle: { fontSize: 14, margin: 0, opacity: 0.95 },
    formCard: { width: "100%", background: "#fff", borderRadius: 16, padding: 24, boxShadow: "0 16px 40px rgba(15,23,42,0.08)", boxSizing: "border-box", border: "1px solid #e5e7eb" },
    section: { marginBottom: 20, paddingBottom: 18, borderBottom: "1px solid #e2e8f0" },
    sectionTitle: { fontSize: 15, fontWeight: 700, color: "#0f766e", marginBottom: 12, fontFamily: "\"Space Grotesk\", \"Manrope\", \"Segoe UI\", sans-serif" },
    grid2: { display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14 },
    gridResponsive: { display: "grid", gridTemplateColumns: "1fr", gap: 12 },
    formRow: { display: "flex", flexDirection: "column", gap: 8, marginBottom: 12 },
    label: { fontSize: 13, fontWeight: 600, color: "#334155" },
    input: { padding: "12px 14px", border: "1px solid #e2e8f0", borderRadius: 16, fontSize: 14, width: "100%", boxSizing: "border-box", outline: "none", transition: "box-shadow 0.15s, border-color 0.15s", background: "#fff", color: "#111827" },
    errorText: { fontSize: 12, color: "#ef4444", marginTop: 6 },
    footNote: { fontSize: 12, color: "#64748b", marginTop: 10 },
    submitRow: { display: "flex", gap: 12, marginTop: 14, alignItems: "center", flexWrap: "wrap" },
    primaryButton: { padding: "12px 22px", background: "#0f766e", color: "#fff", border: "none", borderRadius: 16, fontSize: 15, fontWeight: 700, cursor: "pointer", boxShadow: "0 8px 24px rgba(15,118,110,0.24)" },
    ghostButton: { padding: "10px 18px", background: "transparent", border: "1px solid #cbd5f5", borderRadius: 16, fontSize: 14, cursor: "pointer", color: "#0f766e" },
    smallNote: { fontSize: 12, color: "#ff0000" },
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
    successTitle: { fontSize: 13, fontWeight: 700, color: "#0f766e", marginBottom: 2 },
    successText: { fontSize: 12, color: "#475569", lineHeight: 1.5 },
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
    // responsive tweaks via inline <style> below
  };

  return (
    <div style={styles.page}>
      <style>{`
        .business-form input:focus,
        .business-form select:focus,
        .business-form textarea:focus {
          border-color: #0f766e !important;
          box-shadow: 0 0 0 3px rgba(15,118,110,0.12);
        }
        .business-primary-btn,
        .business-ghost-btn,
        .business-success-btn {
          transition: transform 0.2s ease, box-shadow 0.2s ease, border-color 0.2s ease;
        }
        .business-primary-btn:hover {
          box-shadow: 0 10px 24px rgba(15,118,110,0.28) !important;
        }
        .business-ghost-btn:hover {
          border-color: #0f766e !important;
        }
        .business-success-btn:hover {
          filter: brightness(1.05);
        }

        @media (min-width: 768px) and (max-width: 1023px) {
          .business-container { padding: 28px 16px !important; }
          .business-header { padding: 24px !important; }
          .business-form-card { padding: 22px !important; }
        }

        @media (min-width: 640px) and (max-width: 767px) {
          .business-container { padding: 20px 12px !important; }
          .business-grid-2 { grid-template-columns: 1fr !important; }
          .business-header { padding: 20px 16px !important; margin-bottom: 20px !important; }
          .business-header-left { align-items: flex-start !important; }
          .business-header-copy { width: 100% !important; }
          .business-header-title { font-size: 22px !important; }
          .business-header-subtitle { font-size: 13px !important; }
          .business-form-card { padding: 20px !important; }
          .business-success-banner {
            flex-direction: column !important;
            align-items: flex-start !important;
            gap: 10px !important;
          }
          .business-success-main { width: 100% !important; }
          .business-success-banner button { width: 100% !important; }
          .business-username-row { align-items: center !important; }
          .business-submit-row {
            flex-direction: column !important;
            align-items: stretch !important;
          }
          .business-submit-row button {
            width: 100% !important;
          }
          .business-required-note {
            margin-left: 0 !important;
          }
        }

        @media (max-width: 639px) {
          .business-container { padding: 14px 10px !important; }
          .business-grid-2 { grid-template-columns: 1fr !important; }
          .business-header {
            padding: 18px 14px !important;
            margin-bottom: 18px !important;
            border-radius: 14px !important;
          }
          .business-header-left {
            flex-direction: column !important;
            align-items: flex-start !important;
            gap: 12px !important;
          }
          .business-header-icon {
            width: 46px !important;
            height: 46px !important;
            font-size: 18px !important;
          }
          .business-header-copy { width: 100% !important; }
          .business-header-title { font-size: 20px !important; line-height: 1.2 !important; }
          .business-header-subtitle { font-size: 12px !important; }
          .business-form-card { padding: 16px !important; }
          .business-form h2 { font-size: 14px !important; }
          .business-form label { font-size: 12px !important; }
          .business-form input,
          .business-form select,
          .business-form textarea {
            font-size: 13px !important;
            padding: 10px 12px !important;
          }
          .business-error-banner,
          .business-success-banner {
            flex-direction: column !important;
            align-items: flex-start !important;
            gap: 10px !important;
          }
          .business-success-main { width: 100% !important; }
          .business-success-banner button { width: 100% !important; }
          .business-username-row {
            flex-direction: column !important;
            align-items: stretch !important;
            gap: 6px !important;
          }
          .business-username-suffix {
            align-self: flex-end !important;
            padding-bottom: 0 !important;
          }
          .business-submit-row {
            flex-direction: column !important;
            align-items: stretch !important;
          }
          .business-submit-row button {
            width: 100% !important;
          }
          .business-required-note {
            margin-left: 0 !important;
          }
        }

        @media (hover: none) {
          .business-primary-btn:hover,
          .business-ghost-btn:hover,
          .business-success-btn:hover {
            transform: none !important;
            box-shadow: none !important;
            filter: none !important;
          }
        }
      `}</style>

      <div style={styles.container} className="business-container">
        <div style={styles.header} className="business-header">
          <div style={styles.headerLeft} className="business-header-left">
            <div className="business-header-icon" style={{ width: 56, height: 56, borderRadius: 16, background: "rgba(255,255,255,0.12)", display: "flex", alignItems: "center", justifyContent: "center", fontWeight: 800, fontSize: 22 }}>Б</div>
            <div className="business-header-copy">
              <h1 style={styles.headerTitle} className="business-header-title">Бизнес профил</h1>
              <p style={styles.headerSubtitle} className="business-header-subtitle">Попълни информацията на твоя бизнес. Ще получиш имейл за потвърждение на акаунта.</p>
            </div>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="business-form business-form-card" style={styles.formCard}>
          {errors.submit && (
            <div style={styles.errorBanner} className="business-error-banner">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#ef4444" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ flexShrink: 0 }}>
                <circle cx="12" cy="12" r="10" />
                <line x1="15" y1="9" x2="9" y2="15" />
                <line x1="9" y1="9" x2="15" y2="15" />
              </svg>
              <span>{errors.submit}</span>
            </div>
          )}

          {successMessage && (
            <div style={styles.successBanner} className="business-success-banner">
              <div style={styles.successIcon}>
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M20 6 9 17l-5-5" />
                </svg>
              </div>
              <div style={{ flex: 1 }} className="business-success-main">
                <div style={styles.successTitle}>Провери пощата си</div>
                <div style={styles.successText}>{successMessage}</div>
              </div>
              <button type="button" className="business-success-btn" style={styles.successButton} onClick={() => navigate("/auth")}>
                Вход
              </button>
            </div>
          )}

          {/* Име и контакти */}
          <div style={{ ...styles.section }}>
            <h2 style={styles.sectionTitle}>Име и контакти</h2>

            <div style={styles.formRow}>
              <label style={styles.label}>Име на дилъра *</label>
              <input
                style={{ ...styles.input, borderColor: errors.dealerName ? "#fca5a5" : "#e2e8f0" }}
                type="text"
                name="dealerName"
                placeholder="Име на дилъра"
                value={formData.dealerName}
                onChange={handleChange}
              />
              {errors.dealerName && <span style={styles.errorText}>{errors.dealerName}</span>}
            </div>

            <div className="business-grid-2" style={styles.grid2}>
              <div style={styles.formRow}>
                <label style={styles.label}>Местоположение *</label>
                <select
                  style={{ ...styles.input, borderColor: errors.city ? "#fca5a5" : "#e2e8f0" }}
                  name="city"
                  value={formData.city}
                  onChange={handleChange}
                >
                  <option value="">Избери град</option>
                  {CITIES.map((city) => (
                    <option key={city} value={city}>{city}</option>
                  ))}
                </select>
                {errors.city && <span style={styles.errorText}>{errors.city}</span>}
              </div>

              <div style={styles.formRow}>
                <label style={styles.label}>Адрес *</label>
                <input
                  style={{ ...styles.input, borderColor: errors.address ? "#fca5a5" : "#e2e8f0" }}
                  type="text"
                  name="address"
                  placeholder="Град, улица, номер"
                  value={formData.address}
                  onChange={handleChange}
                />
                {errors.address && <span style={styles.errorText}>{errors.address}</span>}
              </div>
            </div>

            <div className="business-grid-2" style={{ ...styles.grid2, marginTop: 6 }}>
              <div style={styles.formRow}>
                <label style={styles.label}>Телефон *</label>
                <input
                  style={{ ...styles.input, borderColor: errors.phone ? "#fca5a5" : "#e2e8f0" }}
                  type="tel"
                  name="phone"
                  placeholder="+359 88 123 4567"
                  value={formData.phone}
                  onChange={handleChange}
                />
                {errors.phone && <span style={styles.errorText}>{errors.phone}</span>}
              </div>

              <div style={styles.formRow}>
                <label style={styles.label}>Email *</label>
                <input
                  style={{ ...styles.input, borderColor: errors.email ? "#fca5a5" : "#e2e8f0" }}
                  type="email"
                  name="email"
                  placeholder="company@email.com"
                  value={formData.email}
                  onChange={handleChange}
                />
                {errors.email && <span style={styles.errorText}>{errors.email}</span>}
                <p style={styles.footNote}>{EMAIL_CONFIRMATION_MESSAGE}</p>
              </div>
            </div>

            <div style={styles.formRow}>
              <label style={styles.label}>Уебсайт</label>
              <input style={styles.input} type="text" name="website" placeholder="http://example.com" value={formData.website} onChange={handleChange} />
            </div>
          </div>

          {/* Потребителско име и парола */}
          <div style={{ ...styles.section }}>
            <h2 style={styles.sectionTitle}>Потребителско име и парола</h2>

            <div style={styles.formRow}>
              <label style={styles.label}>Потребителско име *</label>
              <div className="business-username-row" style={{ display: "flex", gap: 8, alignItems: "flex-end" }}>
                <input
                  style={{ ...styles.input, borderColor: errors.username ? "#fca5a5" : "#e2e8f0", flex: 1 }}
                  type="text"
                  name="username"
                  placeholder="username"
                  value={formData.username}
                  onChange={handleChange}
                />
                <span className="business-username-suffix" style={{ fontSize: 13, color: "#6b7280", paddingBottom: 10 }}>.kar.bg</span>
              </div>
              {errors.username && <span style={styles.errorText}>{errors.username}</span>}
            </div>

            <div className="business-grid-2" style={styles.grid2}>
              <div style={styles.formRow}>
                <label style={styles.label}>Парола *</label>
                <input
                  style={{ ...styles.input, borderColor: errors.password ? "#fca5a5" : "#e2e8f0" }}
                  type="password"
                  name="password"
                  placeholder="Въведи парола"
                  value={formData.password}
                  onChange={handleChange}
                />
                {errors.password && <span style={styles.errorText}>{errors.password}</span>}
              </div>

              <div style={styles.formRow}>
                <label style={styles.label}>Потвърди парола *</label>
                <input
                  style={{ ...styles.input, borderColor: errors.confirmPassword ? "#fca5a5" : "#e2e8f0" }}
                  type="password"
                  name="confirmPassword"
                  placeholder="Потвърди паролата"
                  value={formData.confirmPassword}
                  onChange={handleChange}
                />
                {errors.confirmPassword && <span style={styles.errorText}>{errors.confirmPassword}</span>}
              </div>
            </div>
            <p style={styles.footNote}>{PASSWORD_POLICY_MESSAGE}</p>
          </div>

          {/* Фирмени данни */}
          <div style={{ ...styles.section }}>
            <h2 style={styles.sectionTitle}>Фирмени данни</h2>

            <div className="business-grid-2" style={styles.grid2}>
              <div style={styles.formRow}>
                <label style={styles.label}>Фирма *</label>
                <input style={{ ...styles.input, borderColor: errors.companyName ? "#fca5a5" : "#e2e8f0" }} type="text" name="companyName" placeholder="Име на фирмата" value={formData.companyName} onChange={handleChange} />
                {errors.companyName && <span style={styles.errorText}>{errors.companyName}</span>}
              </div>

              <div style={styles.formRow}>
                <label style={styles.label}>Адресна регистрация *</label>
                <input style={{ ...styles.input, borderColor: errors.registrationAddress ? "#fca5a5" : "#e2e8f0" }} type="text" name="registrationAddress" placeholder="Адрес на регистрация" value={formData.registrationAddress} onChange={handleChange} />
                {errors.registrationAddress && <span style={styles.errorText}>{errors.registrationAddress}</span>}
              </div>

              <div style={styles.formRow}>
                <label style={styles.label}>МОЛ *</label>
                <input style={{ ...styles.input, borderColor: errors.mol ? "#fca5a5" : "#e2e8f0" }} type="text" name="mol" placeholder="Материално отговорно лице" value={formData.mol} onChange={handleChange} />
                {errors.mol && <span style={styles.errorText}>{errors.mol}</span>}
              </div>

              <div style={styles.formRow}>
                <label style={styles.label}>БУЛСТАТ *</label>
                <input style={{ ...styles.input, borderColor: errors.bulstat ? "#fca5a5" : "#e2e8f0" }} type="text" name="bulstat" placeholder="БУЛСТАТ номер" value={formData.bulstat} onChange={handleChange} />
                {errors.bulstat && <span style={styles.errorText}>{errors.bulstat}</span>}
              </div>
            </div>

            <div style={styles.formRow}>
              <label style={styles.label}>Номер по ДДС</label>
              <input style={styles.input} type="text" name="vatNumber" placeholder="ДДС номер (опционално)" value={formData.vatNumber} onChange={handleChange} />
            </div>
          </div>

          {/* Администратор */}
          <div style={{ marginBottom: 4 }}>
            <h2 style={styles.sectionTitle}>Администратор</h2>

            <div className="business-grid-2" style={styles.grid2}>
              <div style={styles.formRow}>
                <label style={styles.label}>Име и Фамилия *</label>
                <input style={{ ...styles.input, borderColor: errors.adminName ? "#fca5a5" : "#e2e8f0" }} type="text" name="adminName" placeholder="Име и Фамилия" value={formData.adminName} onChange={handleChange} />
                {errors.adminName && <span style={styles.errorText}>{errors.adminName}</span>}
              </div>

              <div style={styles.formRow}>
                <label style={styles.label}>Мобилен телефон *</label>
                <input style={{ ...styles.input, borderColor: errors.adminPhone ? "#fca5a5" : "#e2e8f0" }} type="tel" name="adminPhone" placeholder="+359 88 123 4567" value={formData.adminPhone} onChange={handleChange} />
                {errors.adminPhone && <span style={styles.errorText}>{errors.adminPhone}</span>}
              </div>
            </div>
          </div>

          <div style={styles.submitRow} className="business-submit-row">
            <button type="submit" className="business-primary-btn" style={styles.primaryButton}>{loading ? "Създавам..." : "Създай профил"}</button>
            <button type="button" onClick={() => { setFormData({ dealerName: "", city: "", address: "", phone: "", email: "", website: "", username: "", password: "", confirmPassword: "", companyName: "", registrationAddress: "", mol: "", bulstat: "", vatNumber: "", adminName: "", adminPhone: "", description: "" }); setErrors({}); }} className="business-ghost-btn" style={styles.ghostButton}>Изчисти</button>
            <p className="business-required-note" style={{ ...styles.smallNote, marginLeft: 8 }}>* Задължителни полета</p>
          </div>
        </form>
      </div>
    </div>
  );
};

export default BusinessProfilePage;
