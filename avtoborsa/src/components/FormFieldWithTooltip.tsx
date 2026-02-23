import React, { useEffect, useRef, useState } from "react";
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
  const containerRef = useRef<HTMLDivElement | null>(null);
  const [requiredFromStepRules, setRequiredFromStepRules] = useState(false);
  const hasRequiredChild = (node: React.ReactNode): boolean => {
    if (node == null || typeof node === "boolean") return false;
    if (Array.isArray(node)) return node.some((item) => hasRequiredChild(item));
    if (!React.isValidElement(node)) return false;

    const nodeProps = (node.props ?? {}) as {
      required?: boolean;
      children?: React.ReactNode;
    };

    if (nodeProps.required === true) return true;
    return hasRequiredChild(nodeProps.children);
  };
  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    const form = container.closest("form");
    const rawKeys = form?.getAttribute("data-required-field-keys") || "";
    const requiredKeys = new Set(
      rawKeys
        .split(",")
        .map((key) => key.trim())
        .filter(Boolean)
    );
    if (requiredKeys.size === 0) {
      setRequiredFromStepRules(false);
      return;
    }

    const controls = container.querySelectorAll<
      HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement
    >("input[name], select[name], textarea[name]");
    const hasRequiredByRules = Array.from(controls).some((control) =>
      requiredKeys.has(control.name)
    );
    setRequiredFromStepRules(hasRequiredByRules);
  }, [children, label]);

  const isRequired = required || hasRequiredChild(children) || requiredFromStepRules;

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
      color: "#333",
    },
    required: {
      color: "rgb(185, 28, 28)",
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
      background: "#ecfdf5",
      color: "#0f766e",
      cursor: "pointer",
      position: "relative",
      border: "1px solid #99f6e4",
    },
    tooltip: {
      position: "absolute" as const,
      bottom: "110%",
      left: 0,
      background: "#0f172a",
      color: "#fff",
      padding: "8px 10px",
      borderRadius: 16,
      fontSize: 12,
      whiteSpace: "nowrap",
      zIndex: 1000,
      boxShadow: "0 6px 18px rgba(15, 23, 42, 0.35)",
    },
    helperText: {
      fontSize: 12,
      color: "#666",
      marginTop: 6,
      display: "flex",
      alignItems: "center",
      gap: 6,
    },
    example: {
      fontSize: 12,
      color: "#666",
      marginTop: 6,
      padding: "6px 8px",
      background: "#fafafa",
      borderRadius: 16,
      borderLeft: "3px solid #0f766e",
    },
    hint: {
      fontSize: 12,
      color: "#166534",
      background: "#f0fdf4",
      padding: "8px 10px",
      borderRadius: 16,
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
      borderRadius: 16,
      marginTop: 6,
      borderLeft: "3px solid #ef4444",
      display: "flex",
      gap: 8,
      alignItems: "flex-start",
    },
  };

  return (
    <div style={styles.container} data-field-wrapper ref={containerRef}>
      <div style={styles.labelContainer}>
        <label style={styles.label}>
          {label}
          {isRequired && <span style={styles.required}>*</span>}
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
      {example && <div style={styles.example}>??????: {example}</div>}
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


