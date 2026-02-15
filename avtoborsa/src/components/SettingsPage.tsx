import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  AlertTriangle,
  CheckCircle2,
  Clock3,
  Lock,
  ShieldCheck,
  Trash2,
  Wallet,
  User,
} from "lucide-react";
import { useAuth } from "../context/AuthContext";

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || "http://localhost:8000";
const TRANSACTIONS_PER_PAGE = 5;

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
  const [transactionsPage, setTransactionsPage] = useState(1);
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

  useEffect(() => {
    if (activeTab !== "transactions") return;
    setTransactionsPage(1);
  }, [activeTab]);

  useEffect(() => {
    const totalPages = Math.max(1, Math.ceil(transactions.length / TRANSACTIONS_PER_PAGE));
    setTransactionsPage((prev) => Math.min(prev, totalPages));
  }, [transactions.length]);

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

  const statusIcon = (status: string) => {
    switch (status) {
      case "succeeded":
        return <CheckCircle2 size={12} />;
      case "pending":
        return <Clock3 size={12} />;
      case "failed":
      case "cancelled":
        return <AlertTriangle size={12} />;
      default:
        return <Clock3 size={12} />;
    }
  };

  const tabTitles: Record<TabKey, string> = {
    profile: "Профил",
    password: "Парола",
    transactions: "Транзакции",
    delete: "Изтриване",
  };

  const tabDescriptions: Record<TabKey, string> = {
    profile: "Управлявай личните си данни за контакт.",
    password: "Обнови достъпа си и защити профила си.",
    transactions: "Прегледай история на добавените средства.",
    delete: "Контролирай изтриването на профила си.",
  };

  const formatTransactionDateTime = (rawValue: string) => {
    const txDate = new Date(rawValue);
    if (Number.isNaN(txDate.getTime())) return "Невалидна дата";
    const datePart = txDate.toLocaleDateString("bg-BG");
    const timePart = txDate.toLocaleTimeString("bg-BG", {
      hour: "2-digit",
      minute: "2-digit",
    });
    return `${datePart} • ${timePart}`;
  };

  const globalCss = `
    @import url('https://fonts.googleapis.com/css2?family=Manrope:wght@400;500;600;700;800&family=Space+Grotesk:wght@500;600;700&display=swap');
    * { box-sizing: border-box; }
    body {
      margin: 0;
      font-family: "Manrope", "Segoe UI", sans-serif;
      background: linear-gradient(180deg, #eef2ff 0%, #f8fafc 30%, #f8fafc 100%);
      color: #0f172a;
    }
    .settings-tab { transition: all 0.2s ease; }
    .settings-tab:hover {
      border-color: #14b8a6 !important;
      color: #0f766e !important;
      transform: translateY(-1px);
    }
    .settings-input {
      transition: border-color 0.2s ease, box-shadow 0.2s ease, background-color 0.2s ease;
    }
    .settings-input:focus {
      border-color: #14b8a6 !important;
      box-shadow: 0 0 0 3px rgba(20, 184, 166, 0.15) !important;
      background-color: #ffffff;
    }
    .settings-primary-btn { transition: transform 0.2s ease, box-shadow 0.2s ease; }
    .settings-primary-btn:hover {
      transform: translateY(-1px);
      box-shadow: 0 10px 20px rgba(15, 118, 110, 0.2);
    }
    .settings-ghost-btn { transition: all 0.2s ease; }
    .settings-ghost-btn:hover {
      border-color: #cbd5e1 !important;
      background-color: #ffffff !important;
    }
    .transaction-row { transition: transform 0.2s ease, box-shadow 0.2s ease; }
    .transaction-row:hover {
      transform: translateY(-1px);
      box-shadow: 0 10px 16px rgba(15, 23, 42, 0.08);
    }
    .settings-pagination-btn {
      transition: all 0.2s ease;
    }
    .settings-pagination-btn:hover:not(:disabled) {
      border-color: #14b8a6 !important;
      color: #0f766e !important;
      transform: translateY(-1px);
    }
    .settings-pagination-btn:disabled {
      opacity: 0.45;
      cursor: not-allowed;
    }
  `;

  const styles: Record<string, React.CSSProperties> = {
    page: {
      minHeight: "100vh",
      width: "100%",
      background: "linear-gradient(180deg, #eef2ff 0%, #f8fafc 30%, #f8fafc 100%)",
    },
    container: { maxWidth: 1120, margin: "0 auto", padding: "34px 20px 72px" },
    hero: {
      position: "relative",
      background: "linear-gradient(145deg, #ffffff 0%, #f8fffd 100%)",
      borderRadius: 18,
      border: "1px solid #dbeafe",
      padding: "24px",
      boxShadow: "0 18px 36px rgba(15,23,42,0.08)",
      overflow: "hidden",
    },
    heroGlow: {
      position: "absolute",
      top: -48,
      right: -48,
      width: 180,
      height: 180,
      borderRadius: "50%",
      background: "radial-gradient(circle, rgba(45,212,191,0.2) 0%, rgba(45,212,191,0) 70%)",
      pointerEvents: "none",
    },
    heroTop: { position: "relative", zIndex: 1, display: "flex", alignItems: "center", justifyContent: "space-between", gap: 14, flexWrap: "wrap" },
    heroIdentity: {
      display: "inline-flex",
      alignItems: "center",
      gap: 8,
      background: "#ecfeff",
      border: "1px solid #a5f3fc",
      color: "#0f766e",
      borderRadius: 999,
      padding: "7px 12px",
      fontSize: 12,
      fontWeight: 700,
    },
    heroTitle: {
      fontSize: 26,
      fontWeight: 800,
      margin: 0,
      color: "#111827",
      fontFamily: "\"Space Grotesk\", \"Manrope\", sans-serif",
    },
    heroSubtitle: { marginTop: 8, fontSize: 14, color: "#475569", maxWidth: 540, lineHeight: 1.45, position: "relative", zIndex: 1 },
    tabs: {
      position: "relative",
      zIndex: 1,
      display: "grid",
      gridTemplateColumns: "repeat(auto-fit, minmax(160px, 1fr))",
      gap: 10,
      marginTop: 18,
    },
    tab: {
      padding: "12px 14px",
      borderRadius: 12,
      border: "1px solid #dbe4ef",
      background: "#f8fafc",
      fontSize: 13,
      fontWeight: 700,
      cursor: "pointer",
      color: "#334155",
      display: "flex",
      alignItems: "center",
      gap: 8,
      justifyContent: "center",
    },
    tabActive: {
      background: "linear-gradient(145deg, #0f766e 0%, #0d9488 100%)",
      borderColor: "#0f766e",
      color: "#fff",
      boxShadow: "0 10px 18px rgba(15,118,110,0.22)",
      transform: "translateY(-1px)",
    },
    section: {
      marginTop: 22,
      background: "#fff",
      borderRadius: 18,
      border: "1px solid #e2e8f0",
      padding: "22px",
      boxShadow: "0 14px 32px rgba(15,23,42,0.06)",
    },
    sectionHeader: {
      display: "flex",
      alignItems: "flex-start",
      justifyContent: "space-between",
      gap: 12,
      marginBottom: 14,
      flexWrap: "wrap",
    },
    sectionTitle: {
      fontSize: 18,
      fontWeight: 800,
      margin: 0,
      color: "#111827",
      fontFamily: "\"Space Grotesk\", \"Manrope\", sans-serif",
    },
    sectionDescription: {
      marginTop: 4,
      fontSize: 13,
      color: "#64748b",
      fontWeight: 500,
      lineHeight: 1.4,
      maxWidth: 580,
    },
    sectionBadge: {
      display: "inline-flex",
      alignItems: "center",
      gap: 6,
      padding: "7px 11px",
      borderRadius: 999,
      border: "1px solid #cbd5e1",
      background: "#f8fafc",
      color: "#475569",
      fontSize: 12,
      fontWeight: 700,
    },
    form: { marginTop: 14, display: "flex", flexDirection: "column", gap: 14 },
    label: { fontSize: 12, fontWeight: 800, color: "#64748b", letterSpacing: "0.2px", marginBottom: 6 },
    input: {
      width: "100%",
      padding: "13px 14px",
      borderRadius: 12,
      border: "1px solid #dbe3ed",
      fontSize: 14,
      outline: "none",
      fontFamily: "inherit",
      background: "#f8fafc",
      color: "#0f172a",
    },
    button: {
      padding: "12px 18px",
      borderRadius: 12,
      border: "none",
      background: "linear-gradient(145deg, #0f766e 0%, #0d9488 100%)",
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
      padding: "11px 16px",
      borderRadius: 12,
      border: "1px solid #dbe3ed",
      background: "#f8fafc",
      color: "#334155",
      fontWeight: 700,
      cursor: "pointer",
    },
    error: {
      padding: "10px 12px",
      borderRadius: 12,
      background: "#fef2f2",
      border: "1px solid #fecaca",
      color: "#b91c1c",
      fontSize: 13,
      fontWeight: 600,
    },
    success: {
      padding: "10px 12px",
      borderRadius: 12,
      background: "#ecfeff",
      border: "1px solid #99f6e4",
      color: "#0f766e",
      fontSize: 13,
      fontWeight: 600,
      display: "inline-flex",
      alignItems: "center",
      gap: 8,
    },
    transactionList: { marginTop: 16, display: "flex", flexDirection: "column", gap: 12 },
    transactionRow: {
      display: "flex",
      alignItems: "center",
      justifyContent: "space-between",
      gap: 14,
      padding: "14px 15px",
      background: "#ffffff",
      borderRadius: 14,
      border: "1px solid #e2e8f0",
    },
    transactionLeft: { display: "flex", alignItems: "center", gap: 12, minWidth: 0 },
    transactionIconWrap: {
      width: 36,
      height: 36,
      borderRadius: 10,
      background: "#f0fdfa",
      border: "1px solid #99f6e4",
      display: "grid",
      placeItems: "center",
      color: "#0f766e",
      flexShrink: 0,
    },
    transactionInfo: { minWidth: 0 },
    transactionTitle: { fontSize: 13, fontWeight: 800, color: "#0f172a" },
    transactionMeta: { fontSize: 12, color: "#64748b", display: "flex", gap: 8, alignItems: "center", marginTop: 2, flexWrap: "wrap" },
    transactionAmount: { fontSize: 16, fontWeight: 800, color: "#0f766e", whiteSpace: "nowrap" },
    statusPill: {
      display: "inline-flex",
      alignItems: "center",
      gap: 5,
      borderRadius: 999,
      background: "#f8fafc",
      border: "1px solid #e2e8f0",
      padding: "4px 9px",
      fontSize: 11,
      fontWeight: 800,
      letterSpacing: "0.2px",
    },
    paginationWrap: {
      marginTop: 14,
      display: "flex",
      alignItems: "center",
      justifyContent: "space-between",
      gap: 10,
      flexWrap: "wrap",
    },
    paginationInfo: {
      fontSize: 12,
      color: "#64748b",
      fontWeight: 700,
    },
    paginationControls: {
      display: "flex",
      alignItems: "center",
      gap: 8,
      flexWrap: "wrap",
    },
    paginationButton: {
      border: "1px solid #dbe3ed",
      background: "#ffffff",
      color: "#334155",
      borderRadius: 10,
      padding: "6px 10px",
      fontSize: 12,
      fontWeight: 700,
      cursor: "pointer",
      minWidth: 34,
      textAlign: "center",
    },
    paginationButtonActive: {
      borderColor: "#0f766e",
      background: "#ecfdf5",
      color: "#0f766e",
      boxShadow: "0 6px 12px rgba(15, 118, 110, 0.12)",
    },
    empty: { marginTop: 16, fontSize: 13, color: "#64748b", fontWeight: 600 },
    dangerBox: {
      border: "1px solid #fecaca",
      background: "#fff1f2",
      borderRadius: 14,
      padding: 16,
      marginTop: 16,
    },
    dangerTitle: { fontSize: 14, fontWeight: 800, color: "#b91c1c", display: "inline-flex", alignItems: "center", gap: 8 },
    dangerText: { fontSize: 13, color: "#7f1d1d", marginTop: 6, lineHeight: 1.45 },
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

  const totalTransactionPages = Math.max(1, Math.ceil(transactions.length / TRANSACTIONS_PER_PAGE));
  const currentTransactionsPage = Math.min(transactionsPage, totalTransactionPages);
  const transactionStartIndex = (currentTransactionsPage - 1) * TRANSACTIONS_PER_PAGE;
  const transactionEndIndex = transactionStartIndex + TRANSACTIONS_PER_PAGE;
  const visibleTransactions = transactions.slice(transactionStartIndex, transactionEndIndex);
  const visibleFrom = transactions.length === 0 ? 0 : transactionStartIndex + 1;
  const visibleTo = Math.min(transactionEndIndex, transactions.length);

  return (
    <div style={styles.page}>
      <style>{globalCss}</style>
      <div style={styles.container}>
        <div style={styles.hero}>
          <div style={styles.heroGlow} />
          <div style={styles.heroTop}>
            <div>
              <h1 style={styles.heroTitle}>Настройки</h1>
              <div style={styles.heroSubtitle}>
                Управлявай профила си, сигурността и плащанията от едно място. {tabDescriptions[activeTab]}
              </div>
            </div>
            <div style={styles.heroIdentity}>
              <ShieldCheck size={14} />
              {user.username || user.email}
            </div>
          </div>
          <div style={styles.tabs}>
            <button
              className="settings-tab"
              style={{ ...styles.tab, ...(activeTab === "profile" ? styles.tabActive : {}) }}
              onClick={() => setActiveTab("profile")}
            >
              <User size={16} />
              Профил
            </button>
            <button
              className="settings-tab"
              style={{ ...styles.tab, ...(activeTab === "password" ? styles.tabActive : {}) }}
              onClick={() => setActiveTab("password")}
            >
              <Lock size={16} />
              Парола
            </button>
            <button
              className="settings-tab"
              style={{ ...styles.tab, ...(activeTab === "transactions" ? styles.tabActive : {}) }}
              onClick={() => setActiveTab("transactions")}
            >
              <Wallet size={16} />
              Транзакции
            </button>
            <button
              className="settings-tab"
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
            <div style={styles.sectionHeader}>
              <div>
                <h2 style={styles.sectionTitle}>Профилни данни</h2>
                <div style={styles.sectionDescription}>Поддържай имената си актуални за по-добро доверие в обявите.</div>
              </div>
              <div style={styles.sectionBadge}>
                <User size={13} />
                {tabTitles.profile}
              </div>
            </div>
            <form style={styles.form} onSubmit={handleUpdateProfile}>
              {profileError && <div style={styles.error}>{profileError}</div>}
              {profileStatus && (
                <div style={styles.success}>
                  <CheckCircle2 size={15} />
                  {profileStatus}
                </div>
              )}
              <div>
                <div style={styles.label}>Първо име</div>
                <input
                  className="settings-input"
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
                  className="settings-input"
                  type="text"
                  value={lastName}
                  onChange={(e) => setLastName(e.target.value)}
                  style={styles.input}
                  placeholder="Напр. Иванов"
                />
              </div>
              <button className="settings-primary-btn" type="submit" style={styles.button} disabled={profileLoading}>
                <User size={16} />
                {profileLoading ? "Запис..." : "Запази"}
              </button>
            </form>
          </div>
        )}

        {activeTab === "password" && (
          <div style={styles.section}>
            <div style={styles.sectionHeader}>
              <div>
                <h2 style={styles.sectionTitle}>Смяна на парола</h2>
                <div style={styles.sectionDescription}>Използвай силна парола, за да защитиш профила и обявите си.</div>
              </div>
              <div style={styles.sectionBadge}>
                <Lock size={13} />
                {tabTitles.password}
              </div>
            </div>
            <form style={styles.form} onSubmit={handleChangePassword}>
              {passwordError && <div style={styles.error}>{passwordError}</div>}
              {passwordStatus && (
                <div style={styles.success}>
                  <CheckCircle2 size={15} />
                  {passwordStatus}
                </div>
              )}
              <div>
                <div style={styles.label}>Стара парола</div>
                <input
                  className="settings-input"
                  type="password"
                  value={oldPassword}
                  onChange={(e) => setOldPassword(e.target.value)}
                  style={styles.input}
                />
              </div>
              <div>
                <div style={styles.label}>Нова парола</div>
                <input
                  className="settings-input"
                  type="password"
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  style={styles.input}
                />
              </div>
              <div>
                <div style={styles.label}>Потвърди новата парола</div>
                <input
                  className="settings-input"
                  type="password"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  style={styles.input}
                />
              </div>
              <button className="settings-primary-btn" type="submit" style={styles.button} disabled={passwordLoading}>
                <Lock size={16} />
                {passwordLoading ? "Запазване..." : "Смени паролата"}
              </button>
            </form>
          </div>
        )}

        {activeTab === "transactions" && (
          <div style={styles.section}>
            <div style={styles.sectionHeader}>
              <div>
                <h2 style={styles.sectionTitle}>Транзакции</h2>
                <div style={styles.sectionDescription}>Хронология на добавените средства с точна дата и час.</div>
              </div>
              <div style={styles.sectionBadge}>
                <Wallet size={13} />
                {tabTitles.transactions}
              </div>
            </div>
            {loadingTransactions ? (
              <div style={styles.empty}>Зареждане...</div>
            ) : txError ? (
              <div style={styles.error}>{txError}</div>
            ) : transactions.length === 0 ? (
              <div style={styles.empty}>Няма налични транзакции.</div>
            ) : (
              <>
                <div style={styles.transactionList}>
                  {visibleTransactions.map((tx) => {
                    const txColor = statusColor(tx.status);
                    return (
                      <div key={tx.id} style={styles.transactionRow} className="transaction-row">
                        <div style={styles.transactionLeft}>
                          <div style={styles.transactionIconWrap}>
                            <Wallet size={16} />
                          </div>
                          <div style={styles.transactionInfo}>
                            <div style={styles.transactionTitle}>Добавени средства</div>
                            <div style={styles.transactionMeta}>
                              <span style={{ display: "inline-flex", alignItems: "center", gap: 4 }}>
                                <Clock3 size={12} />
                                {formatTransactionDateTime(tx.created_at)}
                              </span>
                              <span
                                style={{
                                  ...styles.statusPill,
                                  color: txColor,
                                  borderColor: `${txColor}55`,
                                  backgroundColor: `${txColor}12`,
                                }}
                              >
                                {statusIcon(tx.status)}
                                {statusLabel(tx.status)}
                              </span>
                            </div>
                          </div>
                        </div>
                        <div style={styles.transactionAmount}>+{amountLabel(tx)}</div>
                      </div>
                    );
                  })}
                </div>
                {totalTransactionPages > 1 && (
                  <div style={styles.paginationWrap}>
                    <div style={styles.paginationInfo}>
                      Показани {visibleFrom}-{visibleTo} от {transactions.length}
                    </div>
                    <div style={styles.paginationControls}>
                      <button
                        type="button"
                        className="settings-pagination-btn"
                        style={styles.paginationButton}
                        disabled={currentTransactionsPage <= 1}
                        onClick={() => setTransactionsPage((prev) => Math.max(1, prev - 1))}
                      >
                        Назад
                      </button>
                      {Array.from({ length: totalTransactionPages }, (_, index) => {
                        const pageNumber = index + 1;
                        return (
                          <button
                            key={pageNumber}
                            type="button"
                            className="settings-pagination-btn"
                            style={{
                              ...styles.paginationButton,
                              ...(pageNumber === currentTransactionsPage ? styles.paginationButtonActive : {}),
                            }}
                            onClick={() => setTransactionsPage(pageNumber)}
                          >
                            {pageNumber}
                          </button>
                        );
                      })}
                      <button
                        type="button"
                        className="settings-pagination-btn"
                        style={styles.paginationButton}
                        disabled={currentTransactionsPage >= totalTransactionPages}
                        onClick={() => setTransactionsPage((prev) => Math.min(totalTransactionPages, prev + 1))}
                      >
                        Напред
                      </button>
                    </div>
                  </div>
                )}
              </>
            )}
          </div>
        )}

        {activeTab === "delete" && (
          <div style={styles.section}>
            <div style={styles.sectionHeader}>
              <div>
                <h2 style={styles.sectionTitle}>Изтриване на акаунт</h2>
                <div style={styles.sectionDescription}>Крайна стъпка, която премахва профила и всички свързани данни.</div>
              </div>
              <div style={styles.sectionBadge}>
                <Trash2 size={13} />
                {tabTitles.delete}
              </div>
            </div>
            <div style={styles.dangerBox}>
              <div style={styles.dangerTitle}>
                <AlertTriangle size={14} />
                Внимание
              </div>
              <div style={styles.dangerText}>
                Изтриването е необратимо. Всички ваши обяви и данни ще бъдат премахнати.
              </div>
            </div>
            <div style={{ marginTop: 16 }}>
              <div style={styles.label}>Въведи паролата си за потвърждение</div>
              <input
                className="settings-input"
                type="password"
                value={deletePassword}
                onChange={(e) => setDeletePassword(e.target.value)}
                style={styles.input}
              />
            </div>
            {deleteError && <div style={{ ...styles.error, marginTop: 10 }}>{deleteError}</div>}
            <div style={{ marginTop: 12, display: "flex", gap: 12 }}>
              <button
                className="settings-primary-btn"
                style={{ ...styles.button, background: "linear-gradient(145deg, #dc2626 0%, #ef4444 100%)" }}
                onClick={handleDeleteAccount}
                disabled={deleteLoading}
              >
                <Trash2 size={16} />
                {deleteLoading ? "Изтриване..." : "Изтрий акаунта"}
              </button>
              <button className="settings-ghost-btn" style={styles.buttonGhost} onClick={() => navigate("/")}>
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
