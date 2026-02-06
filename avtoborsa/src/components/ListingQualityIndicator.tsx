import React from "react";

interface QualityTip {
  id: string;
  title: string;
  description: string;
  icon: string;
  completed: boolean;
}

interface ListingQualityIndicatorProps {
  completionPercentage: number;
  tips: QualityTip[];
}

const ListingQualityIndicator: React.FC<ListingQualityIndicatorProps> = ({
  completionPercentage,
  tips,
}) => {
  const getQualityLevel = (percentage: number) => {
    if (percentage < 25) return { label: "Начало", color: "#ff6b6b", emoji: "🔴" };
    if (percentage < 50) return { label: "Добре", color: "#ffa500", emoji: "🟠" };
    if (percentage < 75) return { label: "Много добре", color: "#ffd700", emoji: "🟡" };
    if (percentage < 100) return { label: "Отлично", color: "#90ee90", emoji: "🟢" };
    return { label: "Перфектно", color: "#00cc00", emoji: "✅" };
  };

  const quality = getQualityLevel(completionPercentage);
  const completedTips = tips.filter((t) => t.completed).length;

  const styles: Record<string, React.CSSProperties> = {
    container: {
      background: "linear-gradient(135deg, #f5f7fa 0%, #c3cfe2 100%)",
      borderRadius: 8,
      padding: "20px",
      marginBottom: 24,
      border: "1px solid #e0e0e0",
    },
    header: {
      display: "flex",
      alignItems: "center",
      gap: 16,
      marginBottom: 16,
    },
    qualityCircle: {
      width: 80,
      height: 80,
      borderRadius: "50%",
      background: quality.color,
      display: "flex",
      flexDirection: "column" as const,
      alignItems: "center",
      justifyContent: "center",
      color: "#fff",
      fontWeight: 700,
      boxShadow: "0 4px 12px rgba(0,0,0,0.15)",
    },
    percentage: {
      fontSize: 28,
      fontWeight: 700,
    },
    label: {
      fontSize: 11,
      fontWeight: 600,
    },
    info: {
      flex: 1,
    },
    infoTitle: {
      fontSize: 16,
      fontWeight: 700,
      color: "#333",
      marginBottom: 4,
    },
    infoText: {
      fontSize: 13,
      color: "#666",
      marginBottom: 8,
    },
    progressBar: {
      width: "100%",
      height: 8,
      background: "#e0e0e0",
      borderRadius: 4,
      overflow: "hidden",
    },
    progressFill: {
      height: "100%",
      background: quality.color,
      width: `${completionPercentage}%`,
      transition: "width 0.3s ease",
    },
    tipsContainer: {
      marginTop: 16,
    },
    tipsTitle: {
      fontSize: 13,
      fontWeight: 700,
      color: "#333",
      marginBottom: 12,
    },
    tipsList: {
      display: "grid",
      gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))",
      gap: 12,
    },
    tip: {
      padding: "12px",
      background: "#fff",
      borderRadius: 6,
      border: "1px solid #e0e0e0",
      display: "flex",
      gap: 8,
      alignItems: "flex-start",
    },
    tipCompleted: {
      background: "#f1f8f4",
      borderColor: "#a5d6a7",
    },
    tipIcon: {
      fontSize: 18,
      minWidth: 24,
    },
    tipContent: {
      flex: 1,
    },
    tipTitle: {
      fontSize: 12,
      fontWeight: 600,
      color: "#333",
      marginBottom: 2,
    },
    tipDescription: {
      fontSize: 11,
      color: "#666",
    },
  };

  return (
    <div style={styles.container}>
      <div style={styles.header}>
        <div style={styles.qualityCircle}>
          <div style={styles.percentage}>{completionPercentage}%</div>
          <div style={styles.label}>{quality.label}</div>
        </div>
        <div style={styles.info}>
          <div style={styles.infoTitle}>
            {quality.emoji} Качество на обявата
          </div>
          <div style={styles.infoText}>
            Завършили сте {completedTips} от {tips.length} препоръки за подобрение
          </div>
          <div style={styles.progressBar}>
            <div style={styles.progressFill} />
          </div>
        </div>
      </div>

      {tips.length > 0 && (
        <div style={styles.tipsContainer}>
          <div style={styles.tipsTitle}>💡 Съвети за подобрение:</div>
          <div style={styles.tipsList}>
            {tips.map((tip) => (
              <div
                key={tip.id}
                style={{
                  ...styles.tip,
                  ...(tip.completed ? styles.tipCompleted : {}),
                }}
              >
                <div style={styles.tipIcon}>{tip.completed ? "✓" : tip.icon}</div>
                <div style={styles.tipContent}>
                  <div style={styles.tipTitle}>{tip.title}</div>
                  <div style={styles.tipDescription}>{tip.description}</div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

export default ListingQualityIndicator;

