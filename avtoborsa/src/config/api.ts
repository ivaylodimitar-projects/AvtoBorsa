const FALLBACK_LOCAL_API_BASE_URL = "http://localhost:8000";
const TRUE_ENV_VALUES = new Set(["1", "true", "yes", "on"]);
const FALSE_ENV_VALUES = new Set(["0", "false", "no", "off"]);

const resolveRuntimeBaseUrl = () => {
  if (typeof window === "undefined") {
    return "";
  }

  const { hostname, origin, protocol } = window.location;
  const isLocalHost = hostname === "localhost" || hostname === "127.0.0.1";
  if (isLocalHost && import.meta.env.DEV) {
    return `${protocol}//${hostname}:8000`;
  }

  return origin;
};

const resolveApiBaseUrl = () => {
  const envValue = import.meta.env.BACKEND_BASE_URL || import.meta.env.VITE_API_BASE_URL;
  const runtimeValue = resolveRuntimeBaseUrl();
  const value = envValue || runtimeValue || FALLBACK_LOCAL_API_BASE_URL;

  return value.trim().replace(/\/+$/, "");
};

const parseEnvFlag = (value: unknown): boolean | null => {
  if (typeof value !== "string") {
    return null;
  }
  const normalized = value.trim().toLowerCase();
  if (!normalized) {
    return null;
  }
  if (TRUE_ENV_VALUES.has(normalized)) {
    return true;
  }
  if (FALSE_ENV_VALUES.has(normalized)) {
    return false;
  }
  return null;
};

const resolveRecaptchaSiteKey = () => {
  const value = import.meta.env.VITE_RECAPTCHA_SITE_KEY || import.meta.env.RECAPTCHA_SITE_KEY || "";
  return typeof value === "string" ? value.trim() : "";
};

const resolveRecaptchaEnabled = () => {
  const explicitFlag = parseEnvFlag(import.meta.env.VITE_RECAPTCHA_ENABLED);
  if (explicitFlag !== null) {
    return explicitFlag;
  }
  return Boolean(resolveRecaptchaSiteKey());
};

export const API_BASE_URL = resolveApiBaseUrl();
export const RECAPTCHA_SITE_KEY = resolveRecaptchaSiteKey();
export const RECAPTCHA_ENABLED = resolveRecaptchaEnabled();

export const API_ORIGIN = (() => {
  try {
    return new URL(API_BASE_URL).origin;
  } catch {
    return FALLBACK_LOCAL_API_BASE_URL;
  }
})();
