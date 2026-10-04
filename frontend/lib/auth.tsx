"use client";

import { createContext, useCallback, useContext, useEffect, useState, type ReactNode } from "react";
import type { Session } from "./types";

const SESSION_KEY = "feed_session";

interface AuthContextValue {
  session: Session | null | undefined; // undefined = not loaded from localStorage yet
  login: (s: Session) => void;
  logout: () => void;
  authFetch: (path: string, init?: RequestInit) => Promise<Response>;
}

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<Session | null | undefined>(undefined);

  useEffect(() => {
    try {
      const raw = localStorage.getItem(SESSION_KEY);
      setSession(raw ? JSON.parse(raw) : null);
    } catch {
      setSession(null);
    }
  }, []);

  const login = useCallback((s: Session) => {
    localStorage.setItem(SESSION_KEY, JSON.stringify(s));
    setSession(s);
  }, []);

  const logout = useCallback(() => {
    localStorage.removeItem(SESSION_KEY);
    setSession(null);
  }, []);

  // Wraps fetch with the bearer token (when present) and logs the session
  // out on a 401 (expired/invalid token) instead of leaving the UI stuck.
  const authFetch = useCallback(
    async (path: string, init: RequestInit = {}) => {
      const headers: HeadersInit = { ...(init.headers || {}) };
      if (session?.token) (headers as Record<string, string>).Authorization = `Bearer ${session.token}`;
      const res = await fetch(path, { ...init, headers });
      if (res.status === 401 && session) logout();
      return res;
    },
    [session, logout]
  );

  return <AuthContext.Provider value={{ session, login, logout, authFetch }}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
}
