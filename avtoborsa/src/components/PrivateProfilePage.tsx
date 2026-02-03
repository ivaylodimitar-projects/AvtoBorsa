import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import Navbar from "./Navbar";

const PrivateProfilePage: React.FC = () => {
  const navigate = useNavigate();
  const [formData, setFormData] = useState({
    name: "",
    email: "",
    phone: "",
  });

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    alert("Профилът е създаден успешно! (Демо режим)");
    navigate("/");
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
          .profile-container { padding: 16px !important; }
          .profile-form { padding: 20px !important; }
          .profile-form h1 { font-size: 24px !important; }
        }

        /* Mobile Large (640px - 767px) */
        @media (min-width: 640px) and (max-width: 767px) {
          .profile-container { padding: 12px !important; }
          .profile-form { padding: 16px !important; }
          .profile-form h1 { font-size: 22px !important; }
          .profile-form p { font-size: 13px !important; }
        }

        /* Mobile Small (< 640px) */
        @media (max-width: 639px) {
          .profile-container { padding: 8px !important; }
          .profile-form { padding: 12px !important; }
          .profile-form h1 { font-size: 20px !important; margin-bottom: 6px !important; }
          .profile-form p { font-size: 12px !important; }
          .profile-form label { font-size: 12px !important; }
          .profile-form input { font-size: 13px !important; padding: 10px 12px !important; }
          .profile-form button { font-size: 13px !important; padding: 10px 16px !important; }
        }
      `}</style>
      <Navbar />
      <div style={styles.container} className="profile-container">
        <form style={styles.form} className="profile-form" onSubmit={handleSubmit}>
          <h1 style={styles.title}>Частен профил</h1>
          <p style={styles.subtitle}>Попълни информацията си, за да създадеш профил</p>

          <div style={styles.formGroup}>
            <label style={styles.label}>Име *</label>
            <input
              style={styles.input}
              type="text"
              name="name"
              placeholder="Твоето име"
              value={formData.name}
              onChange={handleChange}
              required
            />
          </div>

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
            <label style={styles.label}>Телефон *</label>
            <input
              style={styles.input}
              type="tel"
              name="phone"
              placeholder="+359 88 123 4567"
              value={formData.phone}
              onChange={handleChange}
              required
            />
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

export default PrivateProfilePage;

