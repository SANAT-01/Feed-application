"use client";

import { useEffect } from "react";
import PostCard from "./PostCard";
import { CloseIcon } from "./Icons";
import type { FeedPost } from "../lib/types";

/** A single post opened from a grid (profile, explore, saved). */
export default function PostViewer({
  post,
  isCelebrity,
  onClose,
}: {
  post: FeedPost;
  isCelebrity: boolean;
  onClose: () => void;
}) {
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    window.addEventListener("keydown", onKey);
    document.body.classList.add("no-scroll");
    return () => {
      window.removeEventListener("keydown", onKey);
      document.body.classList.remove("no-scroll");
    };
  }, [onClose]);

  return (
    <div className="modal-backdrop modal-center" onClick={onClose}>
      <button className="viewer-close" onClick={onClose} aria-label="Close">
        <CloseIcon size={24} />
      </button>
      <div className="viewer" onClick={(e) => e.stopPropagation()}>
        <PostCard post={post} isCelebrity={isCelebrity} />
      </div>
    </div>
  );
}
