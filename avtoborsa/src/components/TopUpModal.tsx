import React, { useState } from "react";

interface TopUpModalProps {
  onClose: () => void;
  onSuccess: () => void;
}

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || "http://localhost:8000";
const STRIPE_CHECKOUT_ENDPOINT =
  import.meta.env.VITE_STRIPE_CHECKOUT_ENDPOINT ||
  `${API_BASE_URL}/api/payments/create-checkout-session/`;
const STRIPE_SESSION_STORAGE_KEY = "stripe_checkout_session_id";

type StripeCheckoutResponse = {
  url?: string;
  session_id?: string;
  error?: string;
};

const extractErrorMessage = (payload: unknown, fallback: string): string => {
  if (!payload || typeof payload !== "object") {
    return fallback;
  }

  const data = payload as Record<string, unknown>;
  const error = data.error;
  if (typeof error === "string" && error.trim()) {
    return error;
  }

  return fallback;
};

const TopUpModal: React.FC<TopUpModalProps> = ({ onClose, onSuccess }) => {
  const [amount, setAmount] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState(false);

  const handleTopUp = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setSuccess(false);

    if (!amount.trim()) {
      setError("Please enter an amount");
      return;
    }

    const numAmount = parseFloat(amount);
    if (isNaN(numAmount) || numAmount <= 0) {
      setError("Amount must be a positive number");
      return;
    }

    if (numAmount > 999999.99) {
      setError("Amount exceeds maximum limit (999,999.99 EUR)");
      return;
    }

    setIsLoading(true);

    try {
      const token = localStorage.getItem("authToken");
      if (!token) {
        throw new Error("Authentication token missing. Please log in again.");
      }

      const currentUrl = `${window.location.origin}${window.location.pathname}`;
      const response = await fetch(STRIPE_CHECKOUT_ENDPOINT, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Token ${token}`,
        },
        body: JSON.stringify({
          amount: numAmount,
          success_url: `${currentUrl}?payment=success&session_id={CHECKOUT_SESSION_ID}`,
          cancel_url: `${currentUrl}?payment=cancelled`,
        }),
      });

      let data: StripeCheckoutResponse = {};
      try {
        data = (await response.json()) as StripeCheckoutResponse;
      } catch {
        data = {};
      }

      if (!response.ok) {
        throw new Error(
          extractErrorMessage(data, "Failed to create Stripe checkout session")
        );
      }

      const checkoutUrl = data.url;
      if (!checkoutUrl) {
        throw new Error("Stripe checkout URL was not returned by the server.");
      }

      const sessionId = data.session_id;
      if (sessionId) {
        localStorage.setItem(STRIPE_SESSION_STORAGE_KEY, sessionId);
      }

      setSuccess(true);
      setAmount("");
      onSuccess();
      window.location.assign(checkoutUrl);
    } catch (err) {
      setError(err instanceof Error ? err.message : "An error occurred");
    } finally {
      setIsLoading(false);
    }
  };

  const styles: Record<string, React.CSSProperties> = {
    overlay: {
      position: "fixed",
      top: 0,
      left: 0,
      right: 0,
      bottom: 0,
      background: "rgba(0,0,0,0.5)",
      display: "flex",
      alignItems: "center",
      justifyContent: "center",
      zIndex: 2000,
    },
    modal: {
      background: "#fff",
      borderRadius: 8,
      boxShadow: "0 8px 24px rgba(0,0,0,0.2)",
      maxWidth: 400,
      width: "90%",
      padding: 32,
    },
    title: {
      fontSize: 24,
      fontWeight: 700,
      marginBottom: 8,
      color: "#333",
    },
    subtitle: {
      fontSize: 14,
      color: "#666",
      marginBottom: 24,
    },
    form: {
      display: "flex",
      flexDirection: "column" as const,
      gap: 16,
    },
    formGroup: {
      display: "flex",
      flexDirection: "column" as const,
      gap: 8,
    },
    label: {
      fontSize: 14,
      fontWeight: 600,
      color: "#333",
    },
    input: {
      padding: "10px 12px",
      border: "1px solid #ddd",
      borderRadius: 4,
      fontSize: 14,
      fontFamily: "inherit",
      transition: "border-color 0.2s",
    },
    error: {
      color: "#d32f2f",
      fontSize: 13,
      marginTop: 4,
    },
    success: {
      color: "#0f766e",
      fontSize: 13,
      padding: "10px 12px",
      background: "#ecfdf5",
      borderRadius: 4,
      marginBottom: 8,
    },
    buttonGroup: {
      display: "flex",
      gap: 12,
      marginTop: 24,
    },
    button: {
      flex: 1,
      padding: "10px 16px",
      border: "none",
      borderRadius: 4,
      fontSize: 14,
      fontWeight: 600,
      cursor: "pointer",
      transition: "background-color 0.2s",
    },
    submitButton: {
      background: "#0f766e",
      color: "#fff",
    },
    submitButtonDisabled: {
      background: "#ccc",
      cursor: "not-allowed",
    },
    cancelButton: {
      background: "#f5f5f5",
      color: "#333",
      border: "1px solid #ccc",
    },
  };

  return (
    <div style={styles.overlay} onClick={onClose}>
      <div style={styles.modal} onClick={(e) => e.stopPropagation()}>
        <h2 style={styles.title}>Top Up Balance</h2>
        <p style={styles.subtitle}>
          You will be redirected to secure Stripe checkout.
        </p>

        {success && (
          <div style={styles.success}>Redirecting to Stripe checkout...</div>
        )}

        <form style={styles.form} onSubmit={handleTopUp}>
          <div style={styles.formGroup}>
            <label style={styles.label}>Amount (EUR)</label>
            <input
              type="number"
              step="0.01"
              min="0.01"
              max="999999.99"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              placeholder="Enter amount"
              style={styles.input}
              disabled={isLoading || success}
            />
          </div>

          {error && <div style={styles.error}>Error: {error}</div>}

          <div style={styles.buttonGroup}>
            <button
              type="button"
              style={styles.cancelButton}
              onClick={onClose}
              disabled={isLoading}
            >
              Cancel
            </button>
            <button
              type="submit"
              style={{
                ...styles.button,
                ...styles.submitButton,
                ...(isLoading || success ? styles.submitButtonDisabled : {}),
              }}
              disabled={isLoading || success}
            >
              {isLoading ? "Redirecting..." : "Continue to payment"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default TopUpModal;
