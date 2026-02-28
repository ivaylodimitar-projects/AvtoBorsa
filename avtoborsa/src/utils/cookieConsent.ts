export const COOKIE_CONSENT_STORAGE_KEY = "karbg:cookie-consent:v1";
export const COOKIE_CONSENT_UPDATED_EVENT = "karbg:cookie-consent-updated";

export interface CookieConsentPreferences {
  necessary: true;
  analytics: boolean;
  marketing: boolean;
}

export interface CookieConsentState {
  version: 1;
  updatedAt: string;
  preferences: CookieConsentPreferences;
}

const isBoolean = (value: unknown): value is boolean => typeof value === "boolean";

const safeReadStorage = (key: string): string | null => {
  if (typeof window === "undefined") return null;
  try {
    return localStorage.getItem(key);
  } catch {
    return null;
  }
};

const safeWriteStorage = (key: string, value: string) => {
  if (typeof window === "undefined") return;
  try {
    localStorage.setItem(key, value);
  } catch {
    // Ignore storage quota / privacy mode errors.
  }
};

const toValidCookieConsent = (value: unknown): CookieConsentState | null => {
  if (!value || typeof value !== "object") return null;
  const record = value as Record<string, unknown>;
  if (record.version !== 1) return null;
  if (typeof record.updatedAt !== "string" || !record.updatedAt.trim()) return null;
  if (!record.preferences || typeof record.preferences !== "object") return null;

  const preferences = record.preferences as Record<string, unknown>;
  if (preferences.necessary !== true) return null;
  if (!isBoolean(preferences.analytics) || !isBoolean(preferences.marketing)) return null;

  return {
    version: 1,
    updatedAt: record.updatedAt,
    preferences: {
      necessary: true,
      analytics: preferences.analytics,
      marketing: preferences.marketing,
    },
  };
};

export const getCookieConsent = (): CookieConsentState | null => {
  const raw = safeReadStorage(COOKIE_CONSENT_STORAGE_KEY);
  if (!raw) return null;

  try {
    const parsed = JSON.parse(raw);
    return toValidCookieConsent(parsed);
  } catch {
    return null;
  }
};

export const saveCookieConsent = (
  input: Pick<CookieConsentPreferences, "analytics" | "marketing">
): CookieConsentState => {
  const nextState: CookieConsentState = {
    version: 1,
    updatedAt: new Date().toISOString(),
    preferences: {
      necessary: true,
      analytics: Boolean(input.analytics),
      marketing: Boolean(input.marketing),
    },
  };

  if (typeof window !== "undefined") {
    safeWriteStorage(COOKIE_CONSENT_STORAGE_KEY, JSON.stringify(nextState));
    window.dispatchEvent(
      new CustomEvent(COOKIE_CONSENT_UPDATED_EVENT, {
        detail: { preferences: nextState.preferences, updatedAt: nextState.updatedAt },
      })
    );
  }

  return nextState;
};

export const hasCookieConsentDecision = () => getCookieConsent() !== null;

export const canUseAnalyticsCookies = () =>
  Boolean(getCookieConsent()?.preferences.analytics);

export const canUseMarketingCookies = () =>
  Boolean(getCookieConsent()?.preferences.marketing);
