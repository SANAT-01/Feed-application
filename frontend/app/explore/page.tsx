"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useAuth } from "../../lib/auth";
import Avatar from "../../components/Avatar";
import FollowButton from "../../components/FollowButton";
import PostViewer from "../../components/PostViewer";
import { textCardBackground } from "../../components/PostCard";
import { GridSkeleton } from "../../components/Skeleton";
import { SearchIcon, VerifiedBadge } from "../../components/Icons";
import type { DirectoryUser, FeedPost, ProfilePost } from "../../lib/types";

const SAMPLE_PEOPLE = 7; // non-creator accounts whose posts seed the mosaic
const MOSAIC_SIZE = 24;

function shuffle<T>(items: T[]): T[] {
  const a = [...items];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

/** Image posts make the mosaic; a few text cards are woven in for colour. */
function buildMosaic(posts: FeedPost[]): FeedPost[] {
  const media = posts.filter((p) => p.mediaUrl).sort((a, b) => b.id - a.id).slice(0, MOSAIC_SIZE);
  const text = shuffle(posts.filter((p) => !p.mediaUrl));
  const tiles = [...media];
  [4, 11, 18].forEach((slot, i) => text[i] && tiles.splice(Math.min(slot, tiles.length), 0, text[i]));
  return tiles;
}

export default function ExplorePage() {
  const { session, authFetch } = useAuth();
  const [users, setUsers] = useState<DirectoryUser[] | null>(null);
  const [mosaic, setMosaic] = useState<FeedPost[] | null>(null);
  const [query, setQuery] = useState("");
  const [open, setOpen] = useState<FeedPost | null>(null);
  const myId = session?.user.id;

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const res = await authFetch("/api/users");
      if (!res.ok || cancelled) return;
      const list: DirectoryUser[] = (await res.json()).users;
      setUsers(list);

      const sample = [
        ...list.filter((u) => u.is_celebrity),
        ...shuffle(list.filter((u) => !u.is_celebrity && u.id !== myId)).slice(0, SAMPLE_PEOPLE),
      ];
      const perUser = await Promise.all(
        sample.map(async (u) => {
          const r = await fetch(`/api/users/${u.id}/posts`);
          if (!r.ok) return [];
          const { posts } = (await r.json()) as { posts: ProfilePost[] };
          return posts.map((p) => ({ ...p, author: u.username }));
        })
      );
      if (!cancelled) setMosaic(buildMosaic(perUser.flat()));
    })();
    return () => {
      cancelled = true;
    };
  }, [authFetch, myId]);

  const celebrityIds = new Set(users?.filter((u) => u.is_celebrity).map((u) => u.id));
  const others = users?.filter((u) => u.id !== myId) ?? [];
  const q = query.trim().toLowerCase();
  const matches = others.filter((u) => u.username.toLowerCase().includes(q));
  const creators = others.filter((u) => u.is_celebrity);
  const people = others.filter((u) => !u.is_celebrity && u.isFollowedByMe === false).slice(0, 12);

  return (
    <div className="explore">
      <div className="search-box search-box-sticky">
        <SearchIcon size={18} />
        <input type="search" placeholder="Search people" value={query} onChange={(e) => setQuery(e.target.value)} />
      </div>

      {q ? (
        <div className="user-list">
          {matches.length === 0 && <p className="empty">No accounts match “{query}”.</p>}
          {matches.map((u) => (
            <div className="user-row" key={u.id}>
              <Link href={`/profile/${u.id}`} className="user-identity">
                <Avatar username={u.username} size={44} ring={u.is_celebrity ? "creator" : "none"} />
                <span className="user-identity-name">
                  {u.username}
                  {u.is_celebrity && <VerifiedBadge />}
                </span>
              </Link>
              {u.isFollowedByMe !== null && (
                <FollowButton userId={u.id} username={u.username} initialFollowed={u.isFollowedByMe} compact />
              )}
            </div>
          ))}
        </div>
      ) : (
        <>
          {creators.length > 0 && (
            <section className="explore-section">
              <h2 className="section-title">Creators to watch</h2>
              <div className="creator-row">
                {creators.map((u) => (
                  <Link href={`/profile/${u.id}`} className="creator-card" key={u.id}>
                    <Avatar username={u.username} size={84} ring="creator" />
                    <span className="suggested-name">
                      {u.username}
                      <VerifiedBadge />
                    </span>
                    <span className="suggested-reason">Popular creator</span>
                    {u.isFollowedByMe !== null && (
                      <FollowButton
                        userId={u.id}
                        username={u.username}
                        initialFollowed={u.isFollowedByMe}
                        compact
                        block
                      />
                    )}
                  </Link>
                ))}
              </div>
            </section>
          )}

          <section className="explore-section">
            <h2 className="section-title">Popular now</h2>
            {!mosaic ? (
              <GridSkeleton count={12} />
            ) : (
              <div className="mosaic">
                {mosaic.map((p, i) => (
                  <button
                    key={p.id}
                    className={`grid-tile ${i % 10 === 2 || i % 10 === 7 ? "grid-tile-big" : ""}`}
                    onClick={() => setOpen(p)}
                    aria-label={`Open post by ${p.author}`}
                  >
                    {p.mediaUrl ? (
                      <img src={p.mediaUrl} alt="" loading="lazy" />
                    ) : (
                      <span className="grid-text" style={{ background: textCardBackground(p.id) }}>
                        {p.body}
                      </span>
                    )}
                    <span className="grid-tile-author">@{p.author}</span>
                  </button>
                ))}
              </div>
            )}
          </section>

          {people.length > 0 && (
            <section className="explore-section">
              <h2 className="section-title">People you may know</h2>
              <div className="people-grid">
                {people.map((u) => (
                  <Link href={`/profile/${u.id}`} className="person-card" key={u.id}>
                    <Avatar username={u.username} size={64} />
                    <span className="suggested-name">{u.username}</span>
                    <FollowButton userId={u.id} username={u.username} initialFollowed={false} compact block />
                  </Link>
                ))}
              </div>
            </section>
          )}
        </>
      )}

      {open && (
        <PostViewer post={open} isCelebrity={celebrityIds.has(open.authorId)} onClose={() => setOpen(null)} />
      )}
    </div>
  );
}
