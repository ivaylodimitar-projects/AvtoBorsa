import React, { useState } from "react";
import { useAuth } from "../context/AuthContext";

interface TopUpModalProps {
  onClose: () => void;
  onSuccess: () => void;
}

const TopUpModal: React.FC<TopUpModalProps> = ({ onClose, onSuccess }) => {
  const { user, updateBalance } = useAuth();
  const [amount, setAmount] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState(false);

  const handleTopUp = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setSuccess(false);

    // Validation
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
      setError("Amount exceeds maximum limit (999,999.99 BGN)");
      return;
    }

    setIsLoading(true);

    try {
      const token = localStorage.getItem("authToken");
      const response = await fetch("http://localhost:8000/api/auth/balance/topup/", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Token ${token}`,
        },
        body: JSON.stringify({ amount: numAmount }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || "Failed to top up balance");
      }

      const data = await response.json();
      const newBalance = parseFloat(data.data.balance);
      updateBalance(newBalance);
      setSuccess(true);
      setAmount("");

      // Close modal after 2 seconds
      setTimeout(() => {
        onSuccess();
      }, 2000);
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
    inputFocus: {
      borderColor: "#0066cc",
      outline: "none",
    },
    error: {
      color: "#d32f2f",
      fontSize: 13,
      marginTop: 4,
    },
    success: {
      color: "#2e7d32",
      fontSize: 13,
      padding: "10px 12px",
      background: "#f1f8f4",
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
      background: "#0066cc",
      color: "#fff",
    },
    submitButtonHover: {
      background: "#0052a3",
    },
    submitButtonDisabled: {
      background: "#ccc",
      cursor: "not-allowed",
    },
    cancelButton: {
      background: "#f0f0f0",
      color: "#333",
      border: "1px solid #ddd",
    },
    cancelButtonHover: {
      background: "#e8e8e8",
    },
  };

  return (
    <div style={styles.overlay} onClick={onClose}>
      <div style={styles.modal} onClick={(e) => e.stopPropagation()}>
        <h2 style={styles.title}>Top Up Balance</h2>
        <p style={styles.subtitle}>Add funds to your account</p>

        {success && (
          <div style={styles.success}>
            ✓ Balance updated successfully!
          </div>
        )}

        <form style={styles.form} onSubmit={handleTopUp}>
          <div style={styles.formGroup}>
            <label style={styles.label}>Amount (BGN)</label>
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

          {error && <div style={styles.error}>⚠ {error}</div>}

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
              {isLoading ? "Processing..." : "Top Up"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default TopUpModal;

