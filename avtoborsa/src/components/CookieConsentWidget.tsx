import React, { useCallback, useEffect, useMemo, useState } from "react";
import { Cookie } from "lucide-react";
import {
  COOKIE_CONSENT_STORAGE_KEY,
  COOKIE_CONSENT_UPDATED_EVENT,
  getCookieConsent,
  hasCookieConsentDecision,
  saveCookieConsent,
} from "../utils/cookieConsent";

type DraftPreferences = {
  analytics: boolean;
  marketing: boolean;
};

const toDraftPreferences = (consent = getCookieConsent()): DraftPreferences => ({
  analytics: consent?.preferences.analytics ?? false,
  marketing: consent?.preferences.marketing ?? false,
});

const CookieConsentWidget: React.FC = () => {
  const initialConsent = useMemo(() => getCookieConsent(), []);
  const [isBannerVisible, setIsBannerVisible] = useState(
    () => !hasCookieConsentDecision()
  );
  const [isPanelOpen, setIsPanelOpen] = useState(false);
  const [draft, setDraft] = useState<DraftPreferences>(() =>
    toDraftPreferences(initialConsent)
  );

  const syncFromStoredConsent = useCallback(() => {
    const storedConsent = getCookieConsent();
    if (!storedConsent) {
      setIsBannerVisible(true);
      setDraft({ analytics: false, marketing: false });
      return;
    }

    setDraft({
      analytics: storedConsent.preferences.analytics,
      marketing: storedConsent.preferences.marketing,
    });
    setIsBannerVisible(false);
  }, []);

  useEffect(() => {
    syncFromStoredConsent();
  }, [syncFromStoredConsent]);

  useEffect(() => {
    if (typeof window === "undefined") return;

    const handleStorage = (event: StorageEvent) => {
      if (event.key && event.key !== COOKIE_CONSENT_STORAGE_KEY) return;
      syncFromStoredConsent();
    };

    const handleConsentUpdated = () => {
      syncFromStoredConsent();
    };

    window.addEventListener("storage", handleStorage);
    window.addEventListener(
      COOKIE_CONSENT_UPDATED_EVENT,
      handleConsentUpdated as EventListener
    );

    return () => {
      window.removeEventListener("storage", handleStorage);
      window.removeEventListener(
        COOKIE_CONSENT_UPDATED_EVENT,
        handleConsentUpdated as EventListener
      );
    };
  }, [syncFromStoredConsent]);

  useEffect(() => {
    if (!isPanelOpen) return;

    const handleEsc = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        setIsPanelOpen(false);
      }
    };

    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    window.addEventListener("keydown", handleEsc);

    return () => {
      document.body.style.overflow = previousOverflow;
      window.removeEventListener("keydown", handleEsc);
    };
  }, [isPanelOpen]);

  const commitConsent = (next: DraftPreferences) => {
    saveCookieConsent(next);
    setDraft(next);
    setIsBannerVisible(false);
    setIsPanelOpen(false);
  };

  const openPanel = () => {
    setDraft(toDraftPreferences());
    setIsPanelOpen(true);
  };

  const toggleDraft = (key: keyof DraftPreferences) => {
    setDraft((prev) => ({ ...prev, [key]: !prev[key] }));
  };

  return (
    <>
      <style>{`
        .cookie-consent-fab {
          position: fixed;
          left: 16px;
          bottom: 16px;
          z-index: 4200;
          width: 54px;
          height: 54px;
          border-radius: 18px;
          border: 1px solid #99f6e4;
          background: linear-gradient(180deg, #ffffff 0%, #ecfdf5 100%);
          color: #0f766e;
          box-shadow: 0 10px 24px rgba(15, 118, 110, 0.24);
          cursor: pointer;
          display: inline-flex;
          align-items: center;
          justify-content: center;
          transition: transform 0.2s ease, box-shadow 0.2s ease, border-color 0.2s ease;
        }
        .cookie-consent-fab:hover {
          transform: translateY(-2px);
          box-shadow: 0 14px 28px rgba(15, 118, 110, 0.3);
          border-color: #5eead4;
        }
        .cookie-consent-fab:focus-visible {
          outline: 2px solid #14b8a6;
          outline-offset: 2px;
        }
        .cookie-consent-card {
          position: fixed;
          left: 16px;
          right: 16px;
          bottom: 84px;
          margin: 0 auto;
          border-radius: 18px;
          border: 1px solid #dbeafe;
          background: linear-gradient(180deg, #ffffff 0%, #f8fafc 100%);
          box-shadow: 0 18px 36px rgba(15, 23, 42, 0.16);
          color: #0f172a;
          font-family: "Manrope", "Segoe UI", sans-serif;
        }
        .cookie-consent-banner {
          z-index: 4200;
          max-width: 760px;
          padding: 16px;
        }
        .cookie-consent-panel {
          z-index: 4310;
          max-width: 560px;
          padding: 16px;
          background: #fff;
        }
        .cookie-consent-header {
          display: flex;
          gap: 10px;
          align-items: flex-start;
        }
        .cookie-consent-icon-badge {
          width: 34px;
          height: 34px;
          border-radius: 12px;
          border: 1px solid #99f6e4;
          background: #ecfdf5;
          color: #0f766e;
          display: inline-flex;
          align-items: center;
          justify-content: center;
          flex-shrink: 0;
          margin-top: 2px;
        }
        .cookie-consent-title {
          margin: 0;
          font-size: 17px;
          font-weight: 800;
          color: #0f172a;
        }
        .cookie-consent-desc {
          margin: 8px 0 0;
          font-size: 14px;
          line-height: 1.5;
          color: #475569;
        }
        .cookie-consent-link {
          display: inline-block;
          margin-top: 8px;
          color: #0f766e;
          text-decoration: none;
          font-size: 13px;
          font-weight: 700;
        }
        .cookie-consent-link:hover {
          text-decoration: underline;
        }
        .cookie-consent-actions {
          margin-top: 12px;
          display: flex;
          gap: 8px;
          flex-wrap: wrap;
        }
        .cookie-consent-btn {
          min-height: 38px;
          padding: 0 14px;
          border-radius: 12px;
          cursor: pointer;
          font-size: 13px;
          transition: transform 0.2s ease, box-shadow 0.2s ease, border-color 0.2s ease;
        }
        .cookie-consent-btn:hover {
          transform: translateY(-1px);
        }
        .cookie-consent-btn:focus-visible {
          outline: 2px solid #14b8a6;
          outline-offset: 2px;
        }
        .cookie-consent-btn-primary {
          border: 1px solid #0f766e;
          background: #0f766e;
          color: #fff;
          font-weight: 700;
        }
        .cookie-consent-btn-primary:hover {
          border-color: #0b5f59;
          background: #0b5f59;
          box-shadow: 0 8px 18px rgba(15, 118, 110, 0.24);
        }
        .cookie-consent-btn-secondary {
          border: 1px solid #cbd5e1;
          background: #fff;
          color: #0f172a;
          font-weight: 600;
        }
        .cookie-consent-btn-secondary:hover {
          border-color: #94a3b8;
          box-shadow: 0 8px 16px rgba(15, 23, 42, 0.1);
        }
        .cookie-consent-btn-ghost {
          border: 1px solid #99f6e4;
          background: #ecfdf5;
          color: #0f766e;
          font-weight: 700;
        }
        .cookie-consent-btn-ghost:hover {
          border-color: #5eead4;
          box-shadow: 0 8px 16px rgba(15, 118, 110, 0.12);
        }
        .cookie-consent-backdrop {
          position: fixed;
          inset: 0;
          background: rgba(15, 23, 42, 0.28);
          backdrop-filter: blur(2px);
          z-index: 4300;
        }
        .cookie-consent-panel-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          gap: 10px;
        }
        .cookie-consent-close {
          width: 34px;
          height: 34px;
          border-radius: 10px;
          border: 1px solid #e2e8f0;
          background: #fff;
          color: #334155;
          cursor: pointer;
          font-size: 22px;
          line-height: 1;
          padding: 0;
          display: inline-flex;
          align-items: center;
          justify-content: center;
        }
        .cookie-consent-close:hover {
          border-color: #94a3b8;
          background: #f8fafc;
        }
        .cookie-consent-close:focus-visible {
          outline: 2px solid #14b8a6;
          outline-offset: 2px;
        }
        .cookie-consent-options {
          margin-top: 12px;
          display: grid;
          gap: 10px;
        }
        .cookie-consent-option {
          border: 1px solid #dbeafe;
          border-radius: 12px;
          padding: 12px;
          background: #f8fafc;
          display: flex;
          justify-content: space-between;
          align-items: center;
          gap: 10px;
        }
        .cookie-consent-option-title {
          font-size: 14px;
          font-weight: 700;
          color: #0f172a;
        }
        .cookie-consent-option-desc {
          margin-top: 4px;
          font-size: 12px;
          color: #64748b;
          line-height: 1.45;
        }
        .cookie-consent-toggle {
          width: 56px;
          min-width: 56px;
          height: 30px;
          border-radius: 999px;
          border: 1px solid #cbd5e1;
          background: #f1f5f9;
          padding: 2px;
          display: inline-flex;
          align-items: center;
          justify-content: flex-start;
          cursor: pointer;
          transition: background-color 0.2s ease, border-color 0.2s ease;
        }
        .cookie-consent-toggle:hover {
          border-color: #94a3b8;
        }
        .cookie-consent-toggle:focus-visible {
          outline: 2px solid #14b8a6;
          outline-offset: 2px;
        }
        .cookie-consent-toggle-thumb {
          width: 24px;
          height: 24px;
          border-radius: 999px;
          background: #fff;
          box-shadow: 0 2px 6px rgba(15, 23, 42, 0.24);
          transform: translateX(0);
          transition: transform 0.2s ease;
        }
        .cookie-consent-toggle.is-on {
          border-color: #0f766e;
          background: #0f766e;
        }
        .cookie-consent-toggle.is-on .cookie-consent-toggle-thumb {
          transform: translateX(26px);
        }
        .cookie-consent-toggle.is-locked {
          cursor: not-allowed;
          opacity: 0.95;
        }
        .cookie-consent-note {
          margin-top: 10px;
          font-size: 11px;
          color: #64748b;
          line-height: 1.45;
          display: inline-flex;
          align-items: center;
          gap: 6px;
        }
        @media (max-width: 640px) {
          .cookie-consent-fab {
            left: 10px;
            bottom: 10px;
            width: 50px;
            height: 50px;
            border-radius: 16px;
          }
          .cookie-consent-card {
            left: 8px;
            right: 8px;
            bottom: 70px;
            border-radius: 16px;
          }
          .cookie-consent-actions {
            gap: 6px;
          }
          .cookie-consent-btn {
            width: 100%;
            justify-content: center;
          }
        }
      `}</style>

      <button
        type="button"
        className="cookie-consent-fab"
        aria-label="Настройки за бисквитки"
        title="Настройки за бисквитки"
        onClick={openPanel}
      >
        <Cookie size={24} />
      </button>

      {isBannerVisible && (
        <section
          className="cookie-consent-card cookie-consent-banner"
          role="dialog"
          aria-labelledby="cookie-banner-title"
          aria-describedby="cookie-banner-description"
        >
          <div className="cookie-consent-header">
            <span className="cookie-consent-icon-badge" aria-hidden="true">
              <Cookie size={20} />
            </span>
            <div>
              <h2 id="cookie-banner-title" className="cookie-consent-title">
                Използваме бисквитки
              </h2>
              <p id="cookie-banner-description" className="cookie-consent-desc">
                Използваме задължителни бисквитки за работа на сайта и по избор
                аналитични и маркетингови за подобряване на услугата. Може да
                промениш избора си по всяко време.
              </p>
              <a href="/legal#cookies" className="cookie-consent-link">
                Политика за бисквитки
              </a>
              <div className="cookie-consent-actions">
                <button
                  type="button"
                  className="cookie-consent-btn cookie-consent-btn-primary"
                  onClick={() =>
                    commitConsent({ analytics: true, marketing: true })
                  }
                >
                  Приеми всички
                </button>
                <button
                  type="button"
                  className="cookie-consent-btn cookie-consent-btn-secondary"
                  onClick={() =>
                    commitConsent({ analytics: false, marketing: false })
                  }
                >
                  Само задължителни
                </button>
                <button
                  type="button"
                  className="cookie-consent-btn cookie-consent-btn-ghost"
                  onClick={openPanel}
                >
                  Персонализирай
                </button>
              </div>
            </div>
          </div>
        </section>
      )}

      {isPanelOpen && (
        <>
          <div
            className="cookie-consent-backdrop"
            onClick={() => setIsPanelOpen(false)}
            aria-hidden="true"
          />
          <section
            className="cookie-consent-card cookie-consent-panel"
            role="dialog"
            aria-modal="true"
            aria-labelledby="cookie-panel-title"
            aria-describedby="cookie-panel-description"
          >
            <div className="cookie-consent-panel-header">
              <h3 id="cookie-panel-title" className="cookie-consent-title">
                Предпочитания за бисквитки
              </h3>
              <button
                type="button"
                className="cookie-consent-close"
                aria-label="Затвори настройките за бисквитки"
                onClick={() => setIsPanelOpen(false)}
              >
                ×
              </button>
            </div>

            <p
              id="cookie-panel-description"
              className="cookie-consent-desc"
              style={{ marginTop: 8 }}
            >
              Избери кои незадължителни бисквитки разрешаваш.
            </p>

            <div className="cookie-consent-options">
              <div className="cookie-consent-option">
                <div>
                  <div className="cookie-consent-option-title">
                    Необходими бисквитки
                  </div>
                  <div className="cookie-consent-option-desc">
                    Нужни за вход, сигурност и основна функционалност.
                  </div>
                </div>
                <button
                  type="button"
                  className="cookie-consent-toggle is-on is-locked"
                  role="switch"
                  aria-checked="true"
                  aria-label="Необходими бисквитки"
                  disabled
                >
                  <span className="cookie-consent-toggle-thumb" />
                </button>
              </div>

              <div className="cookie-consent-option">
                <div>
                  <div className="cookie-consent-option-title">
                    Аналитични бисквитки
                  </div>
                  <div className="cookie-consent-option-desc">
                    Помагат да разберем как се използва платформата.
                  </div>
                </div>
                <button
                  type="button"
                  className={`cookie-consent-toggle ${
                    draft.analytics ? "is-on" : ""
                  }`}
                  role="switch"
                  aria-checked={draft.analytics}
                  aria-label="Аналитични бисквитки"
                  onClick={() => toggleDraft("analytics")}
                >
                  <span className="cookie-consent-toggle-thumb" />
                </button>
              </div>

              <div className="cookie-consent-option">
                <div>
                  <div className="cookie-consent-option-title">
                    Маркетингови бисквитки
                  </div>
                  <div className="cookie-consent-option-desc">
                    Използват се за персонализирано съдържание и реклами.
                  </div>
                </div>
                <button
                  type="button"
                  className={`cookie-consent-toggle ${
                    draft.marketing ? "is-on" : ""
                  }`}
                  role="switch"
                  aria-checked={draft.marketing}
                  aria-label="Маркетингови бисквитки"
                  onClick={() => toggleDraft("marketing")}
                >
                  <span className="cookie-consent-toggle-thumb" />
                </button>
              </div>
            </div>

            <div className="cookie-consent-actions">
              <button
                type="button"
                className="cookie-consent-btn cookie-consent-btn-primary"
                onClick={() => commitConsent(draft)}
              >
                Запази избора
              </button>
              <button
                type="button"
                className="cookie-consent-btn cookie-consent-btn-secondary"
                onClick={() =>
                  commitConsent({ analytics: false, marketing: false })
                }
              >
                Откажи незадължителните
              </button>
              <button
                type="button"
                className="cookie-consent-btn cookie-consent-btn-ghost"
                onClick={() => commitConsent({ analytics: true, marketing: true })}
              >
                Приеми всички
              </button>
            </div>

            <div className="cookie-consent-note">
              <Cookie size={12} />
              Настройките можеш да промениш по всяко време от иконката в
              долния ляв ъгъл.
            </div>
          </section>
        </>
      )}
    </>
  );
};

export default CookieConsentWidget;

