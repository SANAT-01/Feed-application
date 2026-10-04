"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useAuth } from "../lib/auth";
import PostCard from "../components/PostCard";
import SuggestedAccounts from "../components/SuggestedAccounts";
import StoriesRail, { buildStories } from "../components/StoriesRail";
import StoryViewer from "../components/StoryViewer";
import Avatar from "../components/Avatar";
import { PostSkeleton, StoriesSkeleton } from "../components/Skeleton";
import { ArrowUpIcon, CheckIcon } from "../components/Icons";
import type { FeedPost } from "../lib/types";

interface FeedResponse {
  feed: FeedPost[];
  precomputed: number;
  pulledFromCelebrities: number;
}

const POLL_MS = 30_000;
const SUGGESTIONS_AFTER = 3; // carousel slots in after this many posts

export default function HomePage() {
  const { session, authFetch } = useAuth();
  const [feed, setFeed] = useState<FeedResponse | null>(null);
  const [incoming, setIncoming] = useState<FeedResponse | null>(null);
  const [celebrities, setCelebrities] = useState<Set<number>>(new Set());
  const [loading, setLoading] = useState(true);
  const [storyAuthor, setStoryAuthor] = useState<number | null>(null);
  const feedRef = useRef(feed);
  feedRef.current = feed;

  const fetchFeed = useCallback(async (): Promise<FeedResponse | null> => {
    const res = await authFetch("/api/feed/me");
    return res.ok ? res.json() : null;
  }, [authFetch]);

  const load = useCallback(async () => {
    try {
      const [next, usersRes] = await Promise.all([fetchFeed(), authFetch("/api/users")]);
      if (next) {
        setFeed(next);
        setIncoming(null);
      }
      if (usersRes.ok) {
        const { users } = await usersRes.json();
        setCelebrities(
          new Set(users.filter((u: { is_celebrity: boolean }) => u.is_celebrity).map((u: { id: number }) => u.id))
        );
      }
    } finally {
      setLoading(false);
    }
  }, [authFetch, fetchFeed]);

  useEffect(() => {
    load();
    // Fan-out is async (outbox -> Kafka -> worker), so give it a beat before re-reading.
    const onPosted = () => setTimeout(load, 900);
    const onRefresh = () => setTimeout(load, 300);
    window.addEventListener("feed:posted", onPosted);
    window.addEventListener("feed:refresh", onRefresh);
    return () => {
      window.removeEventListener("feed:posted", onPosted);
      window.removeEventListener("feed:refresh", onRefresh);
    };
  }, [load]);

  // New posts wait behind a pill rather than shifting the feed under the reader.
  useEffect(() => {
    const timer = setInterval(async () => {
      if (document.hidden) return;
      const next = await fetchFeed();
      const topNow = feedRef.current?.feed[0]?.id ?? 0;
      if (next && (next.feed[0]?.id ?? 0) > topNow) setIncoming(next);
    }, POLL_MS);
    return () => clearInterval(timer);
  }, [fetchFeed]);

  function showIncoming() {
    if (!incoming) return;
    setFeed(incoming);
    setIncoming(null);
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  const posts = feed?.feed ?? [];
  const stories = buildStories(posts, session?.user.id);
  const topId = posts[0]?.id ?? 0;
  const freshPosts = incoming?.feed.filter((p) => p.id > topId) ?? [];
  const freshAuthors = [...new Set(freshPosts.map((p) => p.author))].slice(0, 3);

  return (
    <div className="home">
      {freshPosts.length > 0 && (
        <div className="new-posts-anchor">
          <button className="new-posts-pill" onClick={showIncoming}>
            <ArrowUpIcon />
            <span className="new-posts-avatars">
              {freshAuthors.map((a) => (
                <Avatar key={a} username={a} size={22} />
              ))}
            </span>
            {freshPosts.length === 1 ? "1 new post" : `${freshPosts.length} new posts`}
          </button>
        </div>
      )}

      {loading ? (
        <StoriesSkeleton />
      ) : (
        <StoriesRail stories={stories} celebrities={celebrities} onOpen={setStoryAuthor} />
      )}

      {loading && [0, 1].map((i) => <PostSkeleton key={i} />)}

      {!loading && posts.length === 0 && (
        <>
          <div className="empty-hero">
            <div className="empty-hero-art" aria-hidden>
              ✨
            </div>
            <h2>Your feed is waiting</h2>
            <p>Follow a few people and their posts will show up here instantly.</p>
            <Link href="/explore" className="primary-btn primary-btn-inline">
              Discover people
            </Link>
          </div>
          <SuggestedAccounts />
        </>
      )}

      {!loading &&
        posts.map((post, i) => (
          <div key={post.id}>
            {i === SUGGESTIONS_AFTER && <SuggestedAccounts />}
            <PostCard post={post} isCelebrity={celebrities.has(post.authorId)} />
          </div>
        ))}
      {!loading && posts.length > 0 && posts.length <= SUGGESTIONS_AFTER && <SuggestedAccounts />}

      {!loading && posts.length > 0 && feed && (
        <div className="caught-up">
          <span className="caught-up-check">
            <CheckIcon size={26} />
          </span>
          <h3>You&apos;re all caught up</h3>
          <p>You&apos;ve seen all new posts from the people you follow.</p>
          <span className="caught-up-meta">
            {feed.precomputed} delivered by fan-out · {feed.pulledFromCelebrities} pulled from creators
          </span>
        </div>
      )}

      {storyAuthor !== null && (
        <StoryViewer
          stories={stories}
          startAuthorId={storyAuthor}
          celebrities={celebrities}
          onClose={() => setStoryAuthor(null)}
        />
      )}
    </div>
  );
}
