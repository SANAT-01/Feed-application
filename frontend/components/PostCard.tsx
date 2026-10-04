"use client";

import Link from "next/link";
import { useRef, useState } from "react";
import Avatar from "./Avatar";
import { BookmarkIcon, HeartIcon, SendIcon, VerifiedBadge } from "./Icons";
import { useToast } from "./Toast";
import { useLikes, useSaved } from "../lib/local";
import { formatRelativeTime } from "../lib/time";
import type { FeedPost } from "../lib/types";

const TEXT_CARD_GRADIENTS = [
  "linear-gradient(135deg, #667eea 0%, #764ba2 100%)",
  "linear-gradient(135deg, #f093fb 0%, #f5576c 100%)",
  "linear-gradient(135deg, #4facfe 0%, #00c6fb 100%)",
  "linear-gradient(135deg, #43e97b 0%, #38f9d7 100%)",
  "linear-gradient(135deg, #fa709a 0%, #fee140 100%)",
  "linear-gradient(135deg, #30cfd0 0%, #330867 100%)",
  "linear-gradient(135deg, #ff9a56 0%, #ff6a88 100%)",
  "linear-gradient(135deg, #0f2027 0%, #2c5364 100%)",
];

/** Text-only posts render as a full-bleed colour card instead of a bare line of text. */
export function textCardBackground(postId: number): string {
  return TEXT_CARD_GRADIENTS[postId % TEXT_CARD_GRADIENTS.length];
}

const CAPTION_PREVIEW = 140;

export default function PostCard({ post, isCelebrity }: { post: FeedPost; isCelebrity: boolean }) {
  const { isLiked, setLiked } = useLikes();
  const { isSaved, toggleSaved } = useSaved();
  const toast = useToast();
  const liked = isLiked(post.id);
  const saved = isSaved(post.id);

  const [burst, setBurst] = useState(0);
  const [loaded, setLoaded] = useState(false);
  const [broken, setBroken] = useState(false);
  const [expanded, setExpanded] = useState(false);
  const lastTap = useRef(0);

  // Manual double-tap detection: `dblclick` doesn't fire reliably on touch.
  function onMediaTap() {
    const now = Date.now();
    if (now - lastTap.current < 300) {
      if (!liked) setLiked(post.id, true);
      setBurst((b) => b + 1);
      lastTap.current = 0;
    } else {
      lastTap.current = now;
    }
  }

  async function share() {
    const url = `${window.location.origin}/profile/${post.authorId}`;
    try {
      if (navigator.share) {
        await navigator.share({ title: `${post.author} on Feed`, url });
        return;
      }
      await navigator.clipboard.writeText(url);
      toast("Link copied to clipboard");
    } catch {
      // share sheet dismissed
    }
  }

  function save() {
    toast(toggleSaved(post) ? "Saved to your collection" : "Removed from saved");
  }

  const hasMedia = Boolean(post.mediaUrl) && !broken;
  const longCaption = post.body.length > CAPTION_PREVIEW;
  const caption = longCaption && !expanded ? `${post.body.slice(0, CAPTION_PREVIEW).trimEnd()}…` : post.body;

  return (
    <article className="post">
      <header className="post-header">
        <Link href={`/profile/${post.authorId}`} className="post-author">
          <Avatar username={post.author} size={34} ring={isCelebrity ? "creator" : "none"} />
          <span className="post-author-name">
            {post.author}
            {isCelebrity && <VerifiedBadge />}
          </span>
        </Link>
        <span className="post-time">{formatRelativeTime(post.createdAt)}</span>
      </header>

      <div className="post-stage" onClick={onMediaTap}>
        {hasMedia ? (
          <div className={`post-media ${loaded ? "is-loaded" : ""}`}>
            <img
              src={post.mediaUrl!}
              alt={post.body}
              loading="lazy"
              decoding="async"
              draggable={false}
              onLoad={() => setLoaded(true)}
              onError={() => setBroken(true)}
            />
          </div>
        ) : (
          <div className="post-textcard" style={{ background: textCardBackground(post.id) }}>
            <p>{post.body}</p>
          </div>
        )}
        {burst > 0 && (
          <span key={burst} className="heart-burst" aria-hidden>
            <HeartIcon size={96} filled />
          </span>
        )}
      </div>

      <div className="post-actions">
        <button
          className={`action-btn ${liked ? "is-liked" : ""}`}
          onClick={() => setLiked(post.id, !liked)}
          aria-label={liked ? "Unlike" : "Like"}
          aria-pressed={liked}
        >
          <span key={liked ? "on" : "off"} className="action-icon">
            <HeartIcon size={26} filled={liked} />
          </span>
        </button>
        <button className="action-btn" onClick={share} aria-label="Share">
          <SendIcon size={24} />
        </button>
        <span className="post-actions-spacer" />
        <button
          className={`action-btn ${saved ? "is-saved" : ""}`}
          onClick={save}
          aria-label={saved ? "Remove from saved" : "Save"}
          aria-pressed={saved}
        >
          <span key={saved ? "on" : "off"} className="action-icon">
            <BookmarkIcon size={24} filled={saved} />
          </span>
        </button>
      </div>

      {liked && <p className="post-liked-by">Liked by you</p>}

      {hasMedia && post.body && (
        <p className="post-caption">
          <Link href={`/profile/${post.authorId}`} className="post-caption-author">
            {post.author}
          </Link>{" "}
          {caption}
          {longCaption && !expanded && (
            <button className="more-btn" onClick={() => setExpanded(true)}>
              more
            </button>
          )}
        </p>
      )}
    </article>
  );
}
