import React from "react";
import { useNavigate } from "react-router-dom";
import Navbar from "./Navbar";

const ProfileTypePage: React.FC = () => {
  const navigate = useNavigate();

  const styles: Record<string, React.CSSProperties> = {
    page: { minHeight: "100vh", background: "#f5f5f5", width: "100%", overflow: "visible", boxSizing: "border-box" },
    container: { width: "100%", maxWidth: 1200, margin: "0 auto", padding: "20px", boxSizing: "border-box" },
    header: { textAlign: "center", marginBottom: 40 },
    title: { fontSize: 32, fontWeight: 700, color: "#333", marginBottom: 12, margin: 0 },
    subtitle: { fontSize: 16, color: "#666", marginBottom: 30, margin: 0 },
    cardsContainer: { display: "grid", gridTemplateColumns: "repeat(2, 1fr)", gap: 24 },
    card: {
      background: "#fff",
      borderRadius: 12,
      padding: 32,
      boxShadow: "0 2px 8px rgba(0,0,0,0.08)",
      cursor: "pointer",
      transition: "all 0.3s ease",
      textAlign: "center",
      border: "2px solid transparent",
    },
    cardHover: {
      boxShadow: "0 8px 24px rgba(0,0,0,0.12)",
      borderColor: "#0066cc",
    },
    cardIcon: { fontSize: 48, marginBottom: 16 },
    cardTitle: { fontSize: 24, fontWeight: 700, color: "#333", marginBottom: 12, margin: 0 },
    cardDescription: { fontSize: 14, color: "#666", lineHeight: 1.6, marginBottom: 20, margin: 0 },
    cardButton: {
      padding: "12px 24px",
      background: "#0066cc",
      color: "#fff",
      border: "none",
      borderRadius: 6,
      fontSize: 14,
      fontWeight: 600,
      cursor: "pointer",
      width: "100%",
      boxSizing: "border-box",
    },
  };

  const [hoveredCard, setHoveredCard] = React.useState<string | null>(null);

  return (
    <div style={styles.page}>
      <Navbar />
      <style>{`
        /* Tablet Large (1024px - 1200px) */
        @media (min-width: 1024px) and (max-width: 1200px) {
          .profile-type-container { padding: 16px !important; }
          .profile-type-header h1 { font-size: 28px !important; }
        }

        /* Tablet (768px - 1023px) */
        @media (min-width: 768px) and (max-width: 1023px) {
          .profile-type-container { padding: 16px !important; }
          .profile-cards { grid-template-columns: 1fr !important; }
          .profile-type-header h1 { font-size: 26px !important; }
          .profile-type-header p { font-size: 14px !important; }
          .profile-type-header { margin-bottom: 30px !important; }
        }

        /* Mobile Large (640px - 767px) */
        @media (min-width: 640px) and (max-width: 767px) {
          .profile-type-container { padding: 12px !important; }
          .profile-cards { grid-template-columns: 1fr !important; gap: 16px !important; }
          .profile-type-header h1 { font-size: 24px !important; margin-bottom: 8px !important; }
          .profile-type-header p { font-size: 13px !important; margin-bottom: 20px !important; }
          .profile-type-header { margin-bottom: 20px !important; }
          .profile-type-buttons { flex-direction: column !important; gap: 8px !important; }
          .profile-type-buttons button { width: 100%; font-size: 13px !important; padding: 8px 16px !important; }
          .profile-card { padding: 20px !important; }
          .profile-card-icon { font-size: 40px !important; }
          .profile-card-title { font-size: 20px !important; }
          .profile-card-desc { font-size: 13px !important; }
          .profile-card-btn { font-size: 12px !important; padding: 10px 16px !important; }
        }

        /* Mobile Small (< 640px) */
        @media (max-width: 639px) {
          .profile-type-container { padding: 8px !important; }
          .profile-cards { grid-template-columns: 1fr !important; gap: 12px !important; }
          .profile-type-header h1 { font-size: 22px !important; margin-bottom: 6px !important; }
          .profile-type-header p { font-size: 12px !important; margin-bottom: 16px !important; }
          .profile-type-header { margin-bottom: 16px !important; }
          .profile-type-buttons { flex-direction: column !important; gap: 6px !important; }
          .profile-type-buttons button { width: 100%; font-size: 12px !important; padding: 8px 12px !important; }
          .profile-card { padding: 16px !important; }
          .profile-card-icon { font-size: 36px !important; margin-bottom: 12px !important; }
          .profile-card-title { font-size: 18px !important; margin-bottom: 8px !important; }
          .profile-card-desc { font-size: 12px !important; margin-bottom: 16px !important; }
          .profile-card-btn { font-size: 12px !important; padding: 8px 12px !important; }
        }
      `}</style>
      <div style={styles.container} className="profile-type-container">
        <div style={styles.header} className="profile-type-header">
          {/* <h1 style={styles.title}>Профил</h1> */}
          {/* <p style={styles.subtitle}>Избери опция</p> */}
          <div style={{ display: "flex", gap: 12, justifyContent: "center", marginBottom: 30 }} className="profile-type-buttons">
            {/* <button
              onClick={() => navigate("/auth")}
              style={{
                padding: "10px 20px",
                background: "#fff",
                border: "2px solid #0066cc",
                color: "#0066cc",
                borderRadius: 6,
                fontSize: 14,
                fontWeight: 600,
                cursor: "pointer",
              }}
            >
              Влизане
            </button> */}
            {/* <button
              onClick={() => {}}
              style={{
                padding: "10px 20px",
                background: "#0066cc",
                border: "2px solid #0066cc",
                color: "#fff",
                borderRadius: 6,
                fontSize: 14,
                fontWeight: 600,
                cursor: "pointer",
              }}
            >
              Създай профил
            </button> */}
          </div>
        </div>

        <div style={styles.cardsContainer} className="profile-cards">
          {/* Private User Card */}
          <div
            style={{
              ...styles.card,
              ...(hoveredCard === "private" ? styles.cardHover : {}),
            }}
            className="profile-card"
            onMouseEnter={() => setHoveredCard("private")}
            onMouseLeave={() => setHoveredCard(null)}
          >
            <div style={styles.cardIcon} className="profile-card-icon">👤</div>
            <h2 style={styles.cardTitle} className="profile-card-title">Частен профил</h2>
            <p style={styles.cardDescription} className="profile-card-desc">
              За частни лица, които искат да продават или купуват автомобили
            </p>
            <button
              style={styles.cardButton}
              className="profile-card-btn"
              onClick={() => navigate("/profile/private")}
            >
              Продължи
            </button>
          </div>

          {/* Business Card */}
          <div
            style={{
              ...styles.card,
              ...(hoveredCard === "business" ? styles.cardHover : {}),
            }}
            className="profile-card"
            onMouseEnter={() => setHoveredCard("business")}
            onMouseLeave={() => setHoveredCard(null)}
          >
            <div style={styles.cardIcon} className="profile-card-icon">🏢</div>
            <h2 style={styles.cardTitle} className="profile-card-title">Бизнес профил</h2>
            <p style={styles.cardDescription} className="profile-card-desc">
              За автосалони, дилъри и други бизнес субекти
            </p>
            <button
              style={styles.cardButton}
              className="profile-card-btn"
              onClick={() => navigate("/profile/business")}
            >
              Продължи
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ProfileTypePage;

