import React from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { API_BASE_URL } from "../config/api";

const PUBLIC_API_DOCS_URL = `${API_BASE_URL}/docs/api/`;

export default function Footer() {
  const navigate = useNavigate();
  const location = useLocation();
  const sectionHref = (sectionId: string) =>
    location.pathname === "/" ? `#${sectionId}` : `/#${sectionId}`;

  return (
    <footer style={styles.footer}>
      <style>{footerCss}</style>

      <div style={styles.footerInner} className="footer-grid">
        <div style={styles.footerCol}>
          <div style={styles.footerBrand}>Kar.bg</div>
          <p style={styles.footerText}>
            Платформа за бърза покупко-продажба на автомобили, части и услуги с фокус върху ясни
            резултати и реални сделки.
          </p>
        </div>

        <div style={styles.footerCol}>
          <div style={styles.footerTitle}>Бърз достъп</div>
          <button
            type="button"
            style={{ ...styles.footerLinkButton, ...styles.footerLinkButtonReset }}
            onClick={() => navigate("/")}
          >
            Начало
          </button>
          <a href={sectionHref("search")} style={styles.footerLink}>
            Търсене
          </a>
          <a href={sectionHref("latest")} style={styles.footerLink}>
            Последни обяви
          </a>
          <a href={sectionHref("about")} style={styles.footerLink}>
            За нас
          </a>
          <button
            type="button"
            style={{ ...styles.footerLinkButton, ...styles.footerLinkButtonReset }}
            onClick={() => navigate("/dealers")}
          >
            Дилъри
          </button>
          <button
            type="button"
            style={{ ...styles.footerLinkButton, ...styles.footerLinkButtonReset }}
            onClick={() => navigate("/publish")}
          >
            Публикуване
          </button>
          <button
            type="button"
            style={{ ...styles.footerLinkButton, ...styles.footerLinkButtonReset }}
            onClick={() => navigate("/search")}
          >
            Всички обяви
          </button>
        </div>

        <div style={styles.footerCol} id="api-footer">
          <div style={styles.footerTitle}>Kar.bg API</div>
          <p style={styles.footerText}>
            Връзка за автоматичен импорт на обяви, обновяване на наличности и по-бързо управление
            на инвентар.
          </p>
          <div style={styles.footerApiDealerBadge}>API само за дилъри</div>
          <button
            type="button"
            className="footer-api-btn"
            style={styles.footerApiButton}
            onClick={() => {
              window.location.assign(PUBLIC_API_DOCS_URL);
            }}
          >
            Заяви API достъп
          </button>
        </div>
      </div>

      <div style={styles.bottomRow} className="footer-bottom">
        <span>© {new Date().getFullYear()} Kar.bg. Всички права запазени.</span>
      </div>
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
  footerBrand: {
    fontWeight: 700,
    fontSize: 17,
    color: "#0f766e",
    fontFamily: "\"Space Grotesk\", \"Manrope\", \"Segoe UI\", sans-serif",
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
  footerLinkButtonReset: {
    border: "none",
    background: "transparent",
    textAlign: "left",
    cursor: "pointer",
  },
  footerLinkButton: {
    color: "#666",
    fontSize: 14,
    padding: "4px 0",
    fontFamily: "inherit",
  },
  footerApiDealerBadge: {
    display: "inline-flex",
    alignItems: "center",
    width: "fit-content",
    padding: "6px 10px",
    borderRadius: 999,
    fontSize: 12,
    fontWeight: 700,
    color: "#0f766e",
    background: "#ecfdf5",
    border: "1px solid #99f6e4",
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

  .footer-link:hover {
    text-decoration: underline;
  }

  @media (max-width: 1023px) {
    .footer-grid {
      grid-template-columns: 1fr !important;
    }
  }

  @media (max-width: 767px) {
    .footer-api-btn {
      width: 100%;
    }

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
