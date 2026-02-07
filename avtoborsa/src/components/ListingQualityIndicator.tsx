import React from "react";
import {
  AlertTriangle,
  BadgeCheck,
  CheckCircle2,
  CircleDot,
  Sparkles,
} from "lucide-react";

interface QualityTip {
  id: string;
  title: string;
  description: string;
  icon: React.ReactNode;
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
    if (percentage < 25) {
      return { label: "Начало", color: "#ef4444", icon: <AlertTriangle size={18} /> };
    }
    if (percentage < 50) {
      return { label: "Добре", color: "#f59e0b", icon: <CircleDot size={18} /> };
    }
    if (percentage < 75) {
      return { label: "Много добре", color: "#facc15", icon: <Sparkles size={18} /> };
    }
    if (percentage < 100) {
      return { label: "Отлично", color: "#22c55e", icon: <CheckCircle2 size={18} /> };
    }
    return { label: "Перфектно", color: "#16a34a", icon: <BadgeCheck size={18} /> };
  };

  const quality = getQualityLevel(completionPercentage);
  const completedTips = tips.filter((t) => t.completed).length;

  const styles: Record<string, React.CSSProperties> = {
    container: {
      background: "linear-gradient(135deg, #f8fafc 0%, #eef2ff 100%)",
      borderRadius: 16,
      padding: "20px",
      border: "1px solid #e2e8f0",
      boxShadow: "0 12px 24px rgba(15, 23, 42, 0.08)",
    },
    header: {
      display: "flex",
      alignItems: "center",
      gap: 16,
      marginBottom: 16,
    },
    qualityCircle: {
      width: 84,
      height: 84,
      borderRadius: "50%",
      background: quality.color,
      display: "flex",
      flexDirection: "column" as const,
      alignItems: "center",
      justifyContent: "center",
      color: "#fff",
      fontWeight: 700,
      boxShadow: "0 10px 18px rgba(15, 23, 42, 0.2)",
      gap: 4,
    },
    percentage: {
      fontSize: 24,
      fontWeight: 800,
      lineHeight: 1,
    },
    label: {
      fontSize: 11,
      fontWeight: 700,
      textTransform: "uppercase",
      letterSpacing: 0.4,
    },
    info: {
      flex: 1,
    },
    infoTitle: {
      fontSize: 16,
      fontWeight: 700,
      color: "#0f172a",
      marginBottom: 4,
      display: "flex",
      alignItems: "center",
      gap: 8,
    },
    infoText: {
      fontSize: 13,
      color: "#475569",
      marginBottom: 10,
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
    tipsContainer: {
      marginTop: 16,
    },
    tipsTitle: {
      fontSize: 13,
      fontWeight: 700,
      color: "#0f172a",
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
      borderRadius: 12,
      border: "1px solid #e2e8f0",
      display: "flex",
      gap: 10,
      alignItems: "flex-start",
    },
    tipCompleted: {
      background: "#f0fdf4",
      borderColor: "#bbf7d0",
    },
    tipIcon: {
      display: "inline-flex",
      alignItems: "center",
      justifyContent: "center",
      width: 28,
      height: 28,
      borderRadius: 8,
      background: "#eef2ff",
      color: "#1d4ed8",
      flexShrink: 0,
    },
    tipContent: {
      flex: 1,
    },
    tipTitle: {
      fontSize: 12,
      fontWeight: 700,
      color: "#0f172a",
      marginBottom: 4,
    },
    tipDescription: {
      fontSize: 11,
      color: "#64748b",
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
          <div style={styles.infoTitle}>
            Качество на обявата
          </div>
          <div style={styles.infoText}>
            Завършени са {completedTips} от {tips.length} препоръки.
          </div>
          <div style={styles.progressBar}>
            <div style={styles.progressFill} />
          </div>
        </div>
      </div>

      {tips.length > 0 && (
        <div style={styles.tipsContainer}>
          <div style={styles.tipsTitle}>Съвети за подобрение</div>
          <div style={styles.tipsList}>
            {tips.map((tip) => (
              <div
                key={tip.id}
                style={{
                  ...styles.tip,
                  ...(tip.completed ? styles.tipCompleted : {}),
                }}
              >
                <div style={styles.tipIcon}>{tip.icon}</div>
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
