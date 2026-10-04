"use client";

import { useCallback, useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { useAuth } from "../../../lib/auth";
import { useLikes, useSaved } from "../../../lib/local";
import Avatar, { gradientFor } from "../../../components/Avatar";
import FollowButton from "../../../components/FollowButton";
import UserListModal from "../../../components/UserListModal";
import PostViewer from "../../../components/PostViewer";
import { textCardBackground } from "../../../components/PostCard";
import { GridSkeleton } from "../../../components/Skeleton";
import { useToast } from "../../../components/Toast";
import { BookmarkIcon, GridIcon, HeartIcon, LogoutIcon, SendIcon, VerifiedBadge } from "../../../components/Icons";
import type { FeedPost, Profile, ProfileListUser, ProfilePost } from "../../../lib/types";

type Tab = "posts" | "saved";

function compact(n: number): string {
  return n >= 10_000 ? `${(n / 1000).toFixed(n >= 100_000 ? 0 : 1)}k` : n.toLocaleString();
}

export default function ProfilePage() {
  const params = useParams();
  const userId = Number(params.id);
  const { session, authFetch, logout } = useAuth();
  const { savedPosts } = useSaved();
  const { isLiked } = useLikes();
  const toast = useToast();

  const [profile, setProfile] = useState<Profile | null>(null);
  const [posts, setPosts] = useState<ProfilePost[] | null>(null);
  const [notFound, setNotFound] = useState(false);
  const [tab, setTab] = useState<Tab>("posts");
  const [open, setOpen] = useState<FeedPost | null>(null);

  const [listModal, setListModal] = useState<"followers" | "following" | null>(null);
  const [listUsers, setListUsers] = useState<ProfileListUser[]>([]);
  const [listLoading, setListLoading] = useState(false);

  const load = useCallback(async () => {
    const [profileRes, postsRes] = await Promise.all([
      authFetch(`/api/users/${userId}`),
      fetch(`/api/users/${userId}/posts`),
    ]);
    if (profileRes.ok) setProfile(await profileRes.json());
    else if (profileRes.status === 404) setNotFound(true);
    if (postsRes.ok) setPosts((await postsRes.json()).posts);
  }, [authFetch, userId]);

  useEffect(() => {
    setProfile(null);
    setPosts(null);
    setTab("posts");
    load();
  }, [load]);

  async function openList(kind: "followers" | "following") {
    setListModal(kind);
    setListUsers([]);
    setListLoading(true);
    try {
      const res = await authFetch(`/api/users/${userId}/${kind}`);
      if (res.ok) setListUsers((await res.json()).users);
    } finally {
      setListLoading(false);
    }
  }

  async function shareProfile() {
    const url = window.location.href;
    try {
      if (navigator.share) return void (await navigator.share({ title: `${profile?.username} on Feed`, url }));
      await navigator.clipboard.writeText(url);
      toast("Profile link copied");
    } catch {
      // share sheet dismissed
    }
  }

  if (notFound) return <p className="empty">This account doesn&apos;t exist.</p>;

  const isMe = session?.user.id === userId;
  const ownPosts: FeedPost[] = (posts ?? []).map((p) => ({ ...p, author: profile?.username ?? "" }));
  const shown = tab === "saved" ? savedPosts : ownPosts;

  return (
    <div className="profile">
      <div className="profile-banner" style={{ background: profile ? gradientFor(profile.username, 120) : undefined }} />

      <div className="profile-head">
        {profile ? (
          <Avatar username={profile.username} size={96} ring={profile.isCelebrity ? "creator" : "none"} />
        ) : (
          <span className="skel skel-circle" style={{ width: 96, height: 96 }} />
        )}

        <div className="profile-id">
          <h1>
            {profile?.username ?? <span className="skel skel-line" style={{ width: 140, height: 22 }} />}
            {profile?.isCelebrity && <VerifiedBadge size={20} />}
          </h1>
          {profile && <span className="profile-handle">@{profile.username}{profile.isCelebrity && " · Creator"}</span>}
        </div>

        {profile && (
          <div className="profile-stats">
            <div>
              <strong>{compact(profile.postCount)}</strong>
              <span>posts</span>
            </div>
            <button onClick={() => openList("followers")}>
              <strong>{compact(profile.followerCount)}</strong>
              <span>followers</span>
            </button>
            <button onClick={() => openList("following")}>
              <strong>{compact(profile.followingCount)}</strong>
              <span>following</span>
            </button>
          </div>
        )}

        {profile && (
          <div className="profile-actions">
            {isMe ? (
              <button className="secondary-btn" onClick={logout}>
                <LogoutIcon size={16} /> Log out
              </button>
            ) : (
              profile.isFollowedByMe !== null && (
                <FollowButton
                  userId={profile.id}
                  username={profile.username}
                  initialFollowed={profile.isFollowedByMe}
                  block
                  onChange={load}
                />
              )
            )}
            <button className="secondary-btn" onClick={shareProfile}>
              <SendIcon size={16} /> Share
            </button>
          </div>
        )}
      </div>

      <div className="profile-tabs" role="tablist">
        <button role="tab" aria-selected={tab === "posts"} className={tab === "posts" ? "active" : ""} onClick={() => setTab("posts")}>
          <GridIcon size={14} /> Posts
        </button>
        {isMe && (
          <button role="tab" aria-selected={tab === "saved"} className={tab === "saved" ? "active" : ""} onClick={() => setTab("saved")}>
            <BookmarkIcon size={14} /> Saved
          </button>
        )}
      </div>

      {posts === null ? (
        <GridSkeleton />
      ) : shown.length === 0 ? (
        <div className="empty-hero empty-hero-compact">
          <div className="empty-hero-art" aria-hidden>
            {tab === "saved" ? "🔖" : "📷"}
          </div>
          <h2>{tab === "saved" ? "Nothing saved yet" : isMe ? "Share your first post" : "No posts yet"}</h2>
          <p>
            {tab === "saved"
              ? "Tap the bookmark on any post to keep it here."
              : isMe
                ? "When you share photos and thoughts, they'll appear on your profile."
                : "When they post, you'll see it here."}
          </p>
          {isMe && tab === "posts" && (
            <button className="primary-btn primary-btn-inline" onClick={() => window.dispatchEvent(new Event("composer:open"))}>
              Create a post
            </button>
          )}
        </div>
      ) : (
        <div className="post-grid">
          {shown.map((p) => (
            <button key={p.id} className="grid-tile" onClick={() => setOpen(p)} aria-label="Open post">
              {p.mediaUrl ? (
                <img src={p.mediaUrl} alt="" loading="lazy" />
              ) : (
                <span className="grid-text" style={{ background: textCardBackground(p.id) }}>
                  {p.body}
                </span>
              )}
              {isLiked(p.id) && (
                <span className="grid-tile-liked" aria-label="Liked">
                  <HeartIcon size={16} filled />
                </span>
              )}
            </button>
          ))}
        </div>
      )}

      {open && (
        <PostViewer
          post={open}
          isCelebrity={tab === "posts" ? Boolean(profile?.isCelebrity) : false}
          onClose={() => setOpen(null)}
        />
      )}

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
