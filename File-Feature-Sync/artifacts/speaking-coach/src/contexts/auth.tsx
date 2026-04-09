import React, { createContext, useContext, useState, useEffect, useCallback } from "react";
import { setBaseUrl, setAuthTokenGetter } from "@workspace/api-client-react";

interface AuthUser {
  userId: string;
  username: string;
  email: string;
  role: string;
  purpose: string;
  token: string;
}

interface AuthContextValue {
  user: AuthUser | null;
  isAuthenticated: boolean;
  login: (userData: AuthUser) => void;
  logout: () => void;
  currentUserId: string;
}

const AUTH_KEY = "echocoach_auth";

const AuthContext = createContext<AuthContextValue>({
  user: null,
  isAuthenticated: false,
  login: () => {},
  logout: () => {},
  currentUserId: "demo-user",
});

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(() => {
    try {
      const stored = localStorage.getItem(AUTH_KEY);
      return stored ? JSON.parse(stored) : null;
    } catch {
      return null;
    }
  });

  const updateApiToken = useCallback((token: string | null) => {
    if (token) {
      setAuthTokenGetter(async () => token);
    } else {
      setAuthTokenGetter(async () => null);
    }
  }, []);

  useEffect(() => {
    if (user?.token) {
      updateApiToken(user.token);
    }
  }, [user, updateApiToken]);

  const login = useCallback((userData: AuthUser) => {
    localStorage.setItem(AUTH_KEY, JSON.stringify(userData));
    setUser(userData);
    updateApiToken(userData.token);
  }, [updateApiToken]);

  const logout = useCallback(() => {
    localStorage.removeItem(AUTH_KEY);
    setUser(null);
    updateApiToken(null);
  }, [updateApiToken]);

  const currentUserId = user?.userId ?? "demo-user";

  return (
    <AuthContext.Provider
      value={{ user, isAuthenticated: !!user, login, logout, currentUserId }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  return useContext(AuthContext);
}
