import React, { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from "react";
import { CheckCircle2, Info, X, XCircle } from "lucide-react";

type ToastType = "success" | "error" | "info";

type ToastOptions = {
  type?: ToastType;
  duration?: number;
};

type ToastItem = {
  id: number;
  message: string;
  type: ToastType;
};

interface ToastContextType {
  showToast: (message: string, options?: ToastOptions) => void;
}

const ToastContext = createContext<ToastContextType | undefined>(undefined);

const DEFAULT_DURATION = 2800;

export const ToastProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [toasts, setToasts] = useState<ToastItem[]>([]);
  const timeoutIdsRef = useRef<number[]>([]);

  const removeToast = useCallback((id: number) => {
    setToasts((prev) => prev.filter((toast) => toast.id !== id));
  }, []);

  const showToast = useCallback(
    (message: string, options?: ToastOptions) => {
      const id = Date.now() + Math.floor(Math.random() * 1000);
      const toast: ToastItem = {
        id,
        message,
        type: options?.type || "info",
      };

      setToasts((prev) => [...prev, toast]);

      const timeoutId = window.setTimeout(() => {
        removeToast(id);
      }, options?.duration ?? DEFAULT_DURATION);

      timeoutIdsRef.current.push(timeoutId);
    },
    [removeToast]
  );

  useEffect(() => {
    return () => {
      timeoutIdsRef.current.forEach((id) => window.clearTimeout(id));
    };
  }, []);

  const contextValue = useMemo(() => ({ showToast }), [showToast]);

  return (
    <ToastContext.Provider value={contextValue}>
      {children}
      <style>{toastCss}</style>

      <div className="toast-viewport-mobile" style={styles.viewport} aria-live="polite" aria-atomic="true">
        {toasts.map((toast) => (
          <div key={toast.id} style={{ ...styles.toast, ...stylesByType[toast.type] }}>
            <div style={styles.iconWrap}>
              {toast.type === "success" ? (
                <CheckCircle2 size={18} />
              ) : toast.type === "error" ? (
                <XCircle size={18} />
              ) : (
                <Info size={18} />
              )}
            </div>
            <div style={styles.message}>{toast.message}</div>
            <button
              type="button"
              style={styles.closeButton}
              onClick={() => removeToast(toast.id)}
              aria-label="Затвори известието"
            >
              <X size={16} />
            </button>
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  );
};

const toastCss = `
@keyframes toast-slide-in {
  from {
    opacity: 0;
    transform: translateY(-8px) scale(0.98);
  }
  to {
    opacity: 1;
    transform: translateY(0) scale(1);
  }
}

@media (max-width: 640px) {
  .toast-viewport-mobile {
    top: 76px;
    right: 10px;
    left: 10px;
    max-width: none;
  }
}
`;

export const useToast = () => {
  const context = useContext(ToastContext);
  if (!context) {
    throw new Error("useToast must be used within ToastProvider");
  }
  return context;
};

const styles: Record<string, React.CSSProperties> = {
  viewport: {
    position: "fixed",
    top: 88,
    right: 18,
    zIndex: 3200,
    display: "flex",
    flexDirection: "column",
    gap: 10,
    maxWidth: "min(92vw, 420px)",
    pointerEvents: "none",
  },
  toast: {
    display: "flex",
    alignItems: "center",
    gap: 10,
    borderRadius: 12,
    border: "1px solid",
    background: "#fff",
    boxShadow: "0 14px 30px rgba(15, 23, 42, 0.2)",
    padding: "11px 12px",
    pointerEvents: "auto",
    animation: "toast-slide-in 0.22s ease-out",
  },
  iconWrap: {
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    flexShrink: 0,
  },
  message: {
    fontSize: 14,
    lineHeight: 1.35,
    color: "#0f172a",
    fontWeight: 600,
    flex: 1,
  },
  closeButton: {
    border: "none",
    background: "transparent",
    color: "#64748b",
    cursor: "pointer",
    borderRadius: 8,
    width: 26,
    height: 26,
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    padding: 0,
    flexShrink: 0,
  },
};

const stylesByType: Record<ToastType, React.CSSProperties> = {
  success: {
    borderColor: "#86efac",
    background: "#f0fdf4",
    color: "#166534",
  },
  error: {
    borderColor: "#fca5a5",
    background: "#fef2f2",
    color: "#991b1b",
  },
  info: {
    borderColor: "#93c5fd",
    background: "#eff6ff",
    color: "#1e3a8a",
  },
};
