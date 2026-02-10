import React, { useEffect, useRef } from "react";
import { Activity, CheckCircle2, TrendingUp } from "lucide-react";

interface Step {
  id: number;
  label: string;
  icon: React.ReactNode;
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
  const completedCount = completedSteps.length;
  const completionPercent = Math.round(progressPercentage);
  const completedCountColor = completedCount === 0 ? "#16a34a" : "#0f766e";
  const completionPercentColor = completionPercent < 25 ? "#f59e0b" : "#0f766e";
  const stepsContainerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const container = stepsContainerRef.current;
    if (!container) return;
    const activeStep = container.querySelector<HTMLButtonElement>(
      `[data-step-id="${currentStep}"]`
    );
    if (!activeStep) return;

    if (container.scrollWidth <= container.clientWidth) return;
    const targetLeft =
      activeStep.offsetLeft -
      container.clientWidth / 2 +
      activeStep.offsetWidth / 2;
    const maxLeft = container.scrollWidth - container.clientWidth;
    container.scrollTo({
      left: Math.max(0, Math.min(targetLeft, maxLeft)),
      behavior: "smooth",
    });
  }, [currentStep]);

  const styles: Record<string, React.CSSProperties> = {
    container: {
      marginBottom: 24,
      padding: "18px",
      background: "#fafafa",
      borderRadius: 8,
      border: "1px solid #e0e0e0",
    },
    progressBar: {
      width: "100%",
      height: 6,
      background: "#e0e0e0",
      borderRadius: 999,
      overflow: "hidden",
      marginBottom: 16,
    },
    progressFill: {
      height: "100%",
      background: "linear-gradient(90deg, #0f766e, #0b5f58)",
      width: `${progressPercentage}%`,
      transition: "width 0.3s ease",
    },
    stepsContainer: {
      display: "flex",
      gap: 10,
      overflowX: "auto",
      paddingBottom: 8,
      scrollbarWidth: "thin",
      scrollbarColor: "#0f766e transparent",
      scrollBehavior: "smooth",
      WebkitOverflowScrolling: "touch",
    },
    step: {
      display: "inline-flex",
      alignItems: "center",
      gap: 8,
      padding: "8px 12px",
      borderRadius: 999,
      cursor: "pointer",
      transition: "all 0.2s ease",
      minWidth: "fit-content",
      border: "1px solid transparent",
      background: "#fff",
      fontSize: 13,
      fontWeight: 600,
    },
    stepIcon: {
      display: "inline-flex",
      alignItems: "center",
      justifyContent: "center",
    },
    stepLabel: {
      whiteSpace: "nowrap",
    },
    stepActive: {
      background: "#0f766e",
      color: "#fff",
      border: "1px solid #0f766e",
      boxShadow: "0 6px 14px rgba(15, 118, 110, 0.3)",
    },
    stepCompleted: {
      background: "#ecfdf5",
      color: "#0f766e",
      border: "1px solid #99f6e4",
    },
    stepInactive: {
      background: "#fff",
      color: "#666",
      border: "1px solid #e0e0e0",
    },
    statsContainer: {
      display: "flex",
      flexWrap: "wrap",
      gap: 14,
      marginTop: 16,
      fontSize: 12,
      color: "#666",
    },
    stat: {
      display: "flex",
      alignItems: "center",
      gap: 6,
      fontWeight: 600,
    },
  };

  return (
    <div style={styles.container}>
      <style>{`
        .listing-stepper-scroll::-webkit-scrollbar {
          height: 8px;
        }
        .listing-stepper-scroll::-webkit-scrollbar-thumb {
          background: rgba(15, 118, 110, 0.35);
          border-radius: 999px;
        }
        .listing-stepper-scroll::-webkit-scrollbar-track {
          background: transparent;
        }
      `}</style>
      <div style={styles.progressBar}>
        <div style={styles.progressFill} />
      </div>

      <div style={styles.stepsContainer} className="listing-stepper-scroll" ref={stepsContainerRef}>
        {steps.map((step) => {
          const isActive = step.id === currentStep;
          const isCompleted = completedSteps.includes(step.id);

          return (
            <button
              key={step.id}
              type="button"
              data-step-id={step.id}
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
              aria-current={isActive ? "step" : undefined}
            >
              <span style={styles.stepIcon}>
                {isCompleted ? <CheckCircle2 size={16} /> : step.icon}
              </span>
              <span style={styles.stepLabel}>{step.label}</span>
            </button>
          );
        })}
      </div>

      <div style={styles.statsContainer}>
        <div style={styles.stat}>
          <Activity size={14} />
          <span>
            Стъпка {currentStep} от {totalSteps}
          </span>
        </div>
        <div style={styles.stat}>
          <CheckCircle2 size={14} />
          <span>
            <span style={{ color: completedCountColor, fontWeight: 700 }}>
              {completedCount}
            </span>{" "}
            завършени
          </span>
        </div>
        <div style={styles.stat}>
          <TrendingUp size={14} />
          <span>
            <span style={{ color: completionPercentColor, fontWeight: 700 }}>
              {completionPercent}%
            </span>{" "}
            попълване
          </span>
        </div>
      </div>
    </div>
  );
};

export default ListingFormStepper;
