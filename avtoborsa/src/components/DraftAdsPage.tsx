import React from "react";

const DraftAdsPage: React.FC = () => {
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
  };

  return (
    <div style={styles.page}>
      <div style={styles.container}>
        <div style={styles.header}>
          <h1 style={styles.title}>📝 Чернови обяви</h1>
          <p style={styles.subtitle}>Твоите незавършени обяви</p>
        </div>

        <div style={styles.emptyState}>
          <div style={styles.emptyIcon}>📭</div>
          <p style={styles.emptyText}>Нямаш чернови обяви</p>
          <p style={styles.emptySubtext}>
            Начни да публикуваш нова обява и я запази като чернова
          </p>
        </div>
      </div>
    </div>
  );
};

export default DraftAdsPage;

