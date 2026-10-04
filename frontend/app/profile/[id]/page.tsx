"use client";

import { useCallback, useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { useAuth } from "../../../lib/auth";
import Avatar from "../../../components/Avatar";
import FollowButton from "../../../components/FollowButton";
import UserListModal from "../../../components/UserListModal";
import { LogoutIcon } from "../../../components/Icons";
import type { Profile, ProfilePost, ProfileListUser } from "../../../lib/types";

export default function ProfilePage() {
  const params = useParams();
  const userId = Number(params.id);
  const { session, authFetch, logout } = useAuth();

  const [profile, setProfile] = useState<Profile | null>(null);
  const [posts, setPosts] = useState<ProfilePost[]>([]);
  const [loading, setLoading] = useState(true);

  const [listModal, setListModal] = useState<"followers" | "following" | null>(null);
  const [listUsers, setListUsers] = useState<ProfileListUser[]>([]);
  const [listLoading, setListLoading] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [profileRes, postsRes] = await Promise.all([
        authFetch(`/api/users/${userId}`),
        fetch(`/api/users/${userId}/posts`),
      ]);
      if (profileRes.ok) setProfile(await profileRes.json());
      if (postsRes.ok) setPosts((await postsRes.json()).posts);
    } finally {
      setLoading(false);
    }
  }, [authFetch, userId]);

  useEffect(() => {
    load();
  }, [load]);

  async function openList(kind: "followers" | "following") {
    setListModal(kind);
    setListLoading(true);
    try {
      const res = await authFetch(`/api/users/${userId}/${kind}`);
      if (res.ok) setListUsers((await res.json()).users);
    } finally {
      setListLoading(false);
    }
  }

  if (loading && !profile) return <p className="empty">Loading profile…</p>;
  if (!profile) return <p className="empty">User not found.</p>;

  const isMe = session?.user.id === profile.id;

  return (
    <div className="profile-page">
      <div className="profile-header">
        <Avatar username={profile.username} size={88} ring={profile.isCelebrity} />
        <div className="profile-header-info">
          <h1>
            {profile.username}
            {profile.isCelebrity && <span className="celeb-badge">★ CELEBRITY</span>}
          </h1>
          <div className="profile-stats">
            <span>
              <strong>{profile.postCount}</strong> posts
            </span>
            <button className="profile-stat-btn" onClick={() => openList("followers")}>
              <strong>{profile.followerCount}</strong> followers
            </button>
            <button className="profile-stat-btn" onClick={() => openList("following")}>
              <strong>{profile.followingCount}</strong> following
            </button>
          </div>
          {isMe ? (
            <button className="secondary logout-btn" onClick={logout}>
              <LogoutIcon size={15} /> Log out
            </button>
          ) : (
            profile.isFollowedByMe !== null && (
              <FollowButton userId={profile.id} initialFollowed={profile.isFollowedByMe} onChange={load} />
            )
          )}
        </div>
      </div>

      <div className="profile-grid">
        {posts.length === 0 && <p className="empty">No posts yet.</p>}
        {posts.map((post) =>
          post.mediaUrl ? (
            <img key={post.id} className="profile-grid-media" src={post.mediaUrl} alt="" />
          ) : (
            <div key={post.id} className="profile-grid-text">
              {post.body}
            </div>
          )
        )}
      </div>

      {listModal && (
        <UserListModal
          title={listModal === "followers" ? "Followers" : "Following"}
          users={listUsers}
          loading={listLoading}
          onClose={() => setListModal(null)}
        />
      )}
    </div>
  );
}
