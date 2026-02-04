import React from "react";
import Navbar from "./Navbar";

const MyAdsPage: React.FC = () => {
  const styles: Record<string, React.CSSProperties> = {
    page: {
      minHeight: "100vh",
      background: "#f5f5f5",
      width: "100%",
      boxSizing: "border-box",
    },
    container: {
      maxWidth: 1200,
      margin: "0 auto",
      padding: "20px",
      boxSizing: "border-box",
    },
    header: {
      background: "#fff",
      padding: "20px",
      borderRadius: 8,
      marginBottom: 20,
      boxShadow: "0 2px 8px rgba(0,0,0,0.08)",
    },
    title: {
      fontSize: 28,
      fontWeight: 700,
      color: "#333",
      margin: 0,
      marginBottom: 8,
    },
    subtitle: {
      fontSize: 14,
      color: "#666",
      margin: 0,
    },
    emptyState: {
      background: "#fff",
      padding: "40px 20px",
      borderRadius: 8,
      textAlign: "center",
      boxShadow: "0 2px 8px rgba(0,0,0,0.08)",
    },
    emptyIcon: {
      fontSize: 48,
      marginBottom: 16,
    },
    emptyText: {
      fontSize: 16,
      color: "#666",
      marginBottom: 8,
    },
    emptySubtext: {
      fontSize: 14,
      color: "#999",
    },
    ctaButton: {
      marginTop: 16,
      padding: "12px 24px",
      background: "#0066cc",
      color: "#fff",
      border: "none",
      borderRadius: 6,
      fontSize: 14,
      fontWeight: 600,
      cursor: "pointer",
      textDecoration: "none",
      display: "inline-block",
    },
  };

  return (
    <div style={styles.page}>
      <Navbar />
      <div style={styles.container}>
        <div style={styles.header}>
          <h1 style={styles.title}>📋 Моите Обяви</h1>
          <p style={styles.subtitle}>Твоите публикувани автомобили</p>
        </div>

        <div style={styles.emptyState}>
          <div style={styles.emptyIcon}>📭</div>
          <p style={styles.emptyText}>Нямаш публикувани обяви</p>
          <p style={styles.emptySubtext}>
            Публикувай първата си обява и я управлявай от тук
          </p>
          <a href="/publish" style={styles.ctaButton}>
            Публикувай обява
          </a>
        </div>
      </div>
    </div>
  );
};

export default MyAdsPage;

