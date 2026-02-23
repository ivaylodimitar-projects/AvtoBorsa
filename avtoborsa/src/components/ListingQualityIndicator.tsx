import React from "react";
import { FiAlertTriangle, FiAward, FiCheckCircle, FiImage, FiTag } from "react-icons/fi";

interface ListingQualityIndicatorProps {
  completionPercentage: number;
  filledFields?: number;
  totalFields?: number;
  imageCount?: number;
  hasPrice?: boolean;
  priceRequired?: boolean;
}

const ListingQualityIndicator: React.FC<ListingQualityIndicatorProps> = ({
  completionPercentage,
  filledFields = 0,
  totalFields = 0,
  imageCount = 0,
  hasPrice = false,
  priceRequired = true,
}) => {
  const getQualityLevel = (percentage: number) => {
    if (percentage < 25) {
      return { label: "Начало", color: "#ef4444", icon: <FiAlertTriangle size={18} /> };
    }
    if (percentage < 60) {
      return { label: "Добре", color: "#f59e0b", icon: <FiCheckCircle size={18} /> };
    }
    if (percentage < 100) {
      return { label: "Почти готово", color: "#0f766e", icon: <FiCheckCircle size={18} /> };
    }
    return { label: "Готово", color: "#16a34a", icon: <FiAward size={18} /> };
  };

  const quality = getQualityLevel(completionPercentage);
  const priceLabel = !priceRequired ? "По договаряне" : hasPrice ? "Добавена" : "Липсва";
  const priceColor = !priceRequired || hasPrice ? "#0f766e" : "#b91c1c";

  const styles: Record<string, React.CSSProperties> = {
    container: {
      background: "#fff",
      borderRadius: 16, padding: "18px",
      border: "1px solid #e2e8f0",
      boxShadow: "0 10px 24px rgba(15, 23, 42, 0.08)",
    },
    header: {
      display: "flex",
      alignItems: "center",
      gap: 14,
      marginBottom: 14,
    },
    qualityCircle: {
      width: 78,
      height: 78,
      borderRadius: "50%",
      background: quality.color,
      display: "flex",
      flexDirection: "column" as const,
      alignItems: "center",
      justifyContent: "center",
      color: "#fff",
      fontWeight: 700,
      boxShadow: "0 10px 20px rgba(15, 23, 42, 0.18)",
      gap: 3,
      flexShrink: 0,
    },
    percentage: {
      fontSize: 20,
      fontWeight: 800,
      lineHeight: 1,
    },
    label: {
      fontSize: 10,
      fontWeight: 700,
      textTransform: "uppercase",
      letterSpacing: 0.4,
      textAlign: "center" as const,
      padding: "0 4px",
    },
    info: {
      flex: 1,
      minWidth: 0,
    },
    infoTitle: {
      fontSize: 15,
      fontWeight: 700,
      color: "#0f172a",
      marginBottom: 4,
      fontFamily: "\"Space Grotesk\", \"Manrope\", \"Segoe UI\", sans-serif",
    },
    infoText: {
      fontSize: 12,
      color: "#64748b",
      marginBottom: 8,
    },
    progressBar: {
      width: "100%",
      height: 8,
      background: "#e2e8f0",
      borderRadius: 999,
      overflow: "hidden",
    },
    progressFill: {
      height: "100%",
      background: quality.color,
      width: `${completionPercentage}%`,
      transition: "width 0.3s ease",
    },
    metrics: {
      display: "grid",
      gridTemplateColumns: "repeat(3, minmax(0, 1fr))",
      gap: 10,
      marginTop: 14,
    },
    metricCard: {
      border: "1px solid #e2e8f0",
      borderRadius: 16, padding: "10px 8px",
      background: "#f8fafc",
      textAlign: "center" as const,
    },
    metricIcon: {
      display: "inline-flex",
      alignItems: "center",
      justifyContent: "center",
      marginBottom: 6,
      color: "#0f766e",
    },
    metricValue: {
      fontSize: 13,
      fontWeight: 700,
      color: "#0f172a",
      marginBottom: 2,
      lineHeight: 1.2,
    },
    metricLabel: {
      fontSize: 11,
      color: "#64748b",
      lineHeight: 1.2,
    },
  };

  return (
    <div style={styles.container}>
      <div style={styles.header}>
        <div style={styles.qualityCircle}>
          {quality.icon}
          <div style={styles.percentage}>{completionPercentage}%</div>
          <div style={styles.label}>{quality.label}</div>
        </div>
        <div style={styles.info}>
          <div style={styles.infoTitle}>Завършеност на обявата</div>
          <div style={styles.infoText}>Това е текущото състояние на формата.</div>
          <div style={styles.progressBar}>
            <div style={styles.progressFill} />
          </div>
        </div>
      </div>

      <div style={styles.metrics}>
        <div style={styles.metricCard}>
          <span style={styles.metricIcon}>
            <FiCheckCircle size={16} />
          </span>
          <div style={styles.metricValue}>{`${filledFields}/${totalFields}`}</div>
          <div style={styles.metricLabel}>Попълнени полета</div>
        </div>
        <div style={styles.metricCard}>
          <span style={styles.metricIcon}>
            <FiImage size={16} />
          </span>
          <div style={styles.metricValue}>{imageCount}</div>
          <div style={styles.metricLabel}>Снимки</div>
        </div>
        <div style={styles.metricCard}>
          <span style={{ ...styles.metricIcon, color: priceColor }}>
            <FiTag size={16} />
          </span>
          <div style={{ ...styles.metricValue, color: priceColor }}>{priceLabel}</div>
          <div style={styles.metricLabel}>Цена</div>
        </div>
      </div>
    </div>
  );
};

export default ListingQualityIndicator;
