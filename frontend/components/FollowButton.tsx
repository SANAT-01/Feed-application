"use client";

import { useState } from "react";
import { useAuth } from "../lib/auth";

export default function FollowButton({
  userId,
  initialFollowed,
  compact = false,
  onChange,
}: {
  userId: number;
  initialFollowed: boolean;
  compact?: boolean;
  onChange?: (followed: boolean) => void;
}) {
  const { authFetch } = useAuth();
  const [followed, setFollowed] = useState(initialFollowed);
  const [busy, setBusy] = useState(false);

  async function toggle() {
    setBusy(true);
    const next = !followed;
    try {
      const res = await authFetch("/api/follow", {
        method: next ? "POST" : "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ followeeId: userId }),
      });
      if (res.ok) {
        setFollowed(next);
        onChange?.(next);
      }
    } finally {
      setBusy(false);
    }
  }

  return (
    <button
      className={`follow-btn ${followed ? "following" : ""} ${compact ? "follow-btn-compact" : ""}`}
      onClick={toggle}
      disabled={busy}
    >
      {followed ? "Following" : "Follow"}
    </button>
  );
}
