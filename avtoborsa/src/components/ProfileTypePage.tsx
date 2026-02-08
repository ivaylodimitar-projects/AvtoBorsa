import React from "react";
import { useNavigate } from "react-router-dom";

const ProfileTypePage: React.FC = () => {
  const navigate = useNavigate();
  const [hoveredCard, setHoveredCard] = React.useState<string | null>(null);

  return (
    <div style={styles.page}>
      <style>{`
        .profile-card-interactive {
          transition: transform 0.25s ease, box-shadow 0.25s ease, border-color 0.25s ease;
        }
        .profile-card-interactive:hover {
          transform: translateY(-4px);
          box-shadow: 0 12px 32px rgba(15,23,42,0.12) !important;
        }
        .profile-card-btn {
          transition: background 0.2s ease, box-shadow 0.2s ease;
        }
        .profile-card-btn:hover {
          box-shadow: 0 4px 14px rgba(0,102,204,0.35);
        }
        .profile-card-btn-business:hover {
          box-shadow: 0 4px 14px rgba(102,126,234,0.35);
        }

        /* Tablet (768px - 1023px) */
        @media (min-width: 768px) and (max-width: 1023px) {
          .profile-type-container { padding: 24px 16px !important; }
          .profile-cards-grid { gap: 20px !important; }
          .profile-hero-title { font-size: 26px !important; }
        }

        /* Mobile Large (640px - 767px) */
        @media (min-width: 640px) and (max-width: 767px) {
          .profile-type-container { padding: 20px 12px !important; }
          .profile-cards-grid { grid-template-columns: 1fr !important; gap: 16px !important; }
          .profile-hero { padding: 24px 20px !important; }
          .profile-hero-title { font-size: 24px !important; }
          .profile-hero-subtitle { font-size: 13px !important; }
          .profile-card-body { padding: 24px !important; }
        }

        /* Mobile Small (< 640px) */
        @media (max-width: 639px) {
          .profile-type-container { padding: 16px 8px !important; }
          .profile-cards-grid { grid-template-columns: 1fr !important; gap: 14px !important; }
          .profile-hero { padding: 20px 16px !important; margin-bottom: 20px !important; }
          .profile-hero-title { font-size: 22px !important; }
          .profile-hero-subtitle { font-size: 12px !important; }
          .profile-hero-icon { width: 44px !important; height: 44px !important; font-size: 18px !important; }
          .profile-card-body { padding: 20px !important; }
          .profile-card-icon-wrap { width: 52px !important; height: 52px !important; }
          .profile-card-icon-wrap svg { width: 24px !important; height: 24px !important; }
          .profile-card-title { font-size: 18px !important; }
          .profile-card-desc { font-size: 13px !important; }
          .profile-feature-item { font-size: 12px !important; }
        }
      `}</style>

      <div style={styles.container} className="profile-type-container">
        {/* Hero Header */}
        <div style={styles.hero} className="profile-hero">
          <div style={styles.heroContent}>
            <div style={styles.heroIcon} className="profile-hero-icon">
              <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
                <circle cx="12" cy="7" r="4" />
              </svg>
            </div>
            <div>
              <h1 style={styles.heroTitle} className="profile-hero-title">Избери тип профил</h1>
              <p style={styles.heroSubtitle} className="profile-hero-subtitle">
                Създай акаунт като частно лице или регистрирай бизнес
              </p>
            </div>
          </div>
        </div>

        {/* Cards */}
        <div style={styles.cardsGrid} className="profile-cards-grid">
          {/* Private User Card */}
          <div
            className="profile-card-interactive"
            style={{
              ...styles.card,
              borderColor: hoveredCard === "private" ? "#0066cc" : "#eef2f7",
            }}
            onMouseEnter={() => setHoveredCard("private")}
            onMouseLeave={() => setHoveredCard(null)}
          >
            <div style={styles.cardBody} className="profile-card-body">
              <div style={{ ...styles.cardIconWrap, background: "rgba(0,102,204,0.08)" }} className="profile-card-icon-wrap">
                <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="#0066cc" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
                  <circle cx="12" cy="7" r="4" />
                </svg>
              </div>

              <h2 style={styles.cardTitle} className="profile-card-title">Частен профил</h2>
              <p style={styles.cardDesc} className="profile-card-desc">
                За частни лица, които искат да продават или купуват автомобили
              </p>

              <div style={styles.featuresList}>
                <div style={styles.featureItem} className="profile-feature-item">
                  <span style={{ ...styles.featureCheck, color: "#0066cc" }}>&#10003;</span>
                  Публикувай до 5 обяви
                </div>
                <div style={styles.featureItem} className="profile-feature-item">
                  <span style={{ ...styles.featureCheck, color: "#0066cc" }}>&#10003;</span>
                  Безплатна регистрация
                </div>
                <div style={styles.featureItem} className="profile-feature-item">
                  <span style={{ ...styles.featureCheck, color: "#0066cc" }}>&#10003;</span>
                  Бързо и лесно управление
                </div>
              </div>

              <button
                className="profile-card-btn"
                style={styles.btnPrimary}
                onClick={() => navigate("/profile/private")}
              >
                Продължи като частно лице
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" style={{ marginLeft: 8 }}>
                  <path d="M5 12h14" />
                  <path d="m12 5 7 7-7 7" />
                </svg>
              </button>
            </div>
          </div>

          {/* Business Card */}
          <div
            className="profile-card-interactive"
            style={{
              ...styles.card,
              borderColor: hoveredCard === "business" ? "#667eea" : "#eef2f7",
            }}
            onMouseEnter={() => setHoveredCard("business")}
            onMouseLeave={() => setHoveredCard(null)}
          >
            <div style={styles.cardBody} className="profile-card-body">
              <div style={{ ...styles.cardIconWrap, background: "rgba(102,126,234,0.08)" }} className="profile-card-icon-wrap">
                <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="#667eea" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <rect x="2" y="7" width="20" height="14" rx="2" ry="2" />
                  <path d="M16 21V5a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v16" />
                </svg>
              </div>

              <h2 style={styles.cardTitle} className="profile-card-title">Бизнес профил</h2>
              <p style={styles.cardDesc} className="profile-card-desc">
                За автосалони, дилъри и други бизнес субекти
              </p>

              <div style={styles.featuresList}>
                <div style={styles.featureItem} className="profile-feature-item">
                  <span style={{ ...styles.featureCheck, color: "#667eea" }}>&#10003;</span>
                  Неограничен брой обяви
                </div>
                <div style={styles.featureItem} className="profile-feature-item">
                  <span style={{ ...styles.featureCheck, color: "#667eea" }}>&#10003;</span>
                  Фирмен профил с лого
                </div>
                <div style={styles.featureItem} className="profile-feature-item">
                  <span style={{ ...styles.featureCheck, color: "#667eea" }}>&#10003;</span>
                  Разширена статистика
                </div>
              </div>

              <button
                className="profile-card-btn profile-card-btn-business"
                style={styles.btnBusiness}
                onClick={() => navigate("/profile/business")}
              >
                Продължи като бизнес
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" style={{ marginLeft: 8 }}>
                  <path d="M5 12h14" />
                  <path d="m12 5 7 7-7 7" />
                </svg>
              </button>
            </div>
          </div>
        </div>

        {/* Already have an account link */}
        <div style={styles.footerNote}>
          <span style={{ color: "#6b7280" }}>Вече имаш акаунт?</span>{" "}
          <span
            style={styles.loginLink}
            role="button"
            tabIndex={0}
            onClick={() => navigate("/auth")}
            onKeyDown={(e) => e.key === "Enter" && navigate("/auth")}
          >
            Влез тук
          </span>
        </div>
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
  container: {
    maxWidth: 1100,
    margin: "0 auto",
    padding: "32px 20px",
    boxSizing: "border-box",
  },

  // Hero
  hero: {
    background: "linear-gradient(135deg, #0f172a 0%, #1e293b 50%, #0f172a 100%)",
    borderRadius: 14,
    padding: "28px",
    marginBottom: 28,
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

  // Cards grid
  cardsGrid: {
    display: "grid",
    gridTemplateColumns: "repeat(2, 1fr)",
    gap: 24,
  },

  // Card
  card: {
    background: "#fff",
    borderRadius: 14,
    border: "2px solid #eef2f7",
    boxShadow: "0 4px 16px rgba(15,23,42,0.06)",
    overflow: "hidden",
  },
  cardBody: {
    padding: 32,
    display: "flex",
    flexDirection: "column",
  },
  cardIconWrap: {
    width: 60,
    height: 60,
    borderRadius: 14,
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 20,
  },
  cardTitle: {
    fontSize: 22,
    fontWeight: 700,
    color: "#111827",
    margin: "0 0 8px",
  },
  cardDesc: {
    fontSize: 14,
    color: "#6b7280",
    lineHeight: 1.6,
    margin: "0 0 20px",
  },

  // Features list
  featuresList: {
    display: "flex",
    flexDirection: "column",
    gap: 10,
    marginBottom: 24,
  },
  featureItem: {
    display: "flex",
    alignItems: "center",
    gap: 10,
    fontSize: 14,
    color: "#374151",
  },
  featureCheck: {
    fontWeight: 700,
    fontSize: 14,
  },

  // Buttons
  btnPrimary: {
    display: "inline-flex",
    alignItems: "center",
    justifyContent: "center",
    padding: "13px 24px",
    background: "#0066cc",
    color: "#fff",
    border: "none",
    borderRadius: 10,
    fontSize: 15,
    fontWeight: 700,
    cursor: "pointer",
    marginTop: "auto",
    width: "100%",
    boxSizing: "border-box",
  },
  btnBusiness: {
    display: "inline-flex",
    alignItems: "center",
    justifyContent: "center",
    padding: "13px 24px",
    background: "linear-gradient(135deg, #667eea 0%, #4f5f89 100%)",
    color: "#fff",
    border: "none",
    borderRadius: 10,
    fontSize: 15,
    fontWeight: 700,
    cursor: "pointer",
    marginTop: "auto",
    width: "100%",
    boxSizing: "border-box",
  },

  // Footer note
  footerNote: {
    textAlign: "center",
    marginTop: 28,
    fontSize: 14,
  },
  loginLink: {
    color: "#0066cc",
    fontWeight: 600,
    cursor: "pointer",
    textDecoration: "none",
  },
};

export default ProfileTypePage;
