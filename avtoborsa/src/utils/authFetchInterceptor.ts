import { API_BASE_URL, API_ORIGIN } from "../config/api";

const ACCESS_TOKEN_KEY = "authToken";
const LEGACY_REFRESH_TOKEN_KEY = "refreshToken";
const REFRESH_ENDPOINT = `${API_BASE_URL}/api/auth/token/refresh/`;
const LOCAL_API_ORIGIN_PREFIXES = [
  "http://localhost:8000",
  "https://localhost:8000",
  "http://127.0.0.1:8000",
  "https://127.0.0.1:8000",
];

let interceptorInstalled = false;
let refreshPromise: Promise<string | null> | null = null;

const stripTrailingSlashes = (value: string) => value.replace(/\/+$/, "");

const REFRESH_PATH = (() => {
  try {
    return stripTrailingSlashes(new URL(REFRESH_ENDPOINT).pathname);
  } catch {
    return "/api/auth/token/refresh";
  }
})();

const clearStoredTokens = () => {
  localStorage.removeItem(ACCESS_TOKEN_KEY);
  localStorage.removeItem(LEGACY_REFRESH_TOKEN_KEY);
};

const isApiRequest = (requestUrl: string) => {
  if (!API_ORIGIN) return false;
  try {
    return new URL(requestUrl).origin === API_ORIGIN;
  } catch {
    return false;
  }
};

const isRefreshRequest = (requestUrl: string) => {
  try {
    const path = stripTrailingSlashes(new URL(requestUrl).pathname);
    return path === REFRESH_PATH;
  } catch {
    return false;
  }
};

const hasBearerToken = (request: Request) => {
  const authorization = request.headers.get("Authorization") || "";
  return authorization.toLowerCase().startsWith("bearer ");
};

const withAccessToken = (request: Request, accessToken: string) => {
  const headers = new Headers(request.headers);
  headers.set("Authorization", `Bearer ${accessToken}`);
  return new Request(request, { headers });
};

const parseRefreshResponse = async (response: Response) => {
  try {
    return (await response.json()) as Record<string, unknown>;
  } catch {
    return null;
  }
};

const normalizeApiUrl = (url: string) => {
  const trimmedApiBaseUrl = stripTrailingSlashes(API_BASE_URL);
  if (!trimmedApiBaseUrl) return url;

  for (const prefix of LOCAL_API_ORIGIN_PREFIXES) {
    if (url.startsWith(prefix)) {
      return `${trimmedApiBaseUrl}${url.slice(prefix.length)}`;
    }
  }

  return url;
};

const refreshAccessToken = async (rawFetch: typeof window.fetch): Promise<string | null> => {
  if (refreshPromise) {
    return refreshPromise;
  }

  refreshPromise = (async () => {
    const refreshResponse = await rawFetch(REFRESH_ENDPOINT, {
      method: "POST",
      credentials: "include",
    });

    if (!refreshResponse.ok) {
      clearStoredTokens();
      return null;
    }

    const payload = await parseRefreshResponse(refreshResponse);
    const nextAccessToken =
      payload && typeof payload.access === "string" ? payload.access : "";
    if (!nextAccessToken) {
      clearStoredTokens();
      return null;
    }

    localStorage.setItem(ACCESS_TOKEN_KEY, nextAccessToken);

    return nextAccessToken;
  })().finally(() => {
    refreshPromise = null;
  });

  return refreshPromise;
};

export const installAuthFetchInterceptor = () => {
  if (interceptorInstalled || typeof window === "undefined") {
    return;
  }

  interceptorInstalled = true;
  const rawFetch = window.fetch.bind(window);

  window.fetch = async (input: RequestInfo | URL, init?: RequestInit) => {
    const baseRequest = new Request(input, init);
    const rewrittenUrl = normalizeApiUrl(baseRequest.url);
    const originalRequest =
      rewrittenUrl === baseRequest.url
        ? baseRequest
        : new Request(rewrittenUrl, baseRequest);
    const response = await rawFetch(originalRequest.clone());

    if (!isApiRequest(originalRequest.url)) return response;
    if (!hasBearerToken(originalRequest)) return response;
    if (response.status !== 401) return response;
    if (isRefreshRequest(originalRequest.url)) return response;

    const nextAccessToken = await refreshAccessToken(rawFetch);
    if (!nextAccessToken) return response;

    const retryRequest = withAccessToken(originalRequest, nextAccessToken);
    return rawFetch(retryRequest);
  };
};
