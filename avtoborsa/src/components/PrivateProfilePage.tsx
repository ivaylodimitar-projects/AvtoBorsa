import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";

const PrivateProfilePage: React.FC = () => {
  const navigate = useNavigate();
  const { setUserFromToken } = useAuth();
  const [formData, setFormData] = useState({
    email: "",
    password: "",
    confirmPassword: "",
  });

  const [errors, setErrors] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(false);
  const [successMessage, setSuccessMessage] = useState("");

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
    // Clear error for this field when user starts typing
    if (errors[name]) {
      setErrors((prev) => ({ ...prev, [name]: "" }));
    }
  };

  const validateForm = (): boolean => {
    const newErrors: Record<string, string> = {};

    if (!formData.email.trim()) {
      newErrors.email = "Email е задължителен";
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email)) {
      newErrors.email = "Невалиден email адрес";
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

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (validateForm()) {
      setLoading(true);
      try {
        const response = await fetch("http://localhost:8000/api/auth/register/private/", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            email: formData.email,
            password: formData.password,
            confirm_password: formData.confirmPassword,
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
        .registration-container {
          max-width: 980px;
          margin: 0 auto;
          padding: 20px;
        }

        .registration-title {
          font-size: 28px;
          font-weight: 700;
          color: #333;
          margin-bottom: 8px;
        }

        .registration-subtitle {
          font-size: 14px;
          color: #666;
          margin-bottom: 20px;
        }

        .form-section {
          background: #fff;
          border: 1px solid #ddd;
          border-radius: 4px;
          padding: 20px;
          margin-bottom: 20px;
          box-shadow: 0 1px 3px rgba(0,0,0,0.08);
        }

        .section-title {
          font-size: 16px;
          font-weight: 700;
          color: #333;
          margin-bottom: 8px;
          display: block;
        }

        .section-subtitle {
          font-size: 13px;
          color: #666;
          margin-bottom: 16px;
          display: block;
        }

        .form-group {
          margin-bottom: 16px;
        }

        .form-label {
          font-size: 13px;
          font-weight: 500;
          color: #0066cc;
          margin-bottom: 6px;
          display: block;
        }

        .form-input {
          width: 100%;
          padding: 10px 12px;
          border: 1px solid #ccc;
          border-radius: 4px;
          font-size: 13px;
          font-family: inherit;
          box-sizing: border-box;
        }

        .form-input.error {
          border-color: #d32f2f;
        }

        .error-message {
          font-size: 12px;
          color: #d32f2f;
          margin-top: 4px;
          display: block;
        }

        .form-note {
          font-size: 12px;
          color: #666;
          margin-top: 6px;
        }

        .submit-button {
          background: #0066cc;
          color: #fff;
          border: none;
          padding: 12px 24px;
          border-radius: 4px;
          font-size: 14px;
          font-weight: 600;
          cursor: pointer;
          width: 100%;
          transition: background 0.3s ease;
        }

        .submit-button:hover {
          background: #0052a3;
        }

        .submit-button:disabled {
          background: #ccc;
          cursor: not-allowed;
        }

        /* Tablet (768px - 1023px) */
        @media (min-width: 768px) and (max-width: 1023px) {
          .registration-container { padding: 16px !important; }
          .registration-title { font-size: 24px !important; }
        }

        /* Mobile Large (640px - 767px) */
        @media (min-width: 640px) and (max-width: 767px) {
          .registration-container { padding: 12px !important; }
          .form-section { padding: 16px !important; }
          .registration-title { font-size: 22px !important; }
          .registration-subtitle { font-size: 13px !important; }
        }

        /* Mobile Small (< 640px) */
        @media (max-width: 639px) {
          .registration-container { padding: 8px !important; }
          .form-section { padding: 12px !important; margin-bottom: 12px !important; }
          .registration-title { font-size: 20px !important; margin-bottom: 6px !important; }
          .registration-subtitle { font-size: 12px !important; margin-bottom: 12px !important; }
          .section-title { font-size: 14px !important; }
          .section-subtitle { font-size: 12px !important; }
          .form-label { font-size: 12px !important; }
          .form-input { font-size: 13px !important; padding: 8px 10px !important; }
          .submit-button { font-size: 13px !important; padding: 10px 16px !important; }
        }
      `}</style>
      <div className="registration-container">
        <h1 className="registration-title">Регистрация в AvtoBorsa</h1>
        <p className="registration-subtitle">Създай профил, за да публикуваш обяви</p>

        <form onSubmit={handleSubmit}>
          {/* Потребителско име и парола */}
          <div className="form-section">
            <span className="section-title">Потребителско име и парола</span>
            <span className="section-subtitle">Данни за вход в твоя профил</span>

            <div className="form-group">
              <label className="form-label">Email *</label>
              <input
                className={`form-input ${errors.email ? "error" : ""}`}
                type="email"
                name="email"
                placeholder="your@email.com"
                value={formData.email}
                onChange={handleChange}
              />
              {errors.email && (
                <span className="error-message">{errors.email}</span>
              )}
            </div>

            <div className="form-group">
              <label className="form-label">Парола *</label>
              <input
                className={`form-input ${errors.password ? "error" : ""}`}
                type="password"
                name="password"
                placeholder="Въведи парола"
                value={formData.password}
                onChange={handleChange}
              />
              {errors.password && (
                <span className="error-message">{errors.password}</span>
              )}
              <span className="form-note">Паролата трябва да е поне 6 символа</span>
            </div>

            <div className="form-group">
              <label className="form-label">Потвърди парола *</label>
              <input
                className={`form-input ${errors.confirmPassword ? "error" : ""}`}
                type="password"
                name="confirmPassword"
                placeholder="Потвърди паролата"
                value={formData.confirmPassword}
                onChange={handleChange}
              />
              {errors.confirmPassword && (
                <span className="error-message">{errors.confirmPassword}</span>
              )}
            </div>
          </div>

          <button className="submit-button" type="submit">
            Създай профил
          </button>
        </form>
      </div>
    </div>
  );
};

export default PrivateProfilePage;

