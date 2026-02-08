import React from "react";

export default function Footer() {
  return (
    <footer style={styles.footer}>
      <div style={styles.footerInner} className="footer-grid">
        <div style={styles.footerCol}>
          <div style={styles.footerBrand}>Kar.bg</div>
          <div style={styles.footerText}>
            Модерен маркетплейс за авто обяви. Бързо търсене, лесно публикуване, удобен UX.
          </div>
        </div>

        <div style={styles.footerCol}>
          <div style={styles.footerTitle}>Бързи връзки</div>
          <a style={styles.footerLink} href="#search">Търсене</a>
          <a style={styles.footerLink} href="#categories">Категории</a>
        </div>

        <div style={styles.footerCol}>
          <div style={styles.footerTitle}>Политики</div>
          <a style={styles.footerLink} href="#">Условия</a>
          <a style={styles.footerLink} href="#">Поверителност</a>
          <a style={styles.footerLink} href="#">Контакт</a>
        </div>
      </div>

      <div style={styles.footerBottom}>
        © {new Date().getFullYear()} Kar.bg
      </div>
    </footer>
  );
}

const styles: Record<string, React.CSSProperties> = {
  footer: {
    borderTop: "1px solid #e0e0e0",
    background: "#fff",
  },
  footerInner: {
    maxWidth: 1200,
    margin: "0 auto",
    padding: "30px 20px",
    display: "grid",
    gridTemplateColumns: "2fr 1fr 1fr",
    gap: 30,
  } as React.CSSProperties,
  footerCol: { display: "flex", flexDirection: "column", gap: 10 },
  footerBrand: { fontWeight: 700, fontSize: 16, color: "#0066cc" },
  footerText: { color: "#666", fontSize: 13, lineHeight: 1.6, maxWidth: 400 },
  footerTitle: { fontWeight: 700, fontSize: 14, color: "#333" },
  footerLink: {
    color: "#666",
    textDecoration: "none",
    fontSize: 13,
    padding: "4px 0",
  },
  footerBottom: {
    maxWidth: 1200,
    margin: "0 auto",
    padding: "16px 20px",
    color: "#999",
    fontSize: 12,
    borderTop: "1px solid #f0f0f0",
  },
};
