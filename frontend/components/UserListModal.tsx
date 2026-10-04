"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import Avatar from "./Avatar";
import FollowButton from "./FollowButton";
import { CloseIcon, SearchIcon, VerifiedBadge } from "./Icons";
import { useAuth } from "../lib/auth";
import type { ProfileListUser } from "../lib/types";

export default function UserListModal({
  title,
  users,
  loading,
  onClose,
}: {
  title: string;
  users: ProfileListUser[];
  loading: boolean;
  onClose: () => void;
}) {
  const { session } = useAuth();
  const [query, setQuery] = useState("");

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    window.addEventListener("keydown", onKey);
    document.body.classList.add("no-scroll");
    return () => {
      window.removeEventListener("keydown", onKey);
      document.body.classList.remove("no-scroll");
    };
  }, [onClose]);

  const q = query.trim().toLowerCase();
  const filtered = users.filter((u) => u.username.toLowerCase().includes(q));

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div className="modal-sheet list-sheet" onClick={(e) => e.stopPropagation()}>
        <div className="sheet-header">
          <span />
          <span className="sheet-title">{title}</span>
          <button className="icon-btn" onClick={onClose} aria-label="Close">
            <CloseIcon />
          </button>
        </div>
        {users.length > 6 && (
          <div className="search-box search-box-inset">
            <SearchIcon size={16} />
            <input placeholder="Search" value={query} onChange={(e) => setQuery(e.target.value)} />
          </div>
        )}
        <div className="user-list">
          {loading &&
            Array.from({ length: 5 }, (_, i) => (
              <div className="user-row" key={i}>
                <span className="skel skel-circle" style={{ width: 44, height: 44 }} />
                <span className="skel skel-line" style={{ width: 140 }} />
              </div>
            ))}
          {!loading && filtered.length === 0 && <p className="empty">{q ? "No matches." : "Nobody here yet."}</p>}
          {!loading &&
            filtered.map((u) => (
              <div className="user-row" key={u.id}>
                <Link href={`/profile/${u.id}`} className="user-identity" onClick={onClose}>
                  <Avatar username={u.username} size={44} ring={u.isCelebrity ? "creator" : "none"} />
                  <span className="user-identity-name">
                    {u.username}
                    {u.isCelebrity && <VerifiedBadge />}
                  </span>
                </Link>
                {session && u.id !== session.user.id && u.isFollowedByMe !== null && (
                  <FollowButton userId={u.id} username={u.username} initialFollowed={u.isFollowedByMe} compact />
                )}
              </div>
            ))}
        </div>
      </div>
    </div>
  );
}
