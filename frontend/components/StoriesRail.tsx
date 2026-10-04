"use client";

import Avatar from "./Avatar";
import { useAuth } from "../lib/auth";
import { useSeenStories } from "../lib/local";
import type { FeedPost } from "../lib/types";

export interface Story {
  authorId: number;
  author: string;
  /** Oldest -> newest, the order they play in. */
  posts: FeedPost[];
  latestId: number;
}

const POSTS_PER_STORY = 5;

/** Groups the feed's posts by author into stories, most recently active first. */
export function buildStories(feed: FeedPost[], excludeUserId?: number): Story[] {
  const byAuthor = new Map<number, Story>();
  for (const post of feed) {
    if (post.authorId === excludeUserId) continue;
    let story = byAuthor.get(post.authorId);
    if (!story) {
      story = { authorId: post.authorId, author: post.author, posts: [], latestId: post.id };
      byAuthor.set(post.authorId, story);
    }
    if (story.posts.length < POSTS_PER_STORY) story.posts.unshift(post);
  }
  return [...byAuthor.values()];
}

export default function StoriesRail({
  stories,
  celebrities,
  onOpen,
}: {
  stories: Story[];
  celebrities: Set<number>;
  onOpen: (authorId: number) => void;
}) {
  const { session } = useAuth();
  const { seen } = useSeenStories();
  if (!session) return null;

  // Unwatched stories first, keeping recency order within each group.
  const isUnseen = (s: Story) => s.latestId > (seen[s.authorId] ?? 0);
  const ordered = [...stories.filter(isUnseen), ...stories.filter((s) => !isUnseen(s))];

  return (
    <div className="stories" role="list">
      <button
        className="story-item"
        onClick={() => window.dispatchEvent(new Event("composer:open"))}
        role="listitem"
      >
        <span className="story-self">
          <Avatar username={session.user.username} size={62} />
          <span className="story-plus" aria-hidden>
            +
          </span>
        </span>
        <span className="story-name">Your story</span>
      </button>
      {ordered.map((s) => (
        <button className="story-item" key={s.authorId} onClick={() => onOpen(s.authorId)} role="listitem">
          <Avatar username={s.author} size={62} ring={isUnseen(s) ? "story" : "seen"} />
          <span className={`story-name ${celebrities.has(s.authorId) ? "story-name-creator" : ""}`}>{s.author}</span>
        </button>
      ))}
    </div>
  );
}
