import React from "react";
import { API_BASE_URL } from "../config/api";
import { useAuth } from "../context/AuthContext";
import { useToast } from "../context/ToastContext";
import karBgLogo from "../assets/karbglogo.png";

const PUBLIC_API_DOCS_URL = `${API_BASE_URL}/docs/api/`;

export default function Footer() {
  const { user } = useAuth();
  const { showToast } = useToast();

  const handleApiAccessClick = () => {
    if (!user) {
      showToast("Моля, влезте в бизнес профил, за да заявите API достъп.", { type: "error" });
      return;
    }
    if (user.userType !== "business") {
      showToast("API достъпът е наличен само за бизнес профили.", { type: "error" });
      return;
    }
    window.location.assign(PUBLIC_API_DOCS_URL);
  };

  return (
    <footer style={styles.footer}>
      <div style={styles.footerInner} className="footer-grid">
        <div style={styles.footerCol}>
          <img src={karBgLogo} alt="Kar.bg" style={styles.footerLogo} />
          <p style={styles.footerText}>
            Платформа за покупко-продажба на автомобили, части и услуги.
          </p>
          <a href="mailto:sales@kar.bg" style={styles.footerLink}>
            sales@kar.bg
          </a>
          <a href="mailto:support@kar.bg" style={styles.footerLink}>
            support@kar.bg
          </a>
        </div>

        <div style={styles.footerCol}>
          <div style={styles.footerTitle}>Правна информация</div>
          <a href="/legal" style={styles.footerLink}>
            Общи условия
          </a>
          <a href="/legal#privacy" style={styles.footerLink}>
            GDPR
          </a>
          <button
            type="button"
            className="footer-api-btn"
            style={styles.footerApiButton}
            onClick={handleApiAccessClick}
          >
            Заяви API достъп
          </button>
        </div>

        <div style={styles.footerCol}>
          <div style={styles.footerTitle}>Контакти</div>
          <a href="/contacts" style={styles.footerLink}>
            Контактна страница
          </a>
          <p style={styles.footerText}>Работно време по телефон: Понеделник - Петък, 09:00 - 18:00 ч.</p>
          <p style={styles.footerText}>Поддръжка по имейл: 24/7 (по всяко време).</p>
        </div>
      </div>

      <div style={styles.bottomRow}>
        <span>© {new Date().getFullYear()} Kar.bg. Всички права запазени.</span>
      </div>

      <style>{footerCss}</style>
    </footer>
  );
}

const styles: Record<string, React.CSSProperties> = {
  footer: {
    marginTop: 0,
    borderTop: "none",
    background: "#fff",
  },
  footerInner: {
    maxWidth: 1200,
    margin: "0 auto",
    padding: "30px 20px",
    display: "grid",
    gridTemplateColumns: "2fr 1fr 1fr",
    gap: 30,
  },
  footerCol: {
    display: "flex",
    flexDirection: "column",
    gap: 10,
  },
  footerLogo: {
    width: 152,
    height: "auto",
  },
  footerText: {
    color: "#666",
    fontSize: 14,
    lineHeight: 1.7,
    maxWidth: 400,
    margin: 0,
  },
  footerTitle: {
    fontWeight: 700,
    fontSize: 15,
    color: "#333",
    fontFamily: "\"Space Grotesk\", \"Manrope\", \"Segoe UI\", sans-serif",
  },
  footerLink: {
    color: "#666",
    textDecoration: "none",
    fontSize: 14,
    padding: "4px 0",
  },
  footerApiButton: {
    marginTop: 8,
    border: "none",
    borderRadius: 16,
    background: "linear-gradient(90deg, #0f766e 0%, #0d9488 100%)",
    color: "#fff",
    fontSize: 13,
    fontWeight: 700,
    padding: "10px 14px",
    cursor: "pointer",
    width: "fit-content",
    boxShadow: "0 6px 14px rgba(15, 118, 110, 0.2)",
    transition: "transform 0.2s ease, filter 0.2s ease",
  },
  bottomRow: {
    maxWidth: 1200,
    margin: "0 auto",
    padding: "10px 20px 12px",
    display: "flex",
    alignItems: "center",
    justifyContent: "flex-start",
    gap: 12,
    borderTop: "1px solid #ecfdf5",
    color: "#94a3b8",
    fontSize: 12,
  },
};

const footerCss = `
  .footer-api-btn:hover {
    filter: brightness(1.06);
    transform: translateY(-1px);
  }

  @media (max-width: 1023px) {
    .footer-grid {
      grid-template-columns: 1fr !important;
    }
  }

  @media (max-width: 767px) {
    .footer-bottom {
      flex-direction: column;
      align-items: flex-start;
      gap: 6px;
      padding-left: 14px !important;
      padding-right: 14px !important;
    }

    .footer-grid {
      padding-left: 14px !important;
      padding-right: 14px !important;
    }
  }
`;
