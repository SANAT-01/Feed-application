"use client";

import { useCallback, useSyncExternalStore } from "react";
import { useAuth } from "./auth";
import type { FeedPost } from "./types";

// Per-viewer, per-device state: likes, saves, seen stories. The API has no
// endpoints for these yet, so they live in localStorage, namespaced by the
// logged-in user's id so switching accounts on one browser doesn't leak.
const listeners = new Set<() => void>();
const cache = new Map<string, { raw: string | null; value: unknown }>();

function subscribe(cb: () => void) {
  listeners.add(cb);
  window.addEventListener("storage", cb);
  return () => {
    listeners.delete(cb);
    window.removeEventListener("storage", cb);
  };
}

// useSyncExternalStore requires a referentially stable snapshot between
// changes, so parsed values are cached against the raw string they came from.
function readJson<T>(key: string, fallback: T): T {
  let raw: string | null = null;
  try {
    raw = localStorage.getItem(key);
  } catch {
    // storage blocked (private mode etc.) — behave as empty
  }
  const hit = cache.get(key);
  if (hit && hit.raw === raw) return hit.value as T;
  let value: T = fallback;
  if (raw) {
    try {
      value = JSON.parse(raw) as T;
    } catch {
      // corrupt entry — fall back to empty
    }
  }
  cache.set(key, { raw, value });
  return value;
}

function writeJson(key: string, value: unknown) {
  try {
    localStorage.setItem(key, JSON.stringify(value));
  } catch {
    // storage full/blocked — the in-memory UI state still updates below
    cache.set(key, { raw: JSON.stringify(value), value });
  }
  listeners.forEach((l) => l());
}

function useLocalJson<T>(key: string | null, fallback: T): [T, (next: T) => void] {
  const value = useSyncExternalStore(
    subscribe,
    () => (key ? readJson(key, fallback) : fallback),
    () => fallback
  );
  const set = useCallback((next: T) => key && writeJson(key, next), [key]);
  return [value, set];
}

// Module-level fallbacks: a fresh [] / {} per render would make the
// snapshot unstable and loop useSyncExternalStore.
const NO_IDS: number[] = [];
const NO_SAVED: Record<string, FeedPost> = {};
const NO_SEEN: Record<string, number> = {};

function useUserKey(name: string) {
  const { session } = useAuth();
  return session ? `feed:${name}:${session.user.id}` : null;
}

export function useLikes() {
  const [ids, setIds] = useLocalJson(useUserKey("liked"), NO_IDS);
  const isLiked = useCallback((id: number) => ids.includes(id), [ids]);
  const setLiked = useCallback(
    (id: number, liked: boolean) => {
      const next = ids.filter((x) => x !== id);
      if (liked) next.push(id);
      setIds(next);
    },
    [ids, setIds]
  );
  return { isLiked, setLiked };
}

/** Saved posts keep a full snapshot so the Saved tab renders without a fetch. */
export function useSaved() {
  const [saved, setSaved] = useLocalJson(useUserKey("saved"), NO_SAVED);
  const isSaved = useCallback((id: number) => String(id) in saved, [saved]);
  const toggleSaved = useCallback(
    (post: FeedPost) => {
      const next = { ...saved };
      if (String(post.id) in next) delete next[post.id];
      else next[post.id] = post;
      setSaved(next);
      return String(post.id) in next;
    },
    [saved, setSaved]
  );
  const savedPosts = Object.values(saved).sort((a, b) => b.id - a.id);
  return { isSaved, toggleSaved, savedPosts };
}

/** authorId -> newest post id the viewer has already watched in a story. */
export function useSeenStories() {
  const [seen, setSeen] = useLocalJson(useUserKey("seen"), NO_SEEN);
  const markSeen = useCallback(
    (authorId: number, postId: number) => {
      if ((seen[authorId] ?? 0) >= postId) return;
      setSeen({ ...seen, [authorId]: postId });
    },
    [seen, setSeen]
  );
  return { seen, markSeen };
}
