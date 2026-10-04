import Link from "next/link";
import Avatar from "./Avatar";
import { formatRelativeTime } from "../lib/time";
import type { FeedPost } from "../lib/types";

export default function PostCard({ post, isCelebrity }: { post: FeedPost; isCelebrity: boolean }) {
  return (
    <article className="post-card">
      <div className="post-card-header">
        <Link href={`/profile/${post.authorId}`} className="post-card-author-link">
          <Avatar username={post.author} size={36} ring={isCelebrity} />
          <span className="post-card-author">
            {post.author}
            {isCelebrity && <span className="celeb-badge">★</span>}
          </span>
        </Link>
        <span className="post-card-time">{formatRelativeTime(post.createdAt)}</span>
      </div>
      {post.body && <p className="post-card-body">{post.body}</p>}
      {post.mediaUrl && <img className="post-card-media" src={post.mediaUrl} alt="" />}
    </article>
  );
}
