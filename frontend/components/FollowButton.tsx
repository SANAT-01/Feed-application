"use client";

import { useEffect, useState } from "react";
import { useAuth } from "../lib/auth";
import { useToast } from "./Toast";

export default function FollowButton({
  userId,
  username,
  initialFollowed,
  compact = false,
  block = false,
  onChange,
}: {
  userId: number;
  username?: string;
  initialFollowed: boolean;
  compact?: boolean;
  block?: boolean;
  onChange?: (followed: boolean) => void;
}) {
  const { authFetch } = useAuth();
  const toast = useToast();
  const [followed, setFollowed] = useState(initialFollowed);
  const [busy, setBusy] = useState(false);

  useEffect(() => setFollowed(initialFollowed), [initialFollowed]);

  // Optimistic: flip immediately, roll back if the request fails. Buttons
  // often sit inside a <Link> card, so the click must not navigate.
  async function toggle(e: React.MouseEvent) {
    e.preventDefault();
    e.stopPropagation();
    if (busy) return;
    const next = !followed;
    setFollowed(next);
    setBusy(true);
    try {
      const res = await authFetch("/api/follow", {
        method: next ? "POST" : "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ followeeId: userId }),
      });
      if (!res.ok) throw new Error(`follow failed: ${res.status}`);
      onChange?.(next);
      window.dispatchEvent(new Event("feed:refresh"));
      if (next && username) toast(`You're now following ${username}`);
    } catch {
      setFollowed(!next);
      toast("Couldn't update follow — try again");
    } finally {
      setBusy(false);
    }
  }

  const classes = ["follow-btn", followed && "following", compact && "follow-btn-compact", block && "follow-btn-block"]
    .filter(Boolean)
    .join(" ");

  return (
    <button className={classes} onClick={toggle} aria-pressed={followed}>
      {followed ? "Following" : "Follow"}
    </button>
  );
}
