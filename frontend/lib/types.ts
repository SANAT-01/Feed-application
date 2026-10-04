export interface SessionUser {
  id: number;
  username: string;
  isCelebrity: boolean;
}

export interface Session {
  token: string;
  user: SessionUser;
}

export interface FeedPost {
  id: number;
  authorId: number;
  author: string;
  body: string;
  mediaUrl: string | null;
  createdAt: string;
}

export interface ProfilePost {
  id: number;
  authorId: number;
  body: string;
  mediaUrl: string | null;
  createdAt: string;
}

export interface Profile {
  id: number;
  username: string;
  isCelebrity: boolean;
  postCount: number;
  followerCount: number;
  followingCount: number;
  isFollowedByMe: boolean | null;
  isMe: boolean;
}

export interface ProfileListUser {
  id: number;
  username: string;
  isCelebrity: boolean;
  isFollowedByMe: boolean | null;
}

/** Shape returned by GET /users — note the snake_case is_celebrity, kept
 * as-is rather than normalized, since it's the one place in the API that
 * still returns it that way. */
export interface DirectoryUser {
  id: number;
  username: string;
  is_celebrity: boolean;
  isFollowedByMe: boolean | null;
}
