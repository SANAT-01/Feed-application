"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useAuth } from "../lib/auth";
import Avatar from "./Avatar";
import { CompassIcon, HomeIcon, LogoutIcon, PlusSquareIcon } from "./Icons";

/** One nav, three layouts (via CSS): bottom bar on phones, icon rail on
 * tablets, labelled sidebar on desktop. */
export default function Nav({ onCompose }: { onCompose: () => void }) {
  const pathname = usePathname();
  const { session, logout } = useAuth();
  if (!session) return null;

  const isHome = pathname === "/";
  const isExplore = pathname === "/explore";
  const isProfile = pathname === `/profile/${session.user.id}`;

  // Tapping Home while already home jumps to the top and pulls fresh posts.
  function onHomeClick() {
    if (!isHome) return;
    window.scrollTo({ top: 0, behavior: "smooth" });
    window.dispatchEvent(new Event("feed:refresh"));
  }

  return (
    <nav className="nav">
      <Link href="/" className="nav-logo" aria-label="Feed home">
        <span className="wordmark">Feed</span>
        <span className="wordmark-mini">F</span>
      </Link>

      <Link href="/" className={`nav-item ${isHome ? "active" : ""}`} onClick={onHomeClick}>
        <HomeIcon filled={isHome} />
        <span className="nav-label">Home</span>
      </Link>
      <Link href="/explore" className={`nav-item ${isExplore ? "active" : ""}`}>
        <CompassIcon filled={isExplore} />
        <span className="nav-label">Explore</span>
      </Link>
      <button className="nav-item nav-create" onClick={onCompose}>
        <PlusSquareIcon />
        <span className="nav-label">Create</span>
      </button>
      <Link href={`/profile/${session.user.id}`} className={`nav-item ${isProfile ? "active" : ""}`}>
        <span className={`nav-avatar ${isProfile ? "nav-avatar-active" : ""}`}>
          <Avatar username={session.user.username} size={26} />
        </span>
        <span className="nav-label">Profile</span>
      </Link>

      <span className="nav-spacer" />
      <button className="nav-item nav-logout" onClick={logout}>
        <LogoutIcon size={24} />
        <span className="nav-label">Log out</span>
      </button>
    </nav>
  );
}
