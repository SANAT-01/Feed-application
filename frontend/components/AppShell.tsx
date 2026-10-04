"use client";

import { useEffect, useState, type ReactNode } from "react";
import { usePathname } from "next/navigation";
import { useAuth } from "../lib/auth";
import LoginScreen from "./LoginScreen";
import Nav from "./BottomNav";
import ComposerModal from "./ComposerModal";
import { RightRail } from "./SuggestedAccounts";
import { PlusSquareIcon } from "./Icons";

export default function AppShell({ children }: { children: ReactNode }) {
  const { session } = useAuth();
  const pathname = usePathname();
  const [composerOpen, setComposerOpen] = useState(false);

  // The stories rail's "Your story" bubble opens the composer from inside a page.
  useEffect(() => {
    const open = () => setComposerOpen(true);
    window.addEventListener("composer:open", open);
    return () => window.removeEventListener("composer:open", open);
  }, []);

  if (session === undefined) return null; // avoid a login-screen flash while localStorage loads
  if (session === null) return <LoginScreen />;

  return (
    <div className="app-shell">
      <Nav onCompose={() => setComposerOpen(true)} />
      <div className="app-column">
        <header className="top-bar">
          <span className="wordmark">Feed</span>
          <button className="icon-btn" onClick={() => setComposerOpen(true)} aria-label="New post">
            <PlusSquareIcon size={26} />
          </button>
        </header>
        <main className="app-main">{children}</main>
      </div>
      {pathname === "/" && <RightRail />}
      {composerOpen && <ComposerModal onClose={() => setComposerOpen(false)} />}
    </div>
  );
}
