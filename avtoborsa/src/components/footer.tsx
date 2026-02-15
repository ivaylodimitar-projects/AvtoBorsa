import React from "react";
import { Link } from "react-router-dom";

export default function Footer() {
  return (
    <footer style={styles.footer}>
      <style>{footerCss}</style>
      <div style={styles.topRow} className="footer-top">
        <div style={styles.brandBlock}>
          <div style={styles.footerBrand}>Kar.bg</div>
          <div style={styles.footerTagline}>Авто маркетплейс за бързо търсене и публикуване.</div>
        </div>
        <nav style={styles.linkRow} className="footer-links">
          <Link className="footer-link" style={styles.footerLink} to="/">Начало</Link>
          <a className="footer-link" style={styles.footerLink} href="/#search">Търсене</a>
          <a className="footer-link" style={styles.footerLink} href="/#latest">Последни обяви</a>
          <a className="footer-link" style={styles.footerLink} href="/#about">За нас</a>
          <Link className="footer-link" style={styles.footerLink} to="/dealers">Дилъри</Link>
          <Link className="footer-link" style={styles.footerLink} to="/publish">Публикуване</Link>
        </nav>
      </div>
      <div style={styles.bottomRow} className="footer-bottom">
        <span>© {new Date().getFullYear()} Kar.bg. Всички права запазени.</span>
        <span>support@kar.bg</span>
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
  topRow: {
    maxWidth: 1200,
    margin: "0 auto",
    padding: "12px 20px",
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 16,
  },
  brandBlock: {
    display: "flex",
    alignItems: "center",
    gap: 10,
    flexWrap: "wrap",
  },
  footerBrand: {
    fontWeight: 700,
    fontSize: 16,
    color: "#0f766e",
    fontFamily: "\"Space Grotesk\", \"Manrope\", \"Segoe UI\", sans-serif",
  },
  footerTagline: {
    color: "#6b7280",
    fontSize: 13,
    lineHeight: 1.5,
  },
  linkRow: {
    display: "flex",
    alignItems: "center",
    gap: 14,
    flexWrap: "wrap",
  },
  footerLink: {
    color: "#4b5563",
    textDecoration: "none",
    fontSize: 13,
    fontWeight: 600,
  },
  bottomRow: {
    maxWidth: 1200,
    margin: "0 auto",
    padding: "8px 20px 12px",
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 12,
    borderTop: "1px solid #ecfdf5",
    color: "#94a3b8",
    fontSize: 12,
  },
};

const footerCss = `
  .footer-link:hover {
    color: #0f766e;
    text-decoration: underline;
  }

  @media (max-width: 960px) {
    .footer-top {
      flex-direction: column;
      align-items: flex-start;
    }

    .footer-links {
      width: 100%;
      gap: 10px;
    }

    .footer-bottom {
      flex-direction: column;
      align-items: flex-start;
      gap: 6px;
    }
  }
`;
