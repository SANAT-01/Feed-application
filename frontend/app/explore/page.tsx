"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { useAuth } from "../../lib/auth";
import Avatar from "../../components/Avatar";
import FollowButton from "../../components/FollowButton";
import { SearchIcon } from "../../components/Icons";
import type { DirectoryUser } from "../../lib/types";

export default function ExplorePage() {
  const { session, authFetch } = useAuth();
  const [users, setUsers] = useState<DirectoryUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [query, setQuery] = useState("");

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await authFetch("/api/users");
      if (res.ok) setUsers((await res.json()).users);
    } finally {
      setLoading(false);
    }
  }, [authFetch]);

  useEffect(() => {
    load();
  }, [load]);

  const filtered = users
    .filter((u) => u.id !== session?.user.id)
    .filter((u) => u.username.toLowerCase().includes(query.trim().toLowerCase()));

  return (
    <div className="explore-page">
      <div className="search-box">
        <SearchIcon size={18} />
        <input
          type="text"
          placeholder="Search accounts"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
        />
      </div>

      {loading && <p className="empty">Loading…</p>}
      {!loading && filtered.length === 0 && <p className="empty">No accounts match "{query}".</p>}

      <div className="explore-list">
        {!loading &&
          filtered.map((u) => (
            <div className="user-list-row" key={u.id}>
              <Link href={`/profile/${u.id}`} className="user-list-identity">
                <Avatar username={u.username} size={44} ring={u.is_celebrity} />
                <span>
                  {u.username}
                  {u.is_celebrity && <span className="celeb-badge">★</span>}
                </span>
              </Link>
              {u.isFollowedByMe !== null && (
                <FollowButton userId={u.id} initialFollowed={u.isFollowedByMe} compact />
              )}
            </div>
          ))}
      </div>
    </div>
  );
}
