"use client";

import Link from "next/link";
import Avatar from "./Avatar";
import FollowButton from "./FollowButton";
import { useAuth } from "../lib/auth";
import type { ProfileListUser } from "../lib/types";

export default function UserListModal({
  title,
  users,
  loading,
  onClose,
}: {
  title: string;
  users: ProfileListUser[];
  loading: boolean;
  onClose: () => void;
}) {
  const { session } = useAuth();

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div className="modal-sheet modal-sheet-list" onClick={(e) => e.stopPropagation()}>
        <div className="modal-sheet-header">
          <span className="modal-sheet-title">{title}</span>
          <button className="icon-btn" onClick={onClose} aria-label="Close">
            ✕
          </button>
        </div>
        <div className="user-list">
          {loading && <p className="empty">Loading…</p>}
          {!loading && users.length === 0 && <p className="empty">Nobody here yet.</p>}
          {!loading &&
            users.map((u) => (
              <div className="user-list-row" key={u.id}>
                <Link href={`/profile/${u.id}`} className="user-list-identity" onClick={onClose}>
                  <Avatar username={u.username} size={40} ring={u.isCelebrity} />
                  <span>
                    {u.username}
                    {u.isCelebrity && <span className="celeb-badge">★</span>}
                  </span>
                </Link>
                {session && u.id !== session.user.id && u.isFollowedByMe !== null && (
                  <FollowButton userId={u.id} initialFollowed={u.isFollowedByMe} compact />
                )}
              </div>
            ))}
        </div>
      </div>
    </div>
  );
}
