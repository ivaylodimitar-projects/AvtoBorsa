import React, { useState } from "react";
import { AlertTriangle, HelpCircle, Info, Lightbulb } from "lucide-react";

interface FormFieldWithTooltipProps {
  label: string;
  required?: boolean;
  tooltip?: string;
  helperText?: string;
  example?: string;
  error?: string;
  children: React.ReactNode;
  hint?: string;
}

const FormFieldWithTooltip: React.FC<FormFieldWithTooltipProps> = ({
  label,
  required = false,
  tooltip,
  helperText,
  example,
  error,
  children,
  hint,
}) => {
  const [showTooltip, setShowTooltip] = useState(false);

  const styles: Record<string, React.CSSProperties> = {
    container: {
      marginBottom: 16,
    },
    labelContainer: {
      display: "flex",
      alignItems: "center",
      gap: 8,
      marginBottom: 8,
    },
    label: {
      fontSize: 14,
      fontWeight: 700,
      color: "#0f172a",
    },
    required: {
      color: "#b91c1c",
      fontWeight: 800,
      marginLeft: 4,
    },
    tooltipIcon: {
      display: "inline-flex",
      alignItems: "center",
      justifyContent: "center",
      width: 22,
      height: 22,
      borderRadius: "50%",
      background: "#eef2ff",
      color: "#1d4ed8",
      cursor: "pointer",
      position: "relative",
      border: "1px solid #c7d2fe",
    },
    tooltip: {
      position: "absolute" as const,
      bottom: "110%",
      left: 0,
      background: "#0f172a",
      color: "#fff",
      padding: "8px 10px",
      borderRadius: 8,
      fontSize: 12,
      whiteSpace: "nowrap",
      zIndex: 1000,
      boxShadow: "0 6px 18px rgba(15, 23, 42, 0.35)",
    },
    helperText: {
      fontSize: 12,
      color: "#64748b",
      marginTop: 6,
      display: "flex",
      alignItems: "center",
      gap: 6,
    },
    example: {
      fontSize: 12,
      color: "#475569",
      marginTop: 6,
      padding: "6px 8px",
      background: "#f1f5f9",
      borderRadius: 6,
      borderLeft: "3px solid #1d4ed8",
    },
    hint: {
      fontSize: 12,
      color: "#166534",
      background: "#f0fdf4",
      padding: "8px 10px",
      borderRadius: 8,
      marginTop: 8,
      borderLeft: "3px solid #16a34a",
      display: "flex",
      gap: 8,
      alignItems: "flex-start",
    },
    error: {
      fontSize: 12,
      color: "#b91c1c",
      background: "#fef2f2",
      padding: "8px 10px",
      borderRadius: 8,
      marginTop: 6,
      borderLeft: "3px solid #ef4444",
      display: "flex",
      gap: 8,
      alignItems: "flex-start",
    },
  };

  return (
    <div style={styles.container}>
      <div style={styles.labelContainer}>
        <label style={styles.label}>
          {label}
          {required && <span style={styles.required}>*</span>}
        </label>
        {tooltip && (
          <div
            style={styles.tooltipIcon}
            onMouseEnter={() => setShowTooltip(true)}
            onMouseLeave={() => setShowTooltip(false)}
          >
            <HelpCircle size={14} />
            {showTooltip && <div style={styles.tooltip}>{tooltip}</div>}
          </div>
        )}
      </div>

      {children}

      {helperText && (
        <div style={styles.helperText}>
          <Info size={14} />
          <span>{helperText}</span>
        </div>
      )}
      {example && <div style={styles.example}>Пример: {example}</div>}
      {hint && (
        <div style={styles.hint}>
          <Lightbulb size={14} />
          <span>{hint}</span>
        </div>
      )}
      {error && (
        <div style={styles.error}>
          <AlertTriangle size={14} />
          <span>{error}</span>
        </div>
      )}
    </div>
  );
};

export default FormFieldWithTooltip;
