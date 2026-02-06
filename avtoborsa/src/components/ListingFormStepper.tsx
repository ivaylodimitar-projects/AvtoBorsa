import React from "react";

interface Step {
  id: number;
  label: string;
  icon: string;
  description: string;
}

interface ListingFormStepperProps {
  currentStep: number;
  totalSteps: number;
  steps: Step[];
  onStepClick?: (step: number) => void;
  completedSteps?: number[];
}

const ListingFormStepper: React.FC<ListingFormStepperProps> = ({
  currentStep,
  totalSteps,
  steps,
  onStepClick,
  completedSteps = [],
}) => {
  const progressPercentage = (currentStep / totalSteps) * 100;

  const styles: Record<string, React.CSSProperties> = {
    container: {
      marginBottom: 32,
      padding: "20px",
      background: "#f9f9f9",
      borderRadius: 8,
      border: "1px solid #e0e0e0",
    },
    progressBar: {
      width: "100%",
      height: 6,
      background: "#e0e0e0",
      borderRadius: 3,
      overflow: "hidden",
      marginBottom: 20,
    },
    progressFill: {
      height: "100%",
      background: "linear-gradient(90deg, #0066cc, #0052a3)",
      width: `${progressPercentage}%`,
      transition: "width 0.3s ease",
    },
    stepsContainer: {
      display: "flex",
      gap: 12,
      overflowX: "auto",
      paddingBottom: 8,
    },
    step: {
      display: "flex",
      alignItems: "center",
      gap: 8,
      padding: "12px 16px",
      borderRadius: 6,
      cursor: "pointer",
      transition: "all 0.3s ease",
      minWidth: "fit-content",
      border: "1px solid transparent",
    },
    stepIcon: {
      fontSize: 20,
      minWidth: 24,
    },
    stepLabel: {
      fontSize: 13,
      fontWeight: 500,
      whiteSpace: "nowrap",
    },
    stepActive: {
      background: "#0066cc",
      color: "#fff",
      border: "1px solid #0052a3",
    },
    stepCompleted: {
      background: "#e8f5e9",
      color: "#2e7d32",
      border: "1px solid #a5d6a7",
    },
    stepInactive: {
      background: "#fff",
      color: "#666",
      border: "1px solid #e0e0e0",
    },
    statsContainer: {
      display: "flex",
      gap: 16,
      marginTop: 16,
      fontSize: 12,
      color: "#666",
    },
    stat: {
      display: "flex",
      alignItems: "center",
      gap: 6,
    },
  };

  return (
    <div style={styles.container}>
      {/* Progress Bar */}
      <div style={styles.progressBar}>
        <div style={styles.progressFill} />
      </div>

      {/* Steps */}
      <div style={styles.stepsContainer}>
        {steps.map((step) => {
          const isActive = step.id === currentStep;
          const isCompleted = completedSteps.includes(step.id);

          return (
            <div
              key={step.id}
              style={{
                ...styles.step,
                ...(isActive
                  ? styles.stepActive
                  : isCompleted
                    ? styles.stepCompleted
                    : styles.stepInactive),
              }}
              onClick={() => onStepClick?.(step.id)}
              title={step.description}
            >
              <span style={styles.stepIcon}>
                {isCompleted ? "✓" : step.icon}
              </span>
              <span style={styles.stepLabel}>{step.label}</span>
            </div>
          );
        })}
      </div>

      {/* Stats */}
      <div style={styles.statsContainer}>
        <div style={styles.stat}>
          <span>📊</span>
          <span>
            Step {currentStep} of {totalSteps}
          </span>
        </div>
        <div style={styles.stat}>
          <span>✓</span>
          <span>
            {completedSteps.length} completed
          </span>
        </div>
        <div style={styles.stat}>
          <span>📈</span>
          <span>
            {Math.round(progressPercentage)}% complete
          </span>
        </div>
      </div>
    </div>
  );
};

export default ListingFormStepper;

