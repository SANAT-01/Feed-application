"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useAuth } from "../lib/auth";
import Avatar from "./Avatar";
import type { DirectoryUser } from "../lib/types";

/** The actual "way to follow someone new" — a horizontal row of accounts
 * you don't already follow, same spot Instagram puts its suggestions. */
export default function SuggestedAccounts() {
  const { session, authFetch } = useAuth();
  const [users, setUsers] = useState<DirectoryUser[] | null>(null);

  useEffect(() => {
    let cancelled = false;
    authFetch("/api/users").then(async (res) => {
      if (!res.ok || cancelled) return;
      const data = await res.json();
      setUsers(data.users);
    });
    return () => {
      cancelled = true;
    };
  }, [authFetch]);

  if (!users || !session) return null;
  const suggestions = users.filter((u) => u.id !== session.user.id && !u.isFollowedByMe).slice(0, 12);
  if (suggestions.length === 0) return null;

  return (
    <div className="suggested-row">
      <p className="suggested-row-title">Suggested for you</p>
      <div className="suggested-scroll">
        {suggestions.map((u) => (
          <Link href={`/profile/${u.id}`} className="suggested-item" key={u.id}>
            <Avatar username={u.username} size={56} ring={u.is_celebrity} />
            <span>{u.username}</span>
          </Link>
        ))}
      </div>
    </div>
  );
}
