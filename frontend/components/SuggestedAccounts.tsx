"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useAuth } from "../lib/auth";
import Avatar from "./Avatar";
import FollowButton from "./FollowButton";
import { CloseIcon, VerifiedBadge } from "./Icons";
import type { DirectoryUser } from "../lib/types";

/** Accounts the viewer doesn't follow yet — creators first, then everyone else. */
export function useSuggestions(limit: number) {
  const { session, authFetch } = useAuth();
  const [users, setUsers] = useState<DirectoryUser[] | null>(null);

  useEffect(() => {
    let cancelled = false;
    authFetch("/api/users").then(async (res) => {
      if (res.ok && !cancelled) setUsers((await res.json()).users);
    });
    return () => {
      cancelled = true;
    };
  }, [authFetch]);

  if (!users || !session) return null;
  return users
    .filter((u) => u.id !== session.user.id && u.isFollowedByMe === false)
    .sort((a, b) => Number(b.is_celebrity) - Number(a.is_celebrity))
    .slice(0, limit);
}

/** Horizontal card carousel dropped into the feed, Instagram-style. */
export default function SuggestedAccounts() {
  const suggestions = useSuggestions(12);
  const [dismissed, setDismissed] = useState<Set<number>>(new Set());

  const visible = suggestions?.filter((u) => !dismissed.has(u.id)) ?? [];
  if (visible.length === 0) return null;

  return (
    <section className="suggested">
      <div className="suggested-head">
        <span>Suggested for you</span>
        <Link href="/explore" className="link-btn">
          See all
        </Link>
      </div>
      <div className="suggested-scroll">
        {visible.map((u) => (
          <Link href={`/profile/${u.id}`} className="suggested-card" key={u.id}>
            <button
              className="suggested-dismiss"
              aria-label={`Dismiss ${u.username}`}
              onClick={(e) => {
                e.preventDefault();
                setDismissed((d) => new Set(d).add(u.id));
              }}
            >
              <CloseIcon size={14} />
            </button>
            <Avatar username={u.username} size={72} ring={u.is_celebrity ? "creator" : "none"} />
            <span className="suggested-name">
              {u.username}
              {u.is_celebrity && <VerifiedBadge />}
            </span>
            <span className="suggested-reason">{u.is_celebrity ? "Popular creator" : "Suggested for you"}</span>
            <FollowButton userId={u.id} username={u.username} initialFollowed={false} compact block />
          </Link>
        ))}
      </div>
    </section>
  );
}

/** Desktop right rail: who you are + a short follow list. */
export function RightRail() {
  const { session, logout } = useAuth();
  const suggestions = useSuggestions(6);
  if (!session) return null;

  return (
    <aside className="right-rail">
      <div className="rail-me">
        <Link href={`/profile/${session.user.id}`} className="rail-identity">
          <Avatar username={session.user.username} size={48} />
          <span>
            <strong>{session.user.username}</strong>
            <span className="rail-sub">Your profile</span>
          </span>
        </Link>
        <button className="link-btn" onClick={logout}>
          Switch
        </button>
      </div>

      {suggestions && suggestions.length > 0 && (
        <>
          <div className="rail-head">
            <span>Suggested for you</span>
            <Link href="/explore" className="link-btn link-btn-plain">
              See all
            </Link>
          </div>
          <ul className="rail-list">
            {suggestions.map((u) => (
              <li key={u.id}>
                <Link href={`/profile/${u.id}`} className="rail-identity">
                  <Avatar username={u.username} size={36} ring={u.is_celebrity ? "creator" : "none"} />
                  <span>
                    <strong>
                      {u.username}
                      {u.is_celebrity && <VerifiedBadge />}
                    </strong>
                    <span className="rail-sub">{u.is_celebrity ? "Popular creator" : "New to you"}</span>
                  </span>
                </Link>
                <FollowButton userId={u.id} username={u.username} initialFollowed={false} compact />
              </li>
            ))}
          </ul>
        </>
      )}

      <p className="rail-footer">Feed · fan-out on write, pull for creators</p>
    </aside>
  );
}
