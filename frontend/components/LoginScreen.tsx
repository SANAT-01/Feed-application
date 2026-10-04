"use client";

import { useState } from "react";
import { useAuth } from "../lib/auth";
import Avatar from "./Avatar";
import type { Session } from "../lib/types";

const DEMO_PASSWORD = "password123";
const DEMO_ACCOUNTS = ["alice", "priya", "yuki", "finn", "zara", "starlet"];

export default function LoginScreen() {
  const { login } = useAuth();
  const [mode, setMode] = useState<"login" | "signup">("login");
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function authenticate(user: string, pass: string, kind: "login" | "signup") {
    setError(null);
    setBusy(true);
    try {
      const res = await fetch(`/api/auth/${kind}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ username: user, password: pass }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setError(res.status === 429 ? "Too many attempts — wait a minute and try again" : data.error || "Something went wrong");
        return;
      }
      login(data as Session);
    } catch {
      setError("Can't reach the server — try again");
    } finally {
      setBusy(false);
    }
  }

  function quickLogin(name: string) {
    setMode("login");
    setUsername(name);
    setPassword(DEMO_PASSWORD);
    authenticate(name, DEMO_PASSWORD, "login");
  }

  return (
    <div className="login-screen">
      <div className="blob blob-a" />
      <div className="blob blob-b" />
      <div className="blob blob-c" />

      <div className="login-card">
        <div className="wordmark wordmark-xl">Feed</div>
        <p className="login-tagline">
          {mode === "login" ? "See what your friends are up to." : "Join the conversation in seconds."}
        </p>

        <form
          className="login-fields"
          onSubmit={(e) => {
            e.preventDefault();
            authenticate(username, password, mode);
          }}
        >
          <input
            type="text"
            placeholder="Username"
            autoComplete="username"
            value={username}
            onChange={(e) => setUsername(e.target.value)}
            autoFocus
          />
          <input
            type="password"
            placeholder="Password"
            autoComplete={mode === "login" ? "current-password" : "new-password"}
            value={password}
            onChange={(e) => setPassword(e.target.value)}
          />
          {error && <div className="form-error">{error}</div>}
          <button type="submit" className="primary-btn" disabled={busy || !username || !password}>
            {busy ? <span className="spinner" /> : mode === "login" ? "Log in" : "Create account"}
          </button>
        </form>

        <div className="login-divider">
          <span>or jump in as</span>
        </div>
        <div className="demo-accounts">
          {DEMO_ACCOUNTS.map((name) => (
            <button key={name} className="demo-chip" onClick={() => quickLogin(name)} disabled={busy}>
              <Avatar username={name} size={36} ring={name === "starlet" ? "creator" : "story"} />
              <span>{name}</span>
            </button>
          ))}
        </div>

        <button
          type="button"
          className="link-btn login-switch"
          onClick={() => {
            setMode(mode === "login" ? "signup" : "login");
            setError(null);
          }}
        >
          {mode === "login" ? "New here? Create an account" : "Already have an account? Log in"}
        </button>
      </div>
    </div>
  );
}
