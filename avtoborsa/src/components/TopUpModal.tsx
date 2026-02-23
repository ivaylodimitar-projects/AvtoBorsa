import React, { useEffect, useState } from "react";
import { BadgePercent, Coins, CreditCard, ShieldCheck } from "lucide-react";
import { API_BASE_URL } from "../config/api";

interface TopUpModalProps {
  onClose: () => void;
  onSuccess: () => void;
}

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
  { value: 5, label: "Старт" },
  { value: 10, label: "Популярен", tag: "Най-популярен" },
  { value: 50, label: "Стандарт" },
  { value: 120, label: "Про" },
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

const getAutoBonusIdForAmount = (amountValue: number) => {
  const eligibleBonuses = BONUS_OPTIONS.slice()
    .sort((a, b) => b.minAmount - a.minAmount)
    .filter((option) => amountValue >= option.minAmount);
  return eligibleBonuses[0]?.id ?? BONUS_OPTIONS[0].id;
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
  const [activePreset, setActivePreset] = useState<number | null>(null);
  const [selectedBonusId, setSelectedBonusId] = useState(BONUS_OPTIONS[0].id);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState(false);
  const [isCloseHovered, setIsCloseHovered] = useState(false);

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
    const autoBonusId = getAutoBonusIdForAmount(amountValue);
    if (autoBonusId !== selectedBonusId) {
      setSelectedBonusId(autoBonusId);
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
    const parsed = parseAmount(normalized);
    const matchedPreset = PRESET_AMOUNTS.find((preset) => preset.value === parsed)?.value ?? null;
    setActivePreset(matchedPreset);
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
          Authorization: `Bearer ${token}`,
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
      background: "rgba(15, 23, 42, 0.5)",
      backdropFilter: "blur(2px)",
      display: "flex",
      alignItems: "center",
      justifyContent: "center",
      zIndex: 2000,
      padding: "20px",
    },
    modal: {
      width: "min(660px, 96vw)",
      background: "#ffffff",
      borderRadius: 16,
      border: "1px solid #d1fae5",
      boxShadow: "0 24px 60px rgba(15, 23, 42, 0.22)",
      maxHeight: "92vh",
      overflow: "hidden",
      display: "flex",
      flexDirection: "column",
      fontFamily: "\"Manrope\", \"Segoe UI\", sans-serif",
    },
    header: {
      padding: "20px 22px 18px",
      background: "#ffffff",
      borderBottom: "1px solid #ecfdf5",
    },
    headerTop: {
      display: "flex",
      alignItems: "flex-start",
      justifyContent: "space-between",
      gap: 16,
    },
    headerBadge: {
      display: "inline-flex",
      alignItems: "center",
      gap: 6,
      borderRadius: 999,
      border: "1px solid #a7f3d0",
      background: "#ecfdf5",
      color: "#065f46",
      fontSize: 11,
      fontWeight: 700,
      padding: "4px 10px",
      letterSpacing: "0.2px",
      textTransform: "uppercase",
    },
    headerBadgeAlt: {
      display: "inline-flex",
      alignItems: "center",
      borderRadius: 999,
      border: "1px solid #d1d5db",
      background: "#ffffff",
      color: "#475569",
      fontSize: 11,
      fontWeight: 700,
      padding: "4px 10px",
      textTransform: "uppercase",
      letterSpacing: "0.2px",
    },
    title: {
      margin: "12px 0 8px",
      color: "#0f172a",
      fontSize: 24,
      fontWeight: 800,
      letterSpacing: "-0.2px",
    },
    subtitle: {
      margin: 0,
      color: "#475569",
      fontSize: 13,
      lineHeight: 1.55,
      maxWidth: 470,
    },
    closeButton: {
      width: 34,
      height: 34,
      borderRadius: 16,
      border: "1px solid #a8adb3",
      background: "#f1f5f9",
      color: "#1f2937",
      cursor: "pointer",
      display: "inline-flex",
      alignItems: "center",
      justifyContent: "center",
      flexShrink: 0,
      transition: "color 0.18s ease, background-color 0.18s ease, border-color 0.18s ease",
    },
    closeButtonHover: {
      color: "#dc2626",
      background: "#fef2f2",
      borderColor: "#fecaca",
    },
    closeButtonGlyph: {
      fontSize: 22,
      lineHeight: 1,
      fontWeight: 700,
      display: "inline-flex",
      alignItems: "center",
      justifyContent: "center",
      transform: "translateY(-1px)",
    },
    content: {
      padding: "18px 22px 22px",
      background: "#ffffff",
      display: "flex",
      flexDirection: "column",
      gap: 14,
      flex: 1,
      minHeight: 0,
      overflowY: "auto",
      WebkitOverflowScrolling: "touch",
    },
    success: {
      background: "#ecfdf5",
      border: "1px solid #a7f3d0",
      color: "#065f46",
      borderRadius: 16,
      padding: "10px 12px",
      fontSize: 13,
      fontWeight: 600,
    },
    error: {
      background: "#fef2f2",
      border: "1px solid #fecaca",
      color: "#b91c1c",
      borderRadius: 16,
      padding: "10px 12px",
      fontSize: 13,
      fontWeight: 600,
    },
    form: {
      display: "flex",
      flexDirection: "column",
      gap: 12,
    },
    sectionCard: {
      background: "#ffffff",
      borderRadius: 16,
      border: "1px solid #e5e7eb",
      padding: 14,
      boxShadow: "0 1px 2px rgba(15, 23, 42, 0.04)",
    },
    sectionTitle: {
      color: "#0f172a",
      fontSize: 14,
      fontWeight: 800,
      display: "inline-flex",
      alignItems: "center",
      gap: 8,
    },
    sectionSubtitle: {
      margin: "6px 0 0",
      color: "#64748b",
      fontSize: 12,
    },
    amountGrid: {
      marginTop: 12,
      display: "grid",
      gridTemplateColumns: "repeat(auto-fit, minmax(120px, 1fr))",
      gap: 8,
    },
    amountButton: {
      border: "1px solid #e5e7eb",
      borderRadius: 16,
      padding: "12px",
      background: "#ffffff",
      cursor: "pointer",
      display: "flex",
      flexDirection: "column",
      gap: 5,
      textAlign: "left",
      fontFamily: "\"Space Grotesk\", \"Manrope\", \"Segoe UI\", sans-serif",
      transition: "border-color 0.18s ease, background 0.18s ease",
    },
    amountButtonActive: {
      borderColor: "#0f766e",
      background: "#ecfdf5",
      boxShadow: "0 0 0 2px rgba(15, 118, 110, 0.14)",
    },
    amountValue: {
      fontSize: 18,
      fontWeight: 800,
      color: "#0f172a",
      lineHeight: 1.1,
    },
    amountLabel: {
      fontSize: 13,
      color: "#64748b",
      fontWeight: 700,
    },
    amountTag: {
      alignSelf: "flex-start",
      borderRadius: 999,
      background: "#d1fae5",
      color: "#065f46",
      fontSize: 10,
      fontWeight: 700,
      padding: "2px 8px",
    },
    customInputRow: {
      marginTop: 12,
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
      borderRadius: 16,
      border: "1px solid #d1d5db",
      background: "#ffffff",
      padding: "10px 12px",
    },
    inputPrefix: {
      color: "#0f766e",
      fontSize: 14,
      fontWeight: 800,
    },
    input: {
      flex: 1,
      border: "none",
      outline: "none",
      fontSize: 15,
      fontWeight: 600,
      background: "transparent",
      color: "#0f172a",
    },
    hint: {
      fontSize: 11,
      color: "#64748b",
      fontWeight: 600,
    },
    bonusGrid: {
      marginTop: 12,
      display: "grid",
      gridTemplateColumns: "repeat(auto-fit, minmax(160px, 1fr))",
      gap: 10,
    },
    bonusCard: {
      border: "1px solid #e5e7eb",
      borderRadius: 16,
      padding: "13px",
      background: "#ffffff",
      display: "flex",
      flexDirection: "column",
      gap: 6,
      textAlign: "left",
      cursor: "pointer",
      fontFamily: "\"Space Grotesk\", \"Manrope\", \"Segoe UI\", sans-serif",
      transition: "border-color 0.18s ease, background 0.18s ease",
      minHeight: 112,
    },
    bonusCardSelected: {
      borderColor: "#0f766e",
      background: "#ecfdf5",
      boxShadow: "0 0 0 2px rgba(15, 118, 110, 0.14)",
    },
    bonusCardMuted: {
      opacity: 0.45,
      background: "#f8fafc",
      borderColor: "#e2e8f0",
    },
    bonusCardDisabled: {
      opacity: 0.56,
      cursor: "not-allowed",
      background: "#f8fafc",
    },
    bonusHeaderRow: {
      display: "flex",
      alignItems: "center",
      justifyContent: "space-between",
      gap: 6,
    },
    bonusTitle: {
      fontSize: 14,
      fontWeight: 800,
      color: "#0f172a",
    },
    bonusTag: {
      borderRadius: 999,
      background: "#d1fae5",
      color: "#065f46",
      fontSize: 10,
      fontWeight: 700,
      padding: "2px 8px",
    },
    bonusValue: {
      fontSize: 22,
      fontWeight: 800,
      color: "#0f766e",
      lineHeight: 1.1,
    },
    bonusDesc: {
      fontSize: 12,
      color: "#475569",
      lineHeight: 1.4,
    },
    bonusRequirement: {
      fontSize: 11,
      color: "#64748b",
      fontWeight: 600,
    },
    bonusHint: {
      marginTop: 12,
      borderRadius: 16,
      border: "1px solid #a7f3d0",
      background: "#ecfdf5",
      color: "#065f46",
      fontSize: 12,
      fontWeight: 600,
      padding: "8px 10px",
    },
    summaryCard: {
      borderRadius: 16,
      border: "1px solid #d1fae5",
      background: "#ffffff",
      padding: 14,
      display: "flex",
      flexDirection: "column",
      gap: 8,
    },
    summaryTitle: {
      fontSize: 13,
      fontWeight: 800,
      color: "#065f46",
      textTransform: "uppercase",
      letterSpacing: "0.2px",
    },
    summaryRow: {
      display: "flex",
      justifyContent: "space-between",
      fontSize: 13,
      color: "#0f172a",
    },
    summaryMuted: {
      color: "#64748b",
    },
    summaryValuePositive: {
      color: "#047857",
      fontWeight: 700,
    },
    summaryDivider: {
      height: 1,
      background: "#e5e7eb",
      margin: "2px 0",
    },
    summaryTotalRow: {
      display: "flex",
      justifyContent: "space-between",
      alignItems: "center",
      borderRadius: 16,
      background: "#ecfdf5",
      border: "1px solid #a7f3d0",
      padding: "10px 11px",
      fontSize: 15,
      fontWeight: 800,
      color: "#065f46",
    },
    summaryPayRow: {
      fontSize: 12,
      color: "#475569",
      display: "flex",
      alignItems: "center",
      gap: 6,
      marginTop: 2,
    },
    securityRow: {
      display: "flex",
      alignItems: "center",
      gap: 8,
      borderRadius: 16,
      border: "1px solid #a7f3d0",
      background: "#ecfdf5",
      color: "#065f46",
      fontSize: 12,
      fontWeight: 600,
      padding: "10px 11px",
    },
    buttonGroup: {
      marginTop: 2,
      display: "flex",
      gap: 10,
    },
    cancelButton: {
      flex: 1,
      borderRadius: 16,
      border: "1px solid #d1d5db",
      background: "#ffffff",
      color: "#334155",
      fontSize: 15,
      fontWeight: 800,
      letterSpacing: "0.1px",
      padding: "13px 14px",
      fontFamily: "\"Space Grotesk\", \"Manrope\", \"Segoe UI\", sans-serif",
      cursor: "pointer",
    },
    submitButton: {
      flex: 1,
      borderRadius: 16,
      border: "1px solid #0f766e",
      background: "#0f766e",
      color: "#ffffff",
      fontSize: 16,
      fontWeight: 800,
      letterSpacing: "0.2px",
      padding: "14px 14px",
      fontFamily: "\"Space Grotesk\", \"Manrope\", \"Segoe UI\", sans-serif",
      cursor: "pointer",
      boxShadow: "0 10px 20px rgba(15, 118, 110, 0.22)",
    },
    submitButtonDisabled: {
      borderColor: "#cbd5e1",
      background: "#cbd5e1",
      boxShadow: "none",
      cursor: "not-allowed",
    },
  };

  return (
    <div style={styles.overlay} onClick={onClose}>
      <div style={styles.modal} onClick={(e) => e.stopPropagation()}>
        <div style={styles.header}>
          <div style={styles.headerTop}>
            <div>
              <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
                <span style={styles.headerBadge}>
                  <ShieldCheck size={12} />
                  Stripe Secure
                </span>
                <span style={styles.headerBadgeAlt}>Wallet Top-up</span>
              </div>
              <h2 style={styles.title}>Зареди баланса</h2>
              <p style={styles.subtitle}>
                Избери сума и бонус пакет. Плащането минава през защитен Stripe checkout.
              </p>
            </div>
            <button
              type="button"
              style={{
                ...styles.closeButton,
                ...(isCloseHovered ? styles.closeButtonHover : {}),
              }}
              onClick={onClose}
              onMouseEnter={() => setIsCloseHovered(true)}
              onMouseLeave={() => setIsCloseHovered(false)}
              aria-label="Затвори"
            >
              <span aria-hidden="true" style={styles.closeButtonGlyph}>
                ×
              </span>
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
                  Минимум 1€, максимум 1000€
                </div>
              </div>
            </div>

            <div style={styles.sectionCard}>
              <div style={styles.sectionTitle}>
                <BadgePercent size={16} />
                Бонус пакети
              </div>
              <p style={styles.sectionSubtitle}>
                Бонусът се прилага автоматично според избрания пакет.
              </p>
              <div style={styles.bonusGrid}>
                {BONUS_OPTIONS.map((option) => {
                  const isDisabled =
                    option.minAmount > 0 && amountValue < option.minAmount;
                  const isSelected = option.id === selectedBonusId;
                  const isMuted = !isSelected;

                  return (
                    <button
                      key={option.id}
                      type="button"
                      style={{
                        ...styles.bonusCard,
                        ...(isMuted ? styles.bonusCardMuted : {}),
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
                <strong style={styles.summaryMuted}>
                  {amountValue > 0 ? formatCurrency(amountValue) : "—"}
                </strong>
              </div>
              <div style={styles.summaryRow}>
                <span>Бонус</span>
                <strong style={styles.summaryValuePositive}>
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
              <div style={styles.summaryPayRow}>
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
              {isLoading ? "Пренасочване..." : "Продължи към Stripe"}
            </button>
          </div>
        </form>
      </div>
      </div>
    </div>
  );
};

export default TopUpModal;
