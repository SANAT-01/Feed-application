"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useAuth } from "../lib/auth";
import Avatar from "./Avatar";
import { HomeIcon, SearchIcon, PlusSquareIcon } from "./Icons";

export default function BottomNav({ onCompose }: { onCompose: () => void }) {
  const pathname = usePathname();
  const { session } = useAuth();
  if (!session) return null;

  const isHome = pathname === "/";
  const isExplore = pathname === "/explore";
  const isProfile = pathname === `/profile/${session.user.id}`;

  return (
    <nav className="bottom-nav">
      <div className="bottom-nav-inner">
        <Link href="/" className={`nav-item ${isHome ? "active" : ""}`} aria-label="Home">
          <HomeIcon filled={isHome} />
        </Link>
        <Link href="/explore" className={`nav-item ${isExplore ? "active" : ""}`} aria-label="Explore">
          <SearchIcon />
        </Link>
        <button className="nav-item" onClick={onCompose} aria-label="New post">
          <PlusSquareIcon />
        </button>
        <Link
          href={`/profile/${session.user.id}`}
          className={`nav-item ${isProfile ? "active" : ""}`}
          aria-label="Profile"
        >
          <span className={`nav-avatar ${isProfile ? "nav-avatar-active" : ""}`}>
            <Avatar username={session.user.username} size={26} />
          </span>
        </Link>
      </div>
    </nav>
  );
}
