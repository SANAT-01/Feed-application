"use client";

import { useCallback, useEffect, useState } from "react";
import { useAuth } from "../lib/auth";
import PostCard from "../components/PostCard";
import SuggestedAccounts from "../components/SuggestedAccounts";
import type { FeedPost } from "../lib/types";

interface FeedResponse {
  feed: FeedPost[];
  precomputed: number;
  pulledFromCelebrities: number;
}

export default function HomePage() {
  const { authFetch } = useAuth();
  const [feed, setFeed] = useState<FeedResponse | null>(null);
  const [celebrities, setCelebrities] = useState<Set<number>>(new Set());
  const [loading, setLoading] = useState(true);

  const loadFeed = useCallback(async () => {
    setLoading(true);
    try {
      const [feedRes, usersRes] = await Promise.all([authFetch("/api/feed/me"), fetch("/api/users")]);
      if (feedRes.ok) setFeed(await feedRes.json());
      if (usersRes.ok) {
        const data = await usersRes.json();
        setCelebrities(new Set(data.users.filter((u: { is_celebrity: boolean }) => u.is_celebrity).map((u: { id: number }) => u.id)));
      }
    } finally {
      setLoading(false);
    }
  }, [authFetch]);

  useEffect(() => {
    loadFeed();
    // A post made from the composer (mounted up in AppShell, outside this
    // page) signals completion this way instead of prop-drilling a refresh
    // callback through the shell.
    const handler = () => setTimeout(loadFeed, 800); // fan-out is async — give the worker a moment
    window.addEventListener("feed:posted", handler);
    return () => window.removeEventListener("feed:posted", handler);
  }, [loadFeed]);

  return (
    <div className="feed-page">
      <SuggestedAccounts />

      {feed && (
        <div className="badge-row">
          <span className="badge">{feed.precomputed} from ready list</span>
          <span className="badge">{feed.pulledFromCelebrities} pulled from celebrities</span>
        </div>
      )}

      {loading && <p className="empty">Loading feed…</p>}

      {!loading && feed?.feed.length === 0 && (
        <div className="empty-state">
          <p>Your feed is empty.</p>
          <p className="subtitle">Follow someone from Suggested above (or the Explore tab), or create your first post.</p>
        </div>
      )}

      {!loading &&
        feed?.feed.map((post) => (
          <PostCard key={post.id} post={post} isCelebrity={celebrities.has(post.authorId)} />
        ))}
    </div>
  );
}
