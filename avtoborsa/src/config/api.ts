const FALLBACK_LOCAL_API_BASE_URL = "http://localhost:8000";

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

export const API_BASE_URL = resolveApiBaseUrl();

export const API_ORIGIN = (() => {
  try {
    return new URL(API_BASE_URL).origin;
  } catch {
    return FALLBACK_LOCAL_API_BASE_URL;
  }
})();
