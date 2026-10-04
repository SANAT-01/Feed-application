"use client";

import { useState, type ReactNode } from "react";
import { useAuth } from "../lib/auth";
import LoginScreen from "./LoginScreen";
import BottomNav from "./BottomNav";
import ComposerModal from "./ComposerModal";

export default function AppShell({ children }: { children: ReactNode }) {
  const { session } = useAuth();
  const [composerOpen, setComposerOpen] = useState(false);

  if (session === undefined) return null; // avoid a login-screen flash while localStorage loads
  if (session === null) return <LoginScreen />;

  return (
    <div className="app-shell">
      <header className="top-bar">
        <span className="top-bar-logo">Feed</span>
      </header>
      <main className="app-main">{children}</main>
      <BottomNav onCompose={() => setComposerOpen(true)} />
      {composerOpen && <ComposerModal onClose={() => setComposerOpen(false)} />}
    </div>
  );
}
