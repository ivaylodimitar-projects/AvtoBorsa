import React, { useState } from "react";

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
      fontWeight: 600,
      color: "#333",
    },
    required: {
      color: "#d32f2f",
      fontWeight: 700,
    },
    tooltipIcon: {
      display: "inline-flex",
      alignItems: "center",
      justifyContent: "center",
      width: 18,
      height: 18,
      borderRadius: "50%",
      background: "#e3f2fd",
      color: "#0066cc",
      fontSize: 12,
      fontWeight: 700,
      cursor: "pointer",
      position: "relative",
    },
    tooltip: {
      position: "absolute" as const,
      bottom: "100%",
      left: 0,
      background: "#333",
      color: "#fff",
      padding: "8px 12px",
      borderRadius: 4,
      fontSize: 12,
      whiteSpace: "nowrap",
      zIndex: 1000,
      marginBottom: 8,
      boxShadow: "0 2px 8px rgba(0,0,0,0.15)",
    },
    helperText: {
      fontSize: 12,
      color: "#666",
      marginTop: 6,
      fontStyle: "italic",
    },
    example: {
      fontSize: 12,
      color: "#999",
      marginTop: 4,
      padding: "6px 8px",
      background: "#f5f5f5",
      borderRadius: 3,
      borderLeft: "2px solid #0066cc",
    },
    hint: {
      fontSize: 12,
      color: "#2e7d32",
      background: "#f1f8f4",
      padding: "8px 12px",
      borderRadius: 4,
      marginTop: 8,
      borderLeft: "3px solid #2e7d32",
      display: "flex",
      gap: 8,
      alignItems: "flex-start",
    },
    error: {
      fontSize: 12,
      color: "#d32f2f",
      background: "#ffebee",
      padding: "8px 12px",
      borderRadius: 4,
      marginTop: 6,
      borderLeft: "3px solid #d32f2f",
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
            ?
            {showTooltip && <div style={styles.tooltip}>{tooltip}</div>}
          </div>
        )}
      </div>

      {children}

      {helperText && <div style={styles.helperText}>ℹ️ {helperText}</div>}
      {example && <div style={styles.example}>📝 Пример: {example}</div>}
      {hint && (
        <div style={styles.hint}>
          <span>💡</span>
          <span>{hint}</span>
        </div>
      )}
      {error && (
        <div style={styles.error}>
          <span>⚠️</span>
          <span>{error}</span>
        </div>
      )}
    </div>
  );
};

export default FormFieldWithTooltip;

