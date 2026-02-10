import React, { useEffect, useState } from "react";
import { BadgePercent, Coins, CreditCard, ShieldCheck, X } from "lucide-react";

interface TopUpModalProps {
  onClose: () => void;
  onSuccess: () => void;
}

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || "http://localhost:8000";
const STRIPE_CHECKOUT_ENDPOINT =
  import.meta.env.VITE_STRIPE_CHECKOUT_ENDPOINT ||
  `${API_BASE_URL}/api/payments/create-checkout-session/`;
const STRIPE_SESSION_STORAGE_KEY = "stripe_checkout_session_id";
const MAX_TOPUP_AMOUNT = 999_999.99;

type StripeCheckoutResponse = {
  url?: string;
  session_id?: string;
  error?: string;
};

type PresetAmount = {
  value: number;
  label: string;
  tag?: string;
};

type BonusOption = {
  id: string;
  title: string;
  description: string;
  percent: number;
  minAmount: number;
  tag?: string;
};

const PRESET_AMOUNTS: PresetAmount[] = [
  { value: 10, label: "Старт", tag: "Лесно начало" },
  { value: 25, label: "Популярен", tag: "Най-често" },
  { value: 50, label: "Стандарт", tag: "Най-добра стойност" },
  { value: 100, label: "Про", tag: "За активни" },
  { value: 200, label: "Бизнес", tag: "Максимум" },
];

const BONUS_OPTIONS: BonusOption[] = [
  {
    id: "standard",
    title: "Стандарт",
    description: "Без бонус, бързо зареждане.",
    percent: 0,
    minAmount: 0,
    tag: "Базово",
  },
  {
    id: "boost",
    title: "Буст",
    description: "Подходящ за активни обяви.",
    percent: 0.05,
    minAmount: 50,
    tag: "+5%",
  },
  {
    id: "turbo",
    title: "Турбо",
    description: "Максимална стойност за зареждане.",
    percent: 0.1,
    minAmount: 120,
    tag: "+10%",
  },
];

const currencyFormatter = new Intl.NumberFormat("bg-BG", {
  style: "currency",
  currency: "EUR",
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
});

const formatCurrency = (value: number) => currencyFormatter.format(value);

const normalizeAmountInput = (value: string) =>
  value.replace(/\s+/g, "").replace(",", ".");

const parseAmount = (value: string) => {
  const normalized = normalizeAmountInput(value);
  if (!normalized) return null;
  const parsed = Number.parseFloat(normalized);
  if (!Number.isFinite(parsed)) return null;
  return parsed;
};

const roundToCents = (value: number) => Math.round(value * 100) / 100;

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
  const [activePreset, setActivePreset] = useState<number | null>(null);
  const [selectedBonusId, setSelectedBonusId] = useState(BONUS_OPTIONS[0].id);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState(false);

  const amountValue = parseAmount(amount) ?? 0;
  const selectedBonus =
    BONUS_OPTIONS.find((option) => option.id === selectedBonusId) ?? BONUS_OPTIONS[0];
  const isBonusEligible = amountValue >= selectedBonus.minAmount;
  const bonusAmount = isBonusEligible
    ? roundToCents(amountValue * selectedBonus.percent)
    : 0;
  const totalCredit = roundToCents(amountValue + bonusAmount);
  const isAmountValid = amountValue > 0 && amountValue <= MAX_TOPUP_AMOUNT;

  const nextBonus = BONUS_OPTIONS.filter((option) => option.percent > 0)
    .slice()
    .sort((a, b) => a.minAmount - b.minAmount)
    .find((option) => amountValue > 0 && amountValue < option.minAmount);

  useEffect(() => {
    const current = BONUS_OPTIONS.find((option) => option.id === selectedBonusId);
    if (current && current.minAmount > 0 && amountValue < current.minAmount) {
      setSelectedBonusId(BONUS_OPTIONS[0].id);
    }
  }, [amountValue, selectedBonusId]);

  const handlePresetClick = (value: number) => {
    setAmount(String(value));
    setActivePreset(value);
    setError("");
  };

  const handleAmountChange = (value: string) => {
    const normalized = normalizeAmountInput(value);
    if (normalized && !/^\d*(\.\d{0,2})?$/.test(normalized)) {
      return;
    }
    setAmount(normalized);
    setActivePreset(null);
    setError("");
  };

  const handleTopUp = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setSuccess(false);

    if (!amount.trim()) {
      setError("Моля, въведете сума.");
      return;
    }

    const parsedAmount = parseAmount(amount);
    if (!parsedAmount || parsedAmount <= 0) {
      setError("Сумата трябва да е положително число.");
      return;
    }

    if (parsedAmount > MAX_TOPUP_AMOUNT) {
      setError("Сумата надвишава максималния лимит (999 999.99 EUR).");
      return;
    }

    setIsLoading(true);

    try {
      const token = localStorage.getItem("authToken");
      if (!token) {
        throw new Error("Липсва сесия за вход. Моля, влезте отново.");
      }

      const currentUrl = `${window.location.origin}${window.location.pathname}`;
      const response = await fetch(STRIPE_CHECKOUT_ENDPOINT, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Token ${token}`,
        },
        body: JSON.stringify({
          amount: parsedAmount,
          bonus_id: selectedBonus.id,
          bonus_percent: selectedBonus.percent,
          bonus_amount: bonusAmount,
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
          extractErrorMessage(data, "Неуспешно създаване на сесия за плащане.")
        );
      }

      const checkoutUrl = data.url;
      if (!checkoutUrl) {
        throw new Error("Липсва линк за плащане от сървъра.");
      }

      const sessionId = data.session_id;
      if (sessionId) {
        localStorage.setItem(STRIPE_SESSION_STORAGE_KEY, sessionId);
      }

      setSuccess(true);
      setAmount("");
      setActivePreset(null);
      onSuccess();
      window.location.assign(checkoutUrl);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Възникна грешка.");
    } finally {
      setIsLoading(false);
    }
  };

  const styles: Record<string, React.CSSProperties> = {
    overlay: {
      position: "fixed",
      inset: 0,
      background: "rgba(15, 23, 42, 0.65)",
      backdropFilter: "blur(4px)",
      display: "flex",
      alignItems: "center",
      justifyContent: "center",
      zIndex: 2000,
      padding: "24px",
    },
    modal: {
      width: "min(720px, 96vw)",
      background: "#fff",
      borderRadius: 20,
      boxShadow: "0 30px 80px rgba(15, 23, 42, 0.35)",
      overflow: "hidden",
      maxHeight: "92vh",
      display: "flex",
      flexDirection: "column",
      fontFamily: "\"Manrope\", \"Segoe UI\", sans-serif",
    },
    header: {
      padding: "24px 24px 18px",
      color: "#fff",
      backgroundImage:
        "radial-gradient(circle at top right, rgba(255,255,255,0.35), transparent 45%), linear-gradient(120deg, #0f766e 0%, #14b8a6 55%, #5eead4 100%)",
    },
    headerRow: {
      display: "flex",
      alignItems: "flex-start",
      justifyContent: "space-between",
      gap: 16,
    },
    headerBadge: {
      display: "inline-flex",
      alignItems: "center",
      gap: 8,
      padding: "6px 12px",
      borderRadius: 999,
      background: "rgba(255,255,255,0.2)",
      fontSize: 12,
      fontWeight: 700,
      textTransform: "uppercase",
      letterSpacing: "0.4px",
    },
    title: {
      margin: "12px 0 8px",
      fontSize: 24,
      fontWeight: 800,
    },
    subtitle: {
      margin: 0,
      fontSize: 14,
      lineHeight: 1.5,
      opacity: 0.9,
      maxWidth: 420,
    },
    closeButton: {
      border: "1px solid #ef4444",
      background: "#ef4444",
      color: "#fff",
      borderRadius: 999,
      padding: "6px 12px",
      display: "inline-flex",
      alignItems: "center",
      justifyContent: "center",
      gap: 8,
      cursor: "pointer",
      fontSize: 12,
      fontWeight: 700,
      textTransform: "uppercase",
      letterSpacing: "0.4px",
      transition: "transform 0.2s ease, background 0.2s ease",
    },
    content: {
      padding: "22px 24px 24px",
      background: "#f8fafc",
      display: "flex",
      flexDirection: "column",
      gap: 16,
      flex: 1,
      minHeight: 0,
      overflowY: "auto",
      WebkitOverflowScrolling: "touch",
    },
    success: {
      background: "#ecfdf5",
      border: "1px solid #bbf7d0",
      color: "#0f766e",
      padding: "10px 12px",
      borderRadius: 10,
      fontSize: 13,
      fontWeight: 600,
    },
    error: {
      background: "#fef2f2",
      border: "1px solid #fecaca",
      color: "#b91c1c",
      padding: "10px 12px",
      borderRadius: 10,
      fontSize: 13,
      fontWeight: 600,
    },
    form: {
      display: "flex",
      flexDirection: "column",
      gap: 16,
    },
    sectionCard: {
      background: "#fff",
      borderRadius: 16,
      padding: 16,
      border: "1px solid #e2e8f0",
      boxShadow: "0 8px 20px rgba(15, 23, 42, 0.06)",
    },
    sectionTitle: {
      fontSize: 14,
      fontWeight: 800,
      color: "#0f172a",
      display: "flex",
      alignItems: "center",
      gap: 8,
    },
    sectionSubtitle: {
      margin: "6px 0 0",
      fontSize: 12,
      color: "#64748b",
    },
    amountGrid: {
      marginTop: 12,
      display: "grid",
      gridTemplateColumns: "repeat(auto-fit, minmax(120px, 1fr))",
      gap: 10,
    },
    amountButton: {
      border: "1px solid #e2e8f0",
      borderRadius: 12,
      padding: "12px",
      background: "#fff",
      cursor: "pointer",
      display: "flex",
      flexDirection: "column",
      gap: 6,
      textAlign: "left",
      transition: "all 0.2s ease",
    },
    amountButtonActive: {
      borderColor: "#0f766e",
      background: "#f0fdfa",
      boxShadow: "0 0 0 3px rgba(15, 118, 110, 0.18)",
    },
    amountValue: {
      fontSize: 16,
      fontWeight: 800,
      color: "#0f172a",
    },
    amountLabel: {
      fontSize: 12,
      color: "#475569",
      fontWeight: 600,
    },
    amountTag: {
      alignSelf: "flex-start",
      fontSize: 11,
      fontWeight: 700,
      color: "#0f766e",
      background: "rgba(15, 118, 110, 0.12)",
      padding: "2px 8px",
      borderRadius: 999,
    },
    customInputRow: {
      marginTop: 14,
      display: "flex",
      flexDirection: "column",
      gap: 8,
    },
    inputLabel: {
      fontSize: 12,
      fontWeight: 700,
      color: "#0f172a",
    },
    inputWrap: {
      display: "flex",
      alignItems: "center",
      gap: 8,
      border: "1px solid #e2e8f0",
      borderRadius: 12,
      padding: "10px 12px",
      background: "#fff",
    },
    inputPrefix: {
      fontSize: 14,
      fontWeight: 800,
      color: "#0f766e",
    },
    input: {
      flex: 1,
      border: "none",
      outline: "none",
      fontSize: 15,
      fontWeight: 600,
      background: "transparent",
    },
    hint: {
      fontSize: 11,
      color: "#64748b",
    },
    bonusGrid: {
      marginTop: 12,
      display: "grid",
      gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))",
      gap: 12,
    },
    bonusCard: {
      border: "1px solid #e2e8f0",
      borderRadius: 14,
      padding: "12px",
      background: "#fff",
      display: "flex",
      flexDirection: "column",
      gap: 6,
      textAlign: "left",
      cursor: "pointer",
      transition: "all 0.2s ease",
      minHeight: 120,
    },
    bonusCardSelected: {
      borderColor: "#dc2626",
      boxShadow: "0 0 0 3px rgba(220, 38, 38, 0.18)",
      background: "#fef2f2",
    },
    bonusCardDisabled: {
      opacity: 0.55,
      cursor: "not-allowed",
      background: "#f8fafc",
    },
    bonusHeaderRow: {
      display: "flex",
      justifyContent: "space-between",
      gap: 8,
      alignItems: "center",
    },
    bonusTitle: {
      fontSize: 14,
      fontWeight: 800,
      color: "#0f172a",
    },
    bonusTag: {
      fontSize: 11,
      fontWeight: 700,
      color: "#b91c1c",
      background: "rgba(239, 68, 68, 0.12)",
      padding: "2px 8px",
      borderRadius: 999,
    },
    bonusValue: {
      fontSize: 20,
      fontWeight: 800,
      color: "#dc2626",
    },
    bonusDesc: {
      fontSize: 12,
      color: "#475569",
      lineHeight: 1.4,
    },
    bonusRequirement: {
      fontSize: 11,
      color: "#94a3b8",
      fontWeight: 600,
    },
    bonusHint: {
      marginTop: 12,
      fontSize: 12,
      color: "#b91c1c",
      background: "rgba(239, 68, 68, 0.08)",
      borderRadius: 10,
      padding: "8px 10px",
      fontWeight: 600,
    },
    summaryCard: {
      background: "linear-gradient(135deg, #0f172a 0%, #0f766e 100%)",
      borderRadius: 16,
      padding: 16,
      color: "#fff",
      display: "flex",
      flexDirection: "column",
      gap: 8,
    },
    summaryTitle: {
      fontSize: 13,
      fontWeight: 700,
      opacity: 0.85,
    },
    summaryRow: {
      display: "flex",
      justifyContent: "space-between",
      fontSize: 13,
      color: "rgba(255,255,255,0.8)",
    },
    summaryBonus: {
      color: "#fecaca",
    },
    summaryDivider: {
      height: 1,
      background: "rgba(255,255,255,0.2)",
      margin: "6px 0",
    },
    summaryTotalRow: {
      display: "flex",
      justifyContent: "space-between",
      fontSize: 16,
      fontWeight: 800,
    },
    summaryFoot: {
      marginTop: 6,
      fontSize: 12,
      color: "rgba(255,255,255,0.8)",
      display: "flex",
      alignItems: "center",
      gap: 6,
    },
    securityRow: {
      display: "flex",
      alignItems: "center",
      gap: 10,
      background: "#ecfdf5",
      border: "1px solid #bbf7d0",
      color: "#0f766e",
      padding: "10px 12px",
      borderRadius: 12,
      fontSize: 12,
      fontWeight: 600,
    },
    buttonGroup: {
      display: "flex",
      gap: 12,
      marginTop: 6,
    },
    cancelButton: {
      flex: 1,
      padding: "12px 16px",
      borderRadius: 10,
      border: "1px solid #e2e8f0",
      background: "#fff",
      color: "#0f172a",
      fontSize: 14,
      fontWeight: 700,
      cursor: "pointer",
    },
    submitButton: {
      flex: 1,
      padding: "12px 16px",
      borderRadius: 10,
      border: "none",
      background: "linear-gradient(120deg, #0f766e 0%, #14b8a6 100%)",
      color: "#fff",
      fontSize: 14,
      fontWeight: 800,
      cursor: "pointer",
      boxShadow: "0 10px 24px rgba(15, 118, 110, 0.3)",
    },
    submitButtonDisabled: {
      background: "#cbd5f5",
      boxShadow: "none",
      cursor: "not-allowed",
    },
  };

  return (
    <div style={styles.overlay} onClick={onClose}>
      <div style={styles.modal} onClick={(e) => e.stopPropagation()}>
        <div style={styles.header}>
          <div style={styles.headerRow}>
            <div>
              <div style={styles.headerBadge}>
                <Coins size={14} />
                Баланс
              </div>
              <h2 style={styles.title}>Зареди баланса си</h2>
              <p style={styles.subtitle}>
                Избери сума и бонус пакет. Ще бъдеш пренасочен към защитено
                плащане със Stripe.
              </p>
            </div>
            <button
              type="button"
              style={styles.closeButton}
              onClick={onClose}
              onMouseEnter={(e) => {
                e.currentTarget.style.transform = "scale(1.03)";
                e.currentTarget.style.background = "#ef4444";
                e.currentTarget.style.borderColor = "#ef4444";
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.transform = "scale(1)";
                e.currentTarget.style.background = "#ef4444";
                e.currentTarget.style.borderColor = "#ef4444";
              }}
            >
              <X size={14} color="#fff" />
              Затвори
            </button>
          </div>
        </div>

        <div style={styles.content}>
          {success && (
            <div style={styles.success}>Пренасочваме те към Stripe…</div>
          )}
          {error && <div style={styles.error}>Грешка: {error}</div>}

          <form style={styles.form} onSubmit={handleTopUp}>
            <div style={styles.sectionCard}>
              <div style={styles.sectionTitle}>
                <Coins size={16} />
                Готови суми
              </div>
              <div style={styles.amountGrid}>
                {PRESET_AMOUNTS.map((preset) => (
                  <button
                    key={preset.value}
                    type="button"
                    style={{
                      ...styles.amountButton,
                      ...(activePreset === preset.value
                        ? styles.amountButtonActive
                        : {}),
                    }}
                    onClick={() => handlePresetClick(preset.value)}
                    disabled={isLoading || success}
                  >
                    <div style={styles.amountValue}>
                      {formatCurrency(preset.value)}
                    </div>
                    <div style={styles.amountLabel}>{preset.label}</div>
                    {preset.tag && <span style={styles.amountTag}>{preset.tag}</span>}
                  </button>
                ))}
              </div>

              <div style={styles.customInputRow}>
                <label style={styles.inputLabel} htmlFor="topup-amount">
                  Друга сума
                </label>
                <div style={styles.inputWrap}>
                  <span style={styles.inputPrefix}>€</span>
                  <input
                    id="topup-amount"
                    type="text"
                    inputMode="decimal"
                    placeholder="Въведи сума"
                    value={amount}
                    onChange={(e) => handleAmountChange(e.target.value)}
                    style={styles.input}
                    disabled={isLoading || success}
                  />
                </div>
                <div style={styles.hint}>
                  Минимум 1€, максимум 999 999.99€
                </div>
              </div>
            </div>

            <div style={styles.sectionCard}>
              <div style={styles.sectionTitle}>
                <BadgePercent size={16} />
                Бонус пакети
              </div>
              <p style={styles.sectionSubtitle}>
                Избери промо бонус и виж крайния баланс.
              </p>
              <div style={styles.bonusGrid}>
                {BONUS_OPTIONS.map((option) => {
                  const isDisabled =
                    option.minAmount > 0 && amountValue < option.minAmount;
                  const isSelected = option.id === selectedBonusId;

                  return (
                    <button
                      key={option.id}
                      type="button"
                      style={{
                        ...styles.bonusCard,
                        ...(isSelected ? styles.bonusCardSelected : {}),
                        ...(isDisabled ? styles.bonusCardDisabled : {}),
                      }}
                      disabled={isDisabled || isLoading || success}
                      onClick={() => setSelectedBonusId(option.id)}
                    >
                      <div style={styles.bonusHeaderRow}>
                        <div style={styles.bonusTitle}>{option.title}</div>
                        {option.tag && <span style={styles.bonusTag}>{option.tag}</span>}
                      </div>
                      <div style={styles.bonusValue}>
                        +{Math.round(option.percent * 100)}%
                      </div>
                      <div style={styles.bonusDesc}>{option.description}</div>
                      {option.minAmount > 0 && (
                        <div style={styles.bonusRequirement}>
                          Мин. сума {formatCurrency(option.minAmount)}
                        </div>
                      )}
                    </button>
                  );
                })}
              </div>
              {nextBonus && (
                <div style={styles.bonusHint}>
                  Увеличи сумата до {formatCurrency(nextBonus.minAmount)}, за да
                  отключиш {Math.round(nextBonus.percent * 100)}% бонус.
                </div>
              )}
            </div>

            <div style={styles.summaryCard}>
              <div style={styles.summaryTitle}>Резюме</div>
              <div style={styles.summaryRow}>
                <span>Сума за зареждане</span>
                <strong>
                  {amountValue > 0 ? formatCurrency(amountValue) : "—"}
                </strong>
              </div>
              <div style={styles.summaryRow}>
                <span>Бонус</span>
                <strong style={styles.summaryBonus}>
                  {amountValue > 0 ? `+${formatCurrency(bonusAmount)}` : "—"}
                </strong>
              </div>
              <div style={styles.summaryDivider} />
              <div style={styles.summaryTotalRow}>
                <span>Общо към баланс</span>
                <strong>
                  {amountValue > 0 ? formatCurrency(totalCredit) : "—"}
                </strong>
              </div>
              <div style={styles.summaryFoot}>
                <CreditCard size={14} />
                Общо за плащане:
                <strong>
                  {amountValue > 0 ? formatCurrency(amountValue) : "—"}
                </strong>
              </div>
            </div>

            <div style={styles.securityRow}>
              <ShieldCheck size={16} />
              Плащането се обработва от Stripe. Ние не съхраняваме данни за
              картата.
            </div>

            <div style={styles.buttonGroup}>
              <button
                type="button"
                style={styles.cancelButton}
                onClick={onClose}
                disabled={isLoading}
              >
                Отказ
              </button>
              <button
                type="submit"
                style={{
                  ...styles.submitButton,
                  ...(isLoading || success || !isAmountValid
                    ? styles.submitButtonDisabled
                    : {}),
                }}
                disabled={isLoading || success || !isAmountValid}
              >
                {isLoading ? "Пренасочване..." : "Продължи към плащане"}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
};

export default TopUpModal;
