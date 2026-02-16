import React, { createContext, useContext, useState, useEffect } from "react";

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
  login: (email: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
  setUserFromToken: (userData: User, accessToken: string) => void;
  isAuthenticated: boolean;
  updateBalance: (newBalance: number) => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [authTransition, setAuthTransition] = useState<"login" | "logout" | null>(null);
  const ACCESS_TOKEN_KEY = "authToken";
  const LEGACY_REFRESH_TOKEN_KEY = "refreshToken";
  const AUTH_TRANSITION_MIN_MS = 550;

  const applyMinimumTransitionDuration = async (startedAt: number) => {
    const elapsed = Date.now() - startedAt;
    if (elapsed >= AUTH_TRANSITION_MIN_MS) return;
    await new Promise((resolve) =>
      setTimeout(resolve, AUTH_TRANSITION_MIN_MS - elapsed)
    );
  };

  // Check if user is already logged in on mount
  useEffect(() => {
    const checkAuth = async () => {
      try {
        const accessToken = localStorage.getItem(ACCESS_TOKEN_KEY);
        if (accessToken) {
          const response = await fetch("http://localhost:8000/api/auth/me/", {
            headers: {
              Authorization: `Bearer ${accessToken}`,
            },
          });
          if (response.ok) {
            const userData = await response.json();
            setUser(userData);
            return;
          }
          if (response.status === 401 || response.status === 403) {
            localStorage.removeItem(ACCESS_TOKEN_KEY);
            localStorage.removeItem(LEGACY_REFRESH_TOKEN_KEY);
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
  }, []);

  const login = async (email: string, password: string) => {
    const transitionStartedAt = Date.now();
    setAuthTransition("login");

    try {
      const response = await fetch("http://localhost:8000/api/auth/login/", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ email, password }),
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

      try {
        const meRes = await fetch("http://localhost:8000/api/auth/me/", {
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
        await fetch("http://localhost:8000/api/auth/logout/", {
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
      localStorage.removeItem(ACCESS_TOKEN_KEY);
      localStorage.removeItem(LEGACY_REFRESH_TOKEN_KEY);
      setUser(null);
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
        login,
        logout,
        setUserFromToken,
        updateBalance,
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

