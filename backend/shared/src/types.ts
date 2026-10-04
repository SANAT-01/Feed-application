export interface User {
  id: number;
  username: string;
  is_celebrity: boolean;
}

export interface Post {
  id: number;
  author_id: number;
  body: string;
  media_url: string | null;
  created_at: string;
}

/** What actually sits in the post-content cache (post:<id>) — the author's
 * name is denormalized in so the feed response never needs a users join. */
export interface CachedPost {
  id: number;
  authorId: number;
  author: string;
  body: string;
  mediaUrl: string | null;
  createdAt: string;
}

export interface OutboxRow {
  id: number;
  post_id: number;
  status: "pending" | "done";
  created_at: string;
}

export interface PostCreatedEvent {
  postId: number;
  outboxId: number;
}
