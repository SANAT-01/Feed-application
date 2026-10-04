"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import Link from "next/link";
import Avatar from "./Avatar";
import { CloseIcon, HeartIcon, VerifiedBadge } from "./Icons";
import { textCardBackground } from "./PostCard";
import { useLikes, useSeenStories } from "../lib/local";
import { formatRelativeTime } from "../lib/time";
import type { Story } from "./StoriesRail";

const HOLD_MS = 220;

export default function StoryViewer({
  stories,
  startAuthorId,
  celebrities,
  onClose,
}: {
  stories: Story[];
  startAuthorId: number;
  celebrities: Set<number>;
  onClose: () => void;
}) {
  const { seen, markSeen } = useSeenStories();
  const { isLiked, setLiked } = useLikes();

  // Resume each person's story at their first unwatched post.
  const firstUnseen = useCallback(
    (s: Story) => Math.max(0, s.posts.findIndex((p) => p.id > (seen[s.authorId] ?? 0))),
    [seen]
  );

  const [userIdx, setUserIdx] = useState(() => Math.max(0, stories.findIndex((s) => s.authorId === startAuthorId)));
  const [postIdx, setPostIdx] = useState(() => {
    const s = stories.find((x) => x.authorId === startAuthorId);
    return s ? firstUnseen(s) : 0;
  });
  const [paused, setPaused] = useState(false);
  const pressedAt = useRef(0);

  const story = stories[userIdx];
  const post = story?.posts[postIdx];

  useEffect(() => {
    if (story && post) markSeen(story.authorId, post.id);
  }, [story, post, markSeen]);

  const next = useCallback(() => {
    if (!story) return;
    if (postIdx < story.posts.length - 1) {
      setPostIdx(postIdx + 1);
    } else if (userIdx < stories.length - 1) {
      setUserIdx(userIdx + 1);
      setPostIdx(firstUnseen(stories[userIdx + 1]));
    } else {
      onClose();
    }
  }, [story, postIdx, userIdx, stories, firstUnseen, onClose]);

  const prev = useCallback(() => {
    if (postIdx > 0) setPostIdx(postIdx - 1);
    else if (userIdx > 0) {
      setUserIdx(userIdx - 1);
      setPostIdx(0);
    }
  }, [postIdx, userIdx]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
      else if (e.key === "ArrowRight") next();
      else if (e.key === "ArrowLeft") prev();
    };
    window.addEventListener("keydown", onKey);
    document.body.classList.add("no-scroll");
    return () => {
      window.removeEventListener("keydown", onKey);
      document.body.classList.remove("no-scroll");
    };
  }, [next, prev, onClose]);

  if (!story || !post) return null;

  // Press-and-hold pauses; a quick tap navigates (left third = back).
  function onPointerDown() {
    pressedAt.current = Date.now();
    setPaused(true);
  }
  function onPointerUp(e: React.PointerEvent<HTMLDivElement>) {
    setPaused(false);
    if (Date.now() - pressedAt.current > HOLD_MS) return;
    const rect = e.currentTarget.getBoundingClientRect();
    if (e.clientX - rect.left < rect.width / 3) prev();
    else next();
  }

  const liked = isLiked(post.id);

  return (
    <div className="story-viewer" onClick={onClose}>
      <div className="story-frame" onClick={(e) => e.stopPropagation()}>
        <div className="story-progress">
          {story.posts.map((p, i) => (
            <span className="story-progress-track" key={p.id}>
              <span
                key={`${userIdx}-${postIdx}`}
                className={`story-progress-fill ${i < postIdx ? "done" : i === postIdx ? "active" : ""}`}
                style={{ animationPlayState: paused ? "paused" : "running" }}
                onAnimationEnd={i === postIdx ? next : undefined}
              />
            </span>
          ))}
        </div>

        <div className="story-header">
          <Link href={`/profile/${story.authorId}`} className="story-author" onClick={onClose}>
            <Avatar username={story.author} size={32} />
            <span>{story.author}</span>
            {celebrities.has(story.authorId) && <VerifiedBadge />}
            <span className="story-time">{formatRelativeTime(post.createdAt)}</span>
          </Link>
          <button className="story-close" onClick={onClose} aria-label="Close story">
            <CloseIcon size={24} />
          </button>
        </div>

        <div
          className="story-content"
          onPointerDown={onPointerDown}
          onPointerUp={onPointerUp}
          onPointerLeave={() => setPaused(false)}
        >
          {post.mediaUrl ? (
            <>
              <img src={post.mediaUrl} alt="" draggable={false} />
              {post.body && <p className="story-caption">{post.body}</p>}
            </>
          ) : (
            <div className="story-textcard" style={{ background: textCardBackground(post.id) }}>
              <p>{post.body}</p>
            </div>
          )}
        </div>

        <div className="story-footer">
          <button
            className={`story-like ${liked ? "is-liked" : ""}`}
            onClick={() => setLiked(post.id, !liked)}
            aria-label={liked ? "Unlike" : "Like"}
          >
            <span key={liked ? "on" : "off"} className="action-icon">
              <HeartIcon size={28} filled={liked} />
            </span>
          </button>
        </div>
      </div>
    </div>
  );
}
