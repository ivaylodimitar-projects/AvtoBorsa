import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Lock, Trash2, Wallet, User } from "lucide-react";
import { useAuth } from "../context/AuthContext";

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || "http://localhost:8000";

type PaymentTransaction = {
  id: number;
  amount: number | string;
  currency: string;
  status: string;
  credited: boolean;
  created_at: string;
};

type TabKey = "profile" | "password" | "transactions" | "delete";

const SettingsPage: React.FC = () => {
  const navigate = useNavigate();
  const { user, isLoading, logout, setUserFromToken } = useAuth();
  const [activeTab, setActiveTab] = useState<TabKey>("password");
  const [transactions, setTransactions] = useState<PaymentTransaction[]>([]);
  const [loadingTransactions, setLoadingTransactions] = useState(true);
  const [txError, setTxError] = useState<string | null>(null);

  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [profileStatus, setProfileStatus] = useState<string | null>(null);
  const [profileError, setProfileError] = useState<string | null>(null);
  const [profileLoading, setProfileLoading] = useState(false);

  const [oldPassword, setOldPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [passwordStatus, setPasswordStatus] = useState<string | null>(null);
  const [passwordError, setPasswordError] = useState<string | null>(null);
  const [passwordLoading, setPasswordLoading] = useState(false);

  const [deletePassword, setDeletePassword] = useState("");
  const [deleteError, setDeleteError] = useState<string | null>(null);
  const [deleteLoading, setDeleteLoading] = useState(false);

  useEffect(() => {
    if (!user) return;
    setFirstName(user.first_name || "");
    setLastName(user.last_name || "");
  }, [user]);

  useEffect(() => {
    if (!user) return;
    const token = localStorage.getItem("authToken");
    if (!token) return;
    const fetchTransactions = async () => {
      setLoadingTransactions(true);
      try {
        const res = await fetch(`${API_BASE_URL}/api/payments/transactions/`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        if (!res.ok) {
          setTransactions([]);
          setTxError("Неуспешно зареждане на транзакции.");
          return;
        }
        const data = await res.json();
        setTransactions(Array.isArray(data) ? data : []);
        setTxError(null);
      } catch {
        setTxError("Неуспешно зареждане на транзакции.");
      } finally {
        setLoadingTransactions(false);
      }
    };

    fetchTransactions();
  }, [user]);

  const handleChangePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setPasswordError(null);
    setPasswordStatus(null);

    if (!oldPassword || !newPassword || !confirmPassword) {
      setPasswordError("Всички полета са задължителни.");
      return;
    }
    if (newPassword !== confirmPassword) {
      setPasswordError("Новата парола не съвпада.");
      return;
    }

    const token = localStorage.getItem("authToken");
    if (!token) return;

    setPasswordLoading(true);
    try {
      const res = await fetch(`${API_BASE_URL}/api/auth/change-password/`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          old_password: oldPassword,
          new_password: newPassword,
          confirm_password: confirmPassword,
        }),
      });

      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setPasswordError(data?.error || "Грешка при смяна на парола.");
        return;
      }
      setPasswordStatus("Паролата е сменена успешно.");
      setOldPassword("");
      setNewPassword("");
      setConfirmPassword("");
    } catch {
      setPasswordError("Грешка при смяна на парола.");
    } finally {
      setPasswordLoading(false);
    }
  };

  const handleUpdateProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    setProfileError(null);
    setProfileStatus(null);

    const token = localStorage.getItem("authToken");
    if (!token) return;

    setProfileLoading(true);
    try {
      const payload = {
        first_name: firstName.trim(),
        last_name: lastName.trim(),
      };
      const res = await fetch(`${API_BASE_URL}/api/auth/profile/update-names/`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(payload),
      });

      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setProfileError(data?.error || "Грешка при запис на профила.");
        return;
      }

      const updatedFirst = typeof data?.first_name === "string" ? data.first_name : payload.first_name;
      const updatedLast = typeof data?.last_name === "string" ? data.last_name : payload.last_name;
      setFirstName(updatedFirst);
      setLastName(updatedLast);
      if (user) {
        setUserFromToken({ ...user, first_name: updatedFirst, last_name: updatedLast }, token);
      }
      setProfileStatus("Имената са записани успешно.");
    } catch {
      setProfileError("Грешка при запис на профила.");
    } finally {
      setProfileLoading(false);
    }
  };

  const handleDeleteAccount = async () => {
    setDeleteError(null);
    if (!deletePassword) {
      setDeleteError("Въведи паролата си.");
      return;
    }

    const token = localStorage.getItem("authToken");
    if (!token) return;

    setDeleteLoading(true);
    try {
      const res = await fetch(`${API_BASE_URL}/api/auth/delete-account/`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ password: deletePassword }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setDeleteError(data?.error || "Неуспешно изтриване на акаунт.");
        return;
      }
      await logout();
      navigate("/");
    } catch {
      setDeleteError("Неуспешно изтриване на акаунт.");
    } finally {
      setDeleteLoading(false);
    }
  };

  const statusLabel = (status: string) => {
    switch (status) {
      case "succeeded":
        return "Успешна";
      case "pending":
        return "Изчаква";
      case "failed":
        return "Неуспешна";
      case "cancelled":
        return "Отказана";
      default:
        return status;
    }
  };

  const statusColor = (status: string) => {
    switch (status) {
      case "succeeded":
        return "#16a34a";
      case "pending":
        return "#f97316";
      case "failed":
        return "#dc2626";
      case "cancelled":
        return "#6b7280";
      default:
        return "#6b7280";
    }
  };

  const globalCss = `
    @import url('https://fonts.googleapis.com/css2?family=Manrope:wght@400;500;600;700;800&family=Space+Grotesk:wght@500;600;700&display=swap');
    * { box-sizing: border-box; }
    body { margin: 0; font-family: "Manrope", "Segoe UI", sans-serif; }
  `;

  const styles: Record<string, React.CSSProperties> = {
    page: { minHeight: "100vh", background: "#f5f5f5", width: "100%" },
    container: { maxWidth: 1100, margin: "0 auto", padding: "28px 20px 60px" },
    hero: {
      background: "#fff",
      borderRadius: 14,
      border: "1px solid #e5e7eb",
      padding: "22px",
      boxShadow: "0 6px 18px rgba(15,23,42,0.06)",
    },
    heroTitle: {
      fontSize: 24,
      fontWeight: 800,
      margin: 0,
      color: "#111827",
      fontFamily: "\"Space Grotesk\", \"Manrope\", sans-serif",
    },
    heroSubtitle: { marginTop: 6, fontSize: 14, color: "#6b7280" },
    tabs: { display: "flex", gap: 10, flexWrap: "wrap", marginTop: 18 },
    tab: {
      padding: "10px 16px",
      borderRadius: 999,
      border: "1px solid #e5e7eb",
      background: "#fff",
      fontSize: 13,
      fontWeight: 700,
      cursor: "pointer",
      color: "#374151",
      display: "inline-flex",
      alignItems: "center",
      gap: 8,
    },
    tabActive: {
      background: "#0f766e",
      borderColor: "#0f766e",
      color: "#fff",
      boxShadow: "0 4px 12px rgba(15,118,110,0.2)",
    },
    section: {
      marginTop: 20,
      background: "#fff",
      borderRadius: 14,
      border: "1px solid #e5e7eb",
      padding: "20px",
      boxShadow: "0 6px 18px rgba(15,23,42,0.06)",
    },
    sectionTitle: {
      fontSize: 16,
      fontWeight: 800,
      margin: 0,
      color: "#111827",
    },
    form: { marginTop: 16, display: "flex", flexDirection: "column", gap: 12 },
    label: { fontSize: 12, fontWeight: 700, color: "#6b7280" },
    input: {
      width: "100%",
      padding: "12px 14px",
      borderRadius: 10,
      border: "1px solid #e5e7eb",
      fontSize: 14,
      outline: "none",
      fontFamily: "inherit",
    },
    button: {
      padding: "12px 18px",
      borderRadius: 10,
      border: "none",
      background: "#0f766e",
      color: "#fff",
      fontWeight: 700,
      cursor: "pointer",
      marginTop: 6,
      display: "inline-flex",
      alignItems: "center",
      justifyContent: "center",
      gap: 8,
    },
    buttonGhost: {
      padding: "10px 16px",
      borderRadius: 10,
      border: "1px solid #e5e7eb",
      background: "#f8fafc",
      color: "#334155",
      fontWeight: 700,
      cursor: "pointer",
    },
    error: {
      padding: "10px 12px",
      borderRadius: 10,
      background: "#fef2f2",
      border: "1px solid #fecaca",
      color: "#b91c1c",
      fontSize: 13,
      fontWeight: 600,
    },
    success: {
      padding: "10px 12px",
      borderRadius: 10,
      background: "#ecfdf5",
      border: "1px solid #bbf7d0",
      color: "#0f766e",
      fontSize: 13,
      fontWeight: 600,
    },
    transactionList: { marginTop: 16, display: "flex", flexDirection: "column", gap: 10 },
    transactionRow: {
      display: "flex",
      alignItems: "center",
      justifyContent: "space-between",
      gap: 12,
      padding: "12px 14px",
      background: "#f8fafc",
      borderRadius: 10,
      border: "1px solid #e2e8f0",
    },
    transactionTitle: { fontSize: 13, fontWeight: 700, color: "#0f172a" },
    transactionMeta: { fontSize: 12, color: "#6b7280", display: "flex", gap: 8, alignItems: "center" },
    transactionAmount: { fontSize: 15, fontWeight: 800, color: "#0f766e" },
    empty: { marginTop: 16, fontSize: 13, color: "#94a3b8" },
    dangerBox: {
      border: "1px solid #fecaca",
      background: "#fff1f2",
      borderRadius: 12,
      padding: 16,
      marginTop: 16,
    },
    dangerTitle: { fontSize: 14, fontWeight: 800, color: "#b91c1c" },
    dangerText: { fontSize: 13, color: "#7f1d1d", marginTop: 6 },
  };

  if (isLoading) {
    return (
      <div style={styles.page}>
        <style>{globalCss}</style>
        <div style={styles.container}>Зареждане...</div>
      </div>
    );
  }

  if (!user) {
    return (
      <div style={styles.page}>
        <style>{globalCss}</style>
        <div style={styles.container}>
          <div style={styles.section}>
            <div style={{ fontSize: 16, fontWeight: 700 }}>
              Нужно е да влезеш, за да управляваш настройките си.
            </div>
            <button style={{ ...styles.button, marginTop: 12 }} onClick={() => navigate("/auth")}>
              Към вход
            </button>
          </div>
        </div>
      </div>
    );
  }

  const amountLabel = (tx: PaymentTransaction) => {
    const amount = Number(tx.amount);
    return Number.isFinite(amount)
      ? `${amount.toLocaleString("bg-BG")} ${tx.currency}`
      : `${tx.amount} ${tx.currency}`;
  };

  return (
    <div style={styles.page}>
      <style>{globalCss}</style>
      <div style={styles.container}>
        <div style={styles.hero}>
          <h1 style={styles.heroTitle}>Настройки</h1>
          <div style={styles.heroSubtitle}>Управлявай паролата, транзакциите и акаунта си.</div>
          <div style={styles.tabs}>
            <button
              style={{ ...styles.tab, ...(activeTab === "profile" ? styles.tabActive : {}) }}
              onClick={() => setActiveTab("profile")}
            >
              <User size={16} />
              Профил
            </button>
            <button
              style={{ ...styles.tab, ...(activeTab === "password" ? styles.tabActive : {}) }}
              onClick={() => setActiveTab("password")}
            >
              <Lock size={16} />
              Парола
            </button>
            <button
              style={{ ...styles.tab, ...(activeTab === "transactions" ? styles.tabActive : {}) }}
              onClick={() => setActiveTab("transactions")}
            >
              <Wallet size={16} />
              Транзакции
            </button>
            <button
              style={{ ...styles.tab, ...(activeTab === "delete" ? styles.tabActive : {}) }}
              onClick={() => setActiveTab("delete")}
            >
              <Trash2 size={16} />
              Изтриване
            </button>
          </div>
        </div>

        {activeTab === "profile" && (
          <div style={styles.section}>
            <h2 style={styles.sectionTitle}>Профилни данни</h2>
            <form style={styles.form} onSubmit={handleUpdateProfile}>
              {profileError && <div style={styles.error}>{profileError}</div>}
              {profileStatus && <div style={styles.success}>{profileStatus}</div>}
              <div>
                <div style={styles.label}>Първо име</div>
                <input
                  type="text"
                  value={firstName}
                  onChange={(e) => setFirstName(e.target.value)}
                  style={styles.input}
                  placeholder="Напр. Иван"
                />
              </div>
              <div>
                <div style={styles.label}>Фамилия</div>
                <input
                  type="text"
                  value={lastName}
                  onChange={(e) => setLastName(e.target.value)}
                  style={styles.input}
                  placeholder="Напр. Иванов"
                />
              </div>
              <button type="submit" style={styles.button} disabled={profileLoading}>
                <User size={16} />
                {profileLoading ? "Запис..." : "Запази"}
              </button>
            </form>
          </div>
        )}

        {activeTab === "password" && (
          <div style={styles.section}>
            <h2 style={styles.sectionTitle}>Смяна на парола</h2>
            <form style={styles.form} onSubmit={handleChangePassword}>
              {passwordError && <div style={styles.error}>{passwordError}</div>}
              {passwordStatus && <div style={styles.success}>{passwordStatus}</div>}
              <div>
                <div style={styles.label}>Стара парола</div>
                <input
                  type="password"
                  value={oldPassword}
                  onChange={(e) => setOldPassword(e.target.value)}
                  style={styles.input}
                />
              </div>
              <div>
                <div style={styles.label}>Нова парола</div>
                <input
                  type="password"
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  style={styles.input}
                />
              </div>
              <div>
                <div style={styles.label}>Потвърди новата парола</div>
                <input
                  type="password"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  style={styles.input}
                />
              </div>
              <button type="submit" style={styles.button} disabled={passwordLoading}>
                <Lock size={16} />
                {passwordLoading ? "Запазване..." : "Смени паролата"}
              </button>
            </form>
          </div>
        )}

        {activeTab === "transactions" && (
          <div style={styles.section}>
            <h2 style={styles.sectionTitle}>Транзакции</h2>
            {loadingTransactions ? (
              <div style={styles.empty}>Зареждане...</div>
            ) : txError ? (
              <div style={styles.error}>{txError}</div>
            ) : transactions.length === 0 ? (
              <div style={styles.empty}>Няма налични транзакции.</div>
            ) : (
              <div style={styles.transactionList}>
                {transactions.map((tx) => (
                  <div key={tx.id} style={styles.transactionRow}>
                    <div>
                      <div style={styles.transactionTitle}>Добавени средства</div>
                      <div style={styles.transactionMeta}>
                        <span>{new Date(tx.created_at).toLocaleDateString("bg-BG")}</span>
                        <span style={{ color: statusColor(tx.status), fontWeight: 700 }}>
                          {statusLabel(tx.status)}
                        </span>
                      </div>
                    </div>
                    <div style={styles.transactionAmount}>+{amountLabel(tx)}</div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {activeTab === "delete" && (
          <div style={styles.section}>
            <h2 style={styles.sectionTitle}>Изтриване на акаунт</h2>
            <div style={styles.dangerBox}>
              <div style={styles.dangerTitle}>Внимание</div>
              <div style={styles.dangerText}>
                Изтриването е необратимо. Всички ваши обяви и данни ще бъдат премахнати.
              </div>
            </div>
            <div style={{ marginTop: 16 }}>
              <div style={styles.label}>Въведи паролата си за потвърждение</div>
              <input
                type="password"
                value={deletePassword}
                onChange={(e) => setDeletePassword(e.target.value)}
                style={styles.input}
              />
            </div>
            {deleteError && <div style={{ ...styles.error, marginTop: 10 }}>{deleteError}</div>}
            <div style={{ marginTop: 12, display: "flex", gap: 12 }}>
              <button
                style={{ ...styles.button, background: "#dc2626" }}
                onClick={handleDeleteAccount}
                disabled={deleteLoading}
              >
                <Trash2 size={16} />
                {deleteLoading ? "Изтриване..." : "Изтрий акаунта"}
              </button>
              <button style={styles.buttonGhost} onClick={() => navigate("/")}>
                Отказ
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default SettingsPage;
