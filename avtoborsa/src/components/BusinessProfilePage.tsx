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
        const response = await fetch("http://localhost:8000/api/auth/register/business/", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            dealer_name: formData.dealerName,
            city: formData.city,
            address: formData.address,
            phone: formData.phone,
            email: formData.email,
            website: formData.website,
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
          }),
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
    page: { minHeight: "100vh", background: "#f5f5f5", width: "100%", overflow: "visible", boxSizing: "border-box" },
    container: { width: "100%", maxWidth: 600, margin: "0 auto", padding: "20px", boxSizing: "border-box" },
    form: { width: "100%", background: "#fff", borderRadius: 8, padding: 24, boxShadow: "0 2px 8px rgba(0,0,0,0.08)", boxSizing: "border-box" },
    title: { fontSize: 28, fontWeight: 700, color: "#333", marginBottom: 8, margin: 0 },
    subtitle: { fontSize: 14, color: "#666", marginBottom: 24, margin: 0 },
    formGroup: { display: "flex", flexDirection: "column", gap: 6, marginBottom: 16 },
    label: { fontSize: 13, fontWeight: 500, color: "#555" },
    input: { padding: "12px 14px", border: "1px solid #ccc", borderRadius: 6, fontSize: 14, fontFamily: "inherit", width: "100%", boxSizing: "border-box" },
    button: { padding: "12px 24px", background: "#0066cc", color: "#fff", border: "none", borderRadius: 6, fontSize: 14, fontWeight: 600, cursor: "pointer", width: "100%", boxSizing: "border-box" },
    note: { fontSize: 12, color: "#666", marginTop: 8, fontStyle: "italic" },
  };

  return (
    <div style={styles.page}>
      <style>{`
        /* Tablet (768px - 1023px) */
        @media (min-width: 768px) and (max-width: 1023px) {
          .business-container { padding: 16px !important; }
          .business-form { padding: 20px !important; }
          .business-form h1 { font-size: 24px !important; }
        }

        /* Mobile Large (640px - 767px) */
        @media (min-width: 640px) and (max-width: 767px) {
          .business-container { padding: 12px !important; }
          .business-form { padding: 16px !important; }
          .business-form h1 { font-size: 22px !important; }
          .business-form p { font-size: 13px !important; }
        }

        /* Mobile Small (< 640px) */
        @media (max-width: 639px) {
          .business-container { padding: 8px !important; }
          .business-form { padding: 12px !important; }
          .business-form h1 { font-size: 20px !important; margin-bottom: 6px !important; }
          .business-form p { font-size: 12px !important; }
          .business-form label { font-size: 12px !important; }
          .business-form input { font-size: 13px !important; padding: 10px 12px !important; }
          .business-form button { font-size: 13px !important; padding: 10px 16px !important; }
        }
      `}</style>
      <div style={styles.container} className="business-container">
        <form style={styles.form} className="business-form" onSubmit={handleSubmit}>
          <h1 style={styles.title}>Бизнес профил</h1>
          <p style={styles.subtitle}>Попълни информацията на твоя бизнес</p>

          {/* Име и контакти */}
          <div style={{ marginBottom: 24, paddingBottom: 20, borderBottom: "1px solid #e0e0e0" }}>
            <h2 style={{ fontSize: 16, fontWeight: 600, color: "#333", marginBottom: 16 }}>Име и контакти</h2>

            <div style={styles.formGroup}>
              <label style={styles.label}>Име на дилъра *</label>
              <input
                style={{
                  ...styles.input,
                  borderColor: errors.dealerName ? "#d32f2f" : "#ccc",
                }}
                type="text"
                name="dealerName"
                placeholder="Име на дилъра"
                value={formData.dealerName}
                onChange={handleChange}
              />
              {errors.dealerName && (
                <span style={{ fontSize: 12, color: "#d32f2f", marginTop: 4 }}>
                  {errors.dealerName}
                </span>
              )}
            </div>

            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16, marginBottom: 16 }}>
              <div style={styles.formGroup}>
                <label style={styles.label}>Местоположение *</label>
                <select
                  style={{
                    ...styles.input,
                    borderColor: errors.city ? "#d32f2f" : "#ccc",
                  }}
                  name="city"
                  value={formData.city}
                  onChange={handleChange}
                >
                  <option value="">Избери град</option>
                  {CITIES.map((city) => (
                    <option key={city} value={city}>
                      {city}
                    </option>
                  ))}
                </select>
                {errors.city && (
                  <span style={{ fontSize: 12, color: "#d32f2f", marginTop: 4 }}>
                    {errors.city}
                  </span>
                )}
              </div>
            </div>

            <div style={styles.formGroup}>
              <label style={styles.label}>Адрес *</label>
              <input
                style={{
                  ...styles.input,
                  borderColor: errors.address ? "#d32f2f" : "#ccc",
                }}
                type="text"
                name="address"
                placeholder="Град, улица, номер"
                value={formData.address}
                onChange={handleChange}
              />
              {errors.address && (
                <span style={{ fontSize: 12, color: "#d32f2f", marginTop: 4 }}>
                  {errors.address}
                </span>
              )}
            </div>

            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 }}>
              <div style={styles.formGroup}>
                <label style={styles.label}>Телефон *</label>
                <input
                  style={{
                    ...styles.input,
                    borderColor: errors.phone ? "#d32f2f" : "#ccc",
                  }}
                  type="tel"
                  name="phone"
                  placeholder="+359 88 123 4567"
                  value={formData.phone}
                  onChange={handleChange}
                />
                {errors.phone && (
                  <span style={{ fontSize: 12, color: "#d32f2f", marginTop: 4 }}>
                    {errors.phone}
                  </span>
                )}
              </div>

              <div style={styles.formGroup}>
                <label style={styles.label}>Email *</label>
                <input
                  style={{
                    ...styles.input,
                    borderColor: errors.email ? "#d32f2f" : "#ccc",
                  }}
                  type="email"
                  name="email"
                  placeholder="company@email.com"
                  value={formData.email}
                  onChange={handleChange}
                />
                {errors.email && (
                  <span style={{ fontSize: 12, color: "#d32f2f", marginTop: 4 }}>
                    {errors.email}
                  </span>
                )}
              </div>
            </div>

            <div style={styles.formGroup}>
              <label style={styles.label}>Уебсайт</label>
              <input
                style={styles.input}
                type="text"
                name="website"
                placeholder="http://example.com"
                value={formData.website}
                onChange={handleChange}
              />
            </div>
          </div>

          {/* Потребителско име и парола */}
          <div style={{ marginBottom: 24, paddingBottom: 20, borderBottom: "1px solid #e0e0e0" }}>
            <h2 style={{ fontSize: 16, fontWeight: 600, color: "#333", marginBottom: 16 }}>Потребителско име и парола</h2>

            <div style={styles.formGroup}>
              <label style={styles.label}>Потребителско име *</label>
              <div style={{ display: "flex", gap: 8, alignItems: "flex-end" }}>
                <input
                  style={{
                    ...styles.input,
                    borderColor: errors.username ? "#d32f2f" : "#ccc",
                    flex: 1,
                  }}
                  type="text"
                  name="username"
                  placeholder="username"
                  value={formData.username}
                  onChange={handleChange}
                />
                <span style={{ fontSize: 13, color: "#666", whiteSpace: "nowrap", paddingBottom: 12 }}>
                  .mobile.bg
                </span>
              </div>
              {errors.username && (
                <span style={{ fontSize: 12, color: "#d32f2f", marginTop: 4 }}>
                  {errors.username}
                </span>
              )}
            </div>

            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 }}>
              <div style={styles.formGroup}>
                <label style={styles.label}>Парола *</label>
                <input
                  style={{
                    ...styles.input,
                    borderColor: errors.password ? "#d32f2f" : "#ccc",
                  }}
                  type="password"
                  name="password"
                  placeholder="Въведи парола"
                  value={formData.password}
                  onChange={handleChange}
                />
                {errors.password && (
                  <span style={{ fontSize: 12, color: "#d32f2f", marginTop: 4 }}>
                    {errors.password}
                  </span>
                )}
              </div>

              <div style={styles.formGroup}>
                <label style={styles.label}>Потвърди парола *</label>
                <input
                  style={{
                    ...styles.input,
                    borderColor: errors.confirmPassword ? "#d32f2f" : "#ccc",
                  }}
                  type="password"
                  name="confirmPassword"
                  placeholder="Потвърди паролата"
                  value={formData.confirmPassword}
                  onChange={handleChange}
                />
                {errors.confirmPassword && (
                  <span style={{ fontSize: 12, color: "#d32f2f", marginTop: 4 }}>
                    {errors.confirmPassword}
                  </span>
                )}
              </div>
            </div>
          </div>

          {/* Фирмени данни */}
          <div style={{ marginBottom: 24, paddingBottom: 20, borderBottom: "1px solid #e0e0e0" }}>
            <h2 style={{ fontSize: 16, fontWeight: 600, color: "#333", marginBottom: 16 }}>Фирмени данни</h2>

            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 }}>
              <div style={styles.formGroup}>
                <label style={styles.label}>Фирма *</label>
                <input
                  style={{
                    ...styles.input,
                    borderColor: errors.companyName ? "#d32f2f" : "#ccc",
                  }}
                  type="text"
                  name="companyName"
                  placeholder="Име на фирмата"
                  value={formData.companyName}
                  onChange={handleChange}
                />
                {errors.companyName && (
                  <span style={{ fontSize: 12, color: "#d32f2f", marginTop: 4 }}>
                    {errors.companyName}
                  </span>
                )}
              </div>

              <div style={styles.formGroup}>
                <label style={styles.label}>Адресна регистрация *</label>
                <input
                  style={{
                    ...styles.input,
                    borderColor: errors.registrationAddress ? "#d32f2f" : "#ccc",
                  }}
                  type="text"
                  name="registrationAddress"
                  placeholder="Адрес на регистрация"
                  value={formData.registrationAddress}
                  onChange={handleChange}
                />
                {errors.registrationAddress && (
                  <span style={{ fontSize: 12, color: "#d32f2f", marginTop: 4 }}>
                    {errors.registrationAddress}
                  </span>
                )}
              </div>

              <div style={styles.formGroup}>
                <label style={styles.label}>МОЛ *</label>
                <input
                  style={{
                    ...styles.input,
                    borderColor: errors.mol ? "#d32f2f" : "#ccc",
                  }}
                  type="text"
                  name="mol"
                  placeholder="Материално отговорно лице"
                  value={formData.mol}
                  onChange={handleChange}
                />
                {errors.mol && (
                  <span style={{ fontSize: 12, color: "#d32f2f", marginTop: 4 }}>
                    {errors.mol}
                  </span>
                )}
              </div>

              <div style={styles.formGroup}>
                <label style={styles.label}>БУЛСТАТ *</label>
                <input
                  style={{
                    ...styles.input,
                    borderColor: errors.bulstat ? "#d32f2f" : "#ccc",
                  }}
                  type="text"
                  name="bulstat"
                  placeholder="БУЛСТАТ номер"
                  value={formData.bulstat}
                  onChange={handleChange}
                />
                {errors.bulstat && (
                  <span style={{ fontSize: 12, color: "#d32f2f", marginTop: 4 }}>
                    {errors.bulstat}
                  </span>
                )}
              </div>
            </div>

            <div style={styles.formGroup}>
              <label style={styles.label}>Номер по ДДС</label>
              <input
                style={styles.input}
                type="text"
                name="vatNumber"
                placeholder="ДДС номер (опционално)"
                value={formData.vatNumber}
                onChange={handleChange}
              />
            </div>
          </div>

          {/* Администратор */}
          <div style={{ marginBottom: 24 }}>
            <h2 style={{ fontSize: 16, fontWeight: 600, color: "#333", marginBottom: 16 }}>Администратор</h2>

            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 }}>
              <div style={styles.formGroup}>
                <label style={styles.label}>Име и Фамилия *</label>
                <input
                  style={{
                    ...styles.input,
                    borderColor: errors.adminName ? "#d32f2f" : "#ccc",
                  }}
                  type="text"
                  name="adminName"
                  placeholder="Име и Фамилия"
                  value={formData.adminName}
                  onChange={handleChange}
                />
                {errors.adminName && (
                  <span style={{ fontSize: 12, color: "#d32f2f", marginTop: 4 }}>
                    {errors.adminName}
                  </span>
                )}
              </div>

              <div style={styles.formGroup}>
                <label style={styles.label}>Мобилен телефон *</label>
                <input
                  style={{
                    ...styles.input,
                    borderColor: errors.adminPhone ? "#d32f2f" : "#ccc",
                  }}
                  type="tel"
                  name="adminPhone"
                  placeholder="+359 88 123 4567"
                  value={formData.adminPhone}
                  onChange={handleChange}
                />
                {errors.adminPhone && (
                  <span style={{ fontSize: 12, color: "#d32f2f", marginTop: 4 }}>
                    {errors.adminPhone}
                  </span>
                )}
              </div>
            </div>
          </div>

          <button style={styles.button} type="submit">
            Създай профил
          </button>
          <p style={styles.note}>* Задължителни полета</p>
        </form>
      </div>
    </div>
  );
};

export default BusinessProfilePage;

