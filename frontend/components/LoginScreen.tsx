"use client";

import { useState } from "react";
import { useAuth } from "../lib/auth";
import type { Session } from "../lib/types";

export default function LoginScreen() {
  const { login } = useAuth();
  const [mode, setMode] = useState<"login" | "signup">("login");
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setBusy(true);
    try {
      const res = await fetch(`/api/auth/${mode}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ username, password }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || "something went wrong");
        return;
      }
      login(data as Session);
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="login-screen">
      <div className="login-card">
        <div className="login-logo">Feed</div>
        <p className="subtitle">{mode === "login" ? "Welcome back" : "Create your account"}</p>
        <form onSubmit={submit}>
          <div className="login-fields">
            <input
              type="text"
              placeholder="Username"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              autoFocus
            />
            <input
              type="password"
              placeholder="Password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
            />
            {error && <div className="form-error">{error}</div>}
            <button type="submit" disabled={busy || !username || !password}>
              {busy ? "…" : mode === "login" ? "Log in" : "Sign up"}
            </button>
            <button
              type="button"
              className="text-btn"
              onClick={() => {
                setMode(mode === "login" ? "signup" : "login");
                setError(null);
              }}
            >
              {mode === "login" ? "Don't have an account? Sign up" : "Already have an account? Log in"}
            </button>
          </div>
        </form>
        <p className="login-demo-hint">Demo accounts: alice / bob / carol / starlet — password "password123"</p>
      </div>
    </div>
  );
}
