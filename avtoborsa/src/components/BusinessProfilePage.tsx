import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";

const CITIES = [
  "София", "Пловдив", "Варна", "Бургас", "Русе", "Стара Загора", "Плевен",
  "Сливен", "Добрич", "Шумен", "Перник", "Дупница", "Монтана", "Ловеч",
  "Велико Търново", "Габрово", "Разград", "Видин", "Враца", "Кюстендил",
  "Пазарджик", "Благоевград", "Кърджали", "Смолян", "Хасково", "Ямбол",
  "Силистра", "Търговище", "Извън страната"
];

const BusinessProfilePage: React.FC = () => {
  const navigate = useNavigate();
  const { setUserFromToken } = useAuth();
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
    } else if (formData.password.length < 6) {
      newErrors.password = "Паролата трябва да е поне 6 символа";
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
          email: formData.email,
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

        const response = await fetch("http://localhost:8000/api/auth/register/business/", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify(payloadData),
        });

        if (response.ok) {
          const data = await response.json();
          setSuccessMessage(data.message);
          // Store the auth token and set user
          if (data.token && data.user) {
            setUserFromToken(data.user, data.token);
          }
          alert(data.message);
          navigate("/");
        } else {
          const errorData = await response.json();
          console.error("Backend error response:", errorData);
          setErrors(errorData);
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
    page: { minHeight: "100vh", background: "#f7f7f7", width: "100%", boxSizing: "border-box" },
    container: { maxWidth: 1100, margin: "0 auto", padding: "32px 20px", boxSizing: "border-box" },
    header: {
      background: "linear-gradient(135deg, #667eea 0%, #4f5f89 100%)",
      padding: "28px",
      borderRadius: 14,
      marginBottom: 28,
      color: "#fff",
      boxShadow: "0 6px 20px rgba(79,95,137,0.12)",
      display: "flex",
      alignItems: "center",
      justifyContent: "space-between",
      gap: 16,
      flexWrap: "wrap",
    },
    headerLeft: { display: "flex", gap: 16, alignItems: "center" },
    headerTitle: { fontSize: 26, fontWeight: 800, margin: 0 },
    headerSubtitle: { fontSize: 14, margin: 0, opacity: 0.95 },
    formCard: { width: "100%", background: "#fff", borderRadius: 12, padding: 20, boxShadow: "0 6px 18px rgba(15,23,42,0.06)", boxSizing: "border-box" },
    section: { marginBottom: 20, paddingBottom: 18, borderBottom: "1px solid #eef2f7" },
    sectionTitle: { fontSize: 15, fontWeight: 700, color: "#111827", marginBottom: 12 },
    grid2: { display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14 },
    gridResponsive: { display: "grid", gridTemplateColumns: "1fr", gap: 12 },
    formRow: { display: "flex", flexDirection: "column", gap: 8, marginBottom: 12 },
    label: { fontSize: 13, fontWeight: 600, color: "#374151" },
    input: { padding: "12px 14px", border: "1px solid #e6e9ef", borderRadius: 10, fontSize: 14, width: "100%", boxSizing: "border-box", outline: "none", transition: "box-shadow 0.15s, border-color 0.15s", background: "#fff", color: "#111827" },
    errorText: { fontSize: 12, color: "#ef4444", marginTop: 6 },
    footNote: { fontSize: 12, color: "#6b7280", marginTop: 10 },
    submitRow: { display: "flex", gap: 12, marginTop: 14, alignItems: "center", flexWrap: "wrap" },
    primaryButton: { padding: "12px 22px", background: "linear-gradient(135deg,#667eea 0%,#4f5f89 100%)", color: "#fff", border: "none", borderRadius: 10, fontSize: 15, fontWeight: 700, cursor: "pointer", boxShadow: "0 8px 24px rgba(102,126,234,0.18)" },
    ghostButton: { padding: "10px 18px", background: "transparent", border: "1px solid #e6e9ef", borderRadius: 10, fontSize: 14, cursor: "pointer", color: "#374151" },
    smallNote: { fontSize: 12, color: "#9ca3af" },
    // responsive tweaks via inline <style> below
  };

  return (
    <div style={styles.page}>
      <style>{`
        @media (max-width: 768px) {
          .business-grid-2 { grid-template-columns: 1fr !important; }
          .business-header { padding: 20px !important; }
          .business-container { padding: 20px 12px !important; }
        }
      `}</style>

      <div style={styles.container} className="business-container">
        <div style={styles.header} className="business-header">
          <div style={styles.headerLeft}>
            <div style={{ width: 56, height: 56, borderRadius: 12, background: "rgba(255,255,255,0.12)", display: "flex", alignItems: "center", justifyContent: "center", fontWeight: 800, fontSize: 22 }}>Б</div>
            <div>
              <h1 style={styles.headerTitle}>Бизнес профил</h1>
              <p style={styles.headerSubtitle}>Попълни информацията на твоя бизнес. Всички полета остават непроменени — само изгледът е обновен.</p>
            </div>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="business-form" style={styles.formCard}>
          {/* Име и контакти */}
          <div style={{ ...styles.section }}>
            <h2 style={styles.sectionTitle}>Име и контакти</h2>

            <div style={styles.formRow}>
              <label style={styles.label}>Име на дилъра *</label>
              <input
                style={{ ...styles.input, borderColor: errors.dealerName ? "#fca5a5" : "#e6e9ef" }}
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
                  style={{ ...styles.input, borderColor: errors.city ? "#fca5a5" : "#e6e9ef" }}
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
                  style={{ ...styles.input, borderColor: errors.address ? "#fca5a5" : "#e6e9ef" }}
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
                  style={{ ...styles.input, borderColor: errors.phone ? "#fca5a5" : "#e6e9ef" }}
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
                  style={{ ...styles.input, borderColor: errors.email ? "#fca5a5" : "#e6e9ef" }}
                  type="email"
                  name="email"
                  placeholder="company@email.com"
                  value={formData.email}
                  onChange={handleChange}
                />
                {errors.email && <span style={styles.errorText}>{errors.email}</span>}
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
              <div style={{ display: "flex", gap: 8, alignItems: "flex-end" }}>
                <input
                  style={{ ...styles.input, borderColor: errors.username ? "#fca5a5" : "#e6e9ef", flex: 1 }}
                  type="text"
                  name="username"
                  placeholder="username"
                  value={formData.username}
                  onChange={handleChange}
                />
                <span style={{ fontSize: 13, color: "#6b7280", paddingBottom: 10 }}>.mobile.bg</span>
              </div>
              {errors.username && <span style={styles.errorText}>{errors.username}</span>}
            </div>

            <div className="business-grid-2" style={styles.grid2}>
              <div style={styles.formRow}>
                <label style={styles.label}>Парола *</label>
                <input
                  style={{ ...styles.input, borderColor: errors.password ? "#fca5a5" : "#e6e9ef" }}
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
                  style={{ ...styles.input, borderColor: errors.confirmPassword ? "#fca5a5" : "#e6e9ef" }}
                  type="password"
                  name="confirmPassword"
                  placeholder="Потвърди паролата"
                  value={formData.confirmPassword}
                  onChange={handleChange}
                />
                {errors.confirmPassword && <span style={styles.errorText}>{errors.confirmPassword}</span>}
              </div>
            </div>
          </div>

          {/* Фирмени данни */}
          <div style={{ ...styles.section }}>
            <h2 style={styles.sectionTitle}>Фирмени данни</h2>

            <div className="business-grid-2" style={styles.grid2}>
              <div style={styles.formRow}>
                <label style={styles.label}>Фирма *</label>
                <input style={{ ...styles.input, borderColor: errors.companyName ? "#fca5a5" : "#e6e9ef" }} type="text" name="companyName" placeholder="Име на фирмата" value={formData.companyName} onChange={handleChange} />
                {errors.companyName && <span style={styles.errorText}>{errors.companyName}</span>}
              </div>

              <div style={styles.formRow}>
                <label style={styles.label}>Адресна регистрация *</label>
                <input style={{ ...styles.input, borderColor: errors.registrationAddress ? "#fca5a5" : "#e6e9ef" }} type="text" name="registrationAddress" placeholder="Адрес на регистрация" value={formData.registrationAddress} onChange={handleChange} />
                {errors.registrationAddress && <span style={styles.errorText}>{errors.registrationAddress}</span>}
              </div>

              <div style={styles.formRow}>
                <label style={styles.label}>МОЛ *</label>
                <input style={{ ...styles.input, borderColor: errors.mol ? "#fca5a5" : "#e6e9ef" }} type="text" name="mol" placeholder="Материално отговорно лице" value={formData.mol} onChange={handleChange} />
                {errors.mol && <span style={styles.errorText}>{errors.mol}</span>}
              </div>

              <div style={styles.formRow}>
                <label style={styles.label}>БУЛСТАТ *</label>
                <input style={{ ...styles.input, borderColor: errors.bulstat ? "#fca5a5" : "#e6e9ef" }} type="text" name="bulstat" placeholder="БУЛСТАТ номер" value={formData.bulstat} onChange={handleChange} />
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
                <input style={{ ...styles.input, borderColor: errors.adminName ? "#fca5a5" : "#e6e9ef" }} type="text" name="adminName" placeholder="Име и Фамилия" value={formData.adminName} onChange={handleChange} />
                {errors.adminName && <span style={styles.errorText}>{errors.adminName}</span>}
              </div>

              <div style={styles.formRow}>
                <label style={styles.label}>Мобилен телефон *</label>
                <input style={{ ...styles.input, borderColor: errors.adminPhone ? "#fca5a5" : "#e6e9ef" }} type="tel" name="adminPhone" placeholder="+359 88 123 4567" value={formData.adminPhone} onChange={handleChange} />
                {errors.adminPhone && <span style={styles.errorText}>{errors.adminPhone}</span>}
              </div>
            </div>
          </div>

          <div style={styles.submitRow}>
            <button type="submit" style={styles.primaryButton}>{loading ? "Създавам..." : "Създай профил"}</button>
            <button type="button" onClick={() => { setFormData({ dealerName: "", city: "", address: "", phone: "", email: "", website: "", username: "", password: "", confirmPassword: "", companyName: "", registrationAddress: "", mol: "", bulstat: "", vatNumber: "", adminName: "", adminPhone: "", description: "" }); setErrors({}); }} style={styles.ghostButton}>Изчисти</button>
            <p style={{ ...styles.smallNote, marginLeft: 8 }}>* Задължителни полета</p>
          </div>
        </form>
      </div>
    </div>
  );
};

export default BusinessProfilePage;

