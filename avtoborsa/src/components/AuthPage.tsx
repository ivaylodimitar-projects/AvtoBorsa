import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import Navbar from "./Navbar";

const AuthPage: React.FC = () => {
  const navigate = useNavigate();
  const [isLogin, setIsLogin] = useState(true);
  const [formData, setFormData] = useState({
    email: "",
    password: "",
  });

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (isLogin) {
      alert("Влизане успешно! (Демо режим)");
    } else {
      alert("Регистрация успешна! (Демо режим)");
    }
    navigate("/");
  };

  const styles: Record<string, React.CSSProperties> = {
    page: { minHeight: "100vh", background: "#f5f5f5", width: "100%", overflow: "visible", boxSizing: "border-box" },
    container: { width: "100%", maxWidth: 500, margin: "0 auto", padding: "20px", boxSizing: "border-box" },
    form: { width: "100%", background: "#fff", borderRadius: 8, padding: 32, boxShadow: "0 2px 8px rgba(0,0,0,0.08)", boxSizing: "border-box" },
    title: { fontSize: 28, fontWeight: 700, color: "#333", marginBottom: 8, textAlign: "center" as const, margin: 0 },
    subtitle: { fontSize: 14, color: "#666", marginBottom: 24, textAlign: "center" as const, margin: 0 },
    formGroup: { display: "flex", flexDirection: "column", gap: 6, marginBottom: 16 },
    label: { fontSize: 13, fontWeight: 500, color: "#555" },
    input: { padding: "12px 14px", border: "1px solid #ccc", borderRadius: 6, fontSize: 14, fontFamily: "inherit", width: "100%", boxSizing: "border-box" },
    button: { padding: "12px 24px", background: "#0066cc", color: "#fff", border: "none", borderRadius: 6, fontSize: 14, fontWeight: 600, cursor: "pointer", width: "100%", marginTop: 8, boxSizing: "border-box" },
    toggleContainer: { textAlign: "center" as const, marginTop: 20, paddingTop: 20, borderTop: "1px solid #e0e0e0" },
    toggleText: { fontSize: 14, color: "#666", marginBottom: 12, margin: 0 },
    toggleButton: { background: "none", border: "none", color: "#0066cc", cursor: "pointer", fontWeight: 600, fontSize: 14, textDecoration: "underline" },
  };

  return (
    <div style={styles.page}>
      <style>{`
        /* Tablet (768px - 1023px) */
        @media (min-width: 768px) and (max-width: 1023px) {
          .auth-container { padding: 16px !important; }
          .auth-form { padding: 24px !important; }
          .auth-form h1 { font-size: 24px !important; }
        }

        /* Mobile Large (640px - 767px) */
        @media (min-width: 640px) and (max-width: 767px) {
          .auth-container { padding: 12px !important; }
          .auth-form { padding: 20px !important; }
          .auth-form h1 { font-size: 22px !important; }
          .auth-form p { font-size: 13px !important; }
        }

        /* Mobile Small (< 640px) */
        @media (max-width: 639px) {
          .auth-container { padding: 8px !important; }
          .auth-form { padding: 16px !important; }
          .auth-form h1 { font-size: 20px !important; margin-bottom: 6px !important; }
          .auth-form p { font-size: 12px !important; }
          .auth-form label { font-size: 12px !important; }
          .auth-form input { font-size: 13px !important; padding: 10px 12px !important; }
          .auth-form button { font-size: 13px !important; padding: 10px 16px !important; }
        }
      `}</style>
      <Navbar />
      <div style={styles.container} className="auth-container">
        <form style={styles.form} className="auth-form" onSubmit={handleSubmit}>
          <h1 style={styles.title}>{isLogin ? "Влизане" : "Регистрация"}</h1>
          <p style={styles.subtitle}>
            {isLogin ? "Влез в твоя профил" : "Създай нов профил"}
          </p>

          <div style={styles.formGroup}>
            <label style={styles.label}>Email *</label>
            <input
              style={styles.input}
              type="email"
              name="email"
              placeholder="your@email.com"
              value={formData.email}
              onChange={handleChange}
              required
            />
          </div>

          <div style={styles.formGroup}>
            <label style={styles.label}>Парола *</label>
            <input
              style={styles.input}
              type="password"
              name="password"
              placeholder="Твоята парола"
              value={formData.password}
              onChange={handleChange}
              required
            />
          </div>

          <button style={styles.button} type="submit">
            {isLogin ? "Влизане" : "Регистрация"}
          </button>

          <div style={styles.toggleContainer}>
            <p style={styles.toggleText}>
              {isLogin ? "Нямаш профил?" : "Вече имаш профил?"}
            </p>
            <button
              type="button"
              style={styles.toggleButton}
              onClick={() => {
                setIsLogin(!isLogin);
                setFormData({ email: "", password: "" });
              }}
            >
              {isLogin ? "Създай профил" : "Влизане"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default AuthPage;

