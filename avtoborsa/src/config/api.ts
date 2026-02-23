const FALLBACK_API_BASE_URL = "http://localhost:8000";

const resolveApiBaseUrl = () => {
  const value =
    import.meta.env.BACKEND_BASE_URL ||
    import.meta.env.VITE_API_BASE_URL ||
    FALLBACK_API_BASE_URL;

  return value.trim().replace(/\/+$/, "");
};

export const API_BASE_URL = resolveApiBaseUrl();

export const API_ORIGIN = (() => {
  try {
    return new URL(API_BASE_URL).origin;
  } catch {
    return FALLBACK_API_BASE_URL;
  }
})();
