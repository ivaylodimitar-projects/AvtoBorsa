import React, { createContext, useCallback, useContext, useEffect, useRef, useState } from "react";

import { API_BASE_URL } from "../config/api";

interface User {
  id: number;
  email: string;
  username?: string;
  userType: "private" | "business";
  balance?: number;
  first_name?: string;
  last_name?: string;
  profile_image_url?: string | null;
  created_at?: string;
  is_staff?: boolean;
  is_superuser?: boolean;
  is_admin?: boolean;
  isAdmin?: boolean;
}

interface AuthContextType {
  user: User | null;
  isLoading: boolean;
  authTransition: "login" | "logout" | null;
  sessionExpiredMessage: string | null;
  login: (
    email: string,
    password: string,
    options?: { remember?: boolean }
  ) => Promise<void>;
  logout: () => Promise<void>;
  setUserFromToken: (userData: User, accessToken: string) => void;
  isAuthenticated: boolean;
  updateBalance: (newBalance: number) => void;
  clearSessionExpiredMessage: () => void;
  ensureFreshAccessToken: (options?: { force?: boolean }) => Promise<string | null>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

const ACCESS_TOKEN_KEY = "authToken";
const LEGACY_REFRESH_TOKEN_KEY = "refreshToken";
const REMEMBER_LOGIN_KEY = "rememberLogin";
const AUTH_TRANSITION_MIN_MS = 550;
const ACCESS_TOKEN_REFRESH_LEEWAY_MS = 3 * 60 * 1000;
const ACTIVE_REFRESH_WINDOW_MS = 20 * 60 * 1000;
const TOKEN_CHECK_INTERVAL_MS = 60 * 1000;
const DEFAULT_SESSION_EXPIRED_MESSAGE = "Сесията изтече. Моля, влез отново.";

const getRememberLoginPreference = (): boolean => {
  const raw = localStorage.getItem(REMEMBER_LOGIN_KEY);
  if (raw === null) return true;
  return raw === "1";
};

const parseJwtExpiryMs = (token: string): number | null => {
  if (!token) return null;

  const parts = token.split(".");
  if (parts.length < 2) return null;

  try {
    const base64 = parts[1].replace(/-/g, "+").replace(/_/g, "/");
    const padded = base64 + "=".repeat((4 - (base64.length % 4)) % 4);
    const payloadText = atob(padded);
    const payload = JSON.parse(payloadText) as { exp?: number };
    if (typeof payload.exp !== "number") return null;
    return payload.exp * 1000;
  } catch {
    return null;
  }
};

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [authTransition, setAuthTransition] = useState<"login" | "logout" | null>(null);
  const [sessionExpiredMessage, setSessionExpiredMessage] = useState<string | null>(null);
  const refreshPromiseRef = useRef<Promise<string | null> | null>(null);
  const lastActivityAtRef = useRef<number>(Date.now());

  const applyMinimumTransitionDuration = async (startedAt: number) => {
    const elapsed = Date.now() - startedAt;
    if (elapsed >= AUTH_TRANSITION_MIN_MS) return;
    await new Promise((resolve) =>
      setTimeout(resolve, AUTH_TRANSITION_MIN_MS - elapsed)
    );
  };

  const clearStoredTokens = useCallback(() => {
    localStorage.removeItem(ACCESS_TOKEN_KEY);
    localStorage.removeItem(LEGACY_REFRESH_TOKEN_KEY);
  }, []);

  const clearSessionExpiredMessage = useCallback(() => {
    setSessionExpiredMessage(null);
  }, []);

  const handleSessionExpired = useCallback(
    (message: string = DEFAULT_SESSION_EXPIRED_MESSAGE) => {
      clearStoredTokens();
      setUser(null);
      setSessionExpiredMessage(message);
    },
    [clearStoredTokens]
  );

  const requestAccessTokenRefresh = useCallback(async (): Promise<string | null> => {
    if (refreshPromiseRef.current) {
      return refreshPromiseRef.current;
    }

    const promise = (async () => {
      try {
        const response = await fetch(`${API_BASE_URL}/api/auth/token/refresh/`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          credentials: "include",
          body: JSON.stringify({
            remember_me: getRememberLoginPreference(),
          }),
        });

        if (!response.ok) {
          if (response.status === 401 || response.status === 403) {
            handleSessionExpired();
          }
          return null;
        }

        const payload = (await response.json().catch(() => ({}))) as { access?: unknown };
        const nextAccess = typeof payload.access === "string" ? payload.access : null;
        if (!nextAccess) return null;

        localStorage.setItem(ACCESS_TOKEN_KEY, nextAccess);
        localStorage.removeItem(LEGACY_REFRESH_TOKEN_KEY);
        setSessionExpiredMessage(null);
        return nextAccess;
      } catch (error) {
        console.error("Token refresh failed:", error);
        return null;
      } finally {
        refreshPromiseRef.current = null;
      }
    })();

    refreshPromiseRef.current = promise;
    return promise;
  }, [handleSessionExpired]);

  const ensureFreshAccessToken = useCallback(
    async (options?: { force?: boolean }): Promise<string | null> => {
      const token = localStorage.getItem(ACCESS_TOKEN_KEY);
      if (!token) {
        if (user) {
          handleSessionExpired();
        }
        return null;
      }

      const forceRefresh = options?.force === true;
      if (!forceRefresh) {
        const expiryMs = parseJwtExpiryMs(token);
        if (expiryMs === null || expiryMs - Date.now() > ACCESS_TOKEN_REFRESH_LEEWAY_MS) {
          return token;
        }
      }

      return requestAccessTokenRefresh();
    },
    [handleSessionExpired, requestAccessTokenRefresh, user]
  );

  // Check if user is already logged in on mount
  useEffect(() => {
    const checkAuth = async () => {
      try {
        const accessToken = localStorage.getItem(ACCESS_TOKEN_KEY);
        if (accessToken) {
          let activeToken: string | null = accessToken;
          let response = await fetch(`${API_BASE_URL}/api/auth/me/`, {
            headers: {
              Authorization: `Bearer ${activeToken}`,
            },
          });

          if ((response.status === 401 || response.status === 403) && activeToken) {
            const refreshed = await requestAccessTokenRefresh();
            if (refreshed) {
              activeToken = refreshed;
              response = await fetch(`${API_BASE_URL}/api/auth/me/`, {
                headers: { Authorization: `Bearer ${activeToken}` },
              });
            }
          }

          if (response.ok) {
            const userData = await response.json();
            setUser(userData);
            setSessionExpiredMessage(null);
            lastActivityAtRef.current = Date.now();
            return;
          }

          if (response.status === 401 || response.status === 403) {
            handleSessionExpired();
          } else {
            // Keep token on transient errors
            console.warn("Auth check failed with status:", response.status);
          }
        }
      } catch (error) {
        console.error("Auth check failed:", error);
      } finally {
        setIsLoading(false);
      }
    };

    checkAuth();
  }, [handleSessionExpired, requestAccessTokenRefresh]);

  useEffect(() => {
    const markActivity = () => {
      lastActivityAtRef.current = Date.now();
    };

    markActivity();

    const events: Array<keyof WindowEventMap> = [
      "pointerdown",
      "keydown",
      "mousemove",
      "touchstart",
      "scroll",
      "focus",
    ];

    events.forEach((eventName) => {
      window.addEventListener(eventName, markActivity, { passive: true });
    });

    return () => {
      events.forEach((eventName) => {
        window.removeEventListener(eventName, markActivity);
      });
    };
  }, []);

  useEffect(() => {
    if (!user) return;

    const tick = () => {
      const token = localStorage.getItem(ACCESS_TOKEN_KEY);
      if (!token) return;

      const expiryMs = parseJwtExpiryMs(token);
      if (!expiryMs) return;

      const now = Date.now();
      const isRecentlyActive = now - lastActivityAtRef.current <= ACTIVE_REFRESH_WINDOW_MS;
      const shouldRefreshSoon = expiryMs - now <= ACCESS_TOKEN_REFRESH_LEEWAY_MS;

      if (isRecentlyActive && shouldRefreshSoon) {
        void requestAccessTokenRefresh();
      }
    };

    tick();
    const intervalId = window.setInterval(tick, TOKEN_CHECK_INTERVAL_MS);
    return () => window.clearInterval(intervalId);
  }, [user, requestAccessTokenRefresh]);

  const login = async (
    email: string,
    password: string,
    options?: { remember?: boolean }
  ) => {
    const transitionStartedAt = Date.now();
    setAuthTransition("login");
    setSessionExpiredMessage(null);
    const normalizedEmail = email.trim().toLowerCase();
    const rememberMe = options?.remember !== false;
    localStorage.setItem(REMEMBER_LOGIN_KEY, rememberMe ? "1" : "0");

    try {
      const response = await fetch(`${API_BASE_URL}/api/auth/login/`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({
          email: normalizedEmail,
          password,
          remember_me: rememberMe,
        }),
      });

      if (!response.ok) {
        try {
          const errorData = await response.json();
          throw new Error(errorData?.error || "Невалиден email или парола");
        } catch {
          throw new Error("Невалиден email или парола");
        }
      }

      const data = await response.json();
      if (!data?.access || !data?.user) {
        throw new Error("Непълен отговор от сървъра при вход");
      }
      localStorage.setItem(ACCESS_TOKEN_KEY, data.access);
      localStorage.removeItem(LEGACY_REFRESH_TOKEN_KEY);
      setUser(data.user);
      lastActivityAtRef.current = Date.now();

      try {
        const meRes = await fetch(`${API_BASE_URL}/api/auth/me/`, {
          headers: { Authorization: `Bearer ${data.access}` },
        });
        if (meRes.ok) {
          const meData = await meRes.json();
          setUser(meData);
        }
      } catch {
        // Keep login payload if refresh fails
      }
    } finally {
      await applyMinimumTransitionDuration(transitionStartedAt);
      setAuthTransition(null);
    }
  };

  const setUserFromToken = (userData: User, accessToken: string) => {
    localStorage.setItem(ACCESS_TOKEN_KEY, accessToken);
    localStorage.removeItem(LEGACY_REFRESH_TOKEN_KEY);
    setUser(userData);
    setSessionExpiredMessage(null);
    lastActivityAtRef.current = Date.now();
  };

  const updateBalance = (newBalance: number) => {
    if (user) {
      setUser({ ...user, balance: newBalance });
    }
  };

  const logout = async () => {
    const transitionStartedAt = Date.now();
    setAuthTransition("logout");

    try {
      const token = localStorage.getItem(ACCESS_TOKEN_KEY);
      if (token) {
        await fetch(`${API_BASE_URL}/api/auth/logout/`, {
          method: "POST",
          credentials: "include",
          headers: {
            Authorization: `Bearer ${token}`,
          },
        });
      }
    } catch (error) {
      console.error("Logout error:", error);
    } finally {
      clearStoredTokens();
      setUser(null);
      setSessionExpiredMessage(null);
      await applyMinimumTransitionDuration(transitionStartedAt);
      setAuthTransition(null);
    }
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        isLoading,
        authTransition,
        sessionExpiredMessage,
        login,
        logout,
        setUserFromToken,
        updateBalance,
        clearSessionExpiredMessage,
        ensureFreshAccessToken,
        isAuthenticated: !!user,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useAuth must be used within AuthProvider");
  }
  return context;
};
