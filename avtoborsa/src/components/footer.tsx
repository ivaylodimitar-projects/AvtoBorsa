import React from "react";

export default function Footer() {
  return (
    <footer style={styles.footer}>
      <style>{footerCss}</style>
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
  @media (max-width: 960px) {
    .footer-bottom {
      flex-direction: column;
      align-items: flex-start;
      gap: 6px;
    }
  }
`;
