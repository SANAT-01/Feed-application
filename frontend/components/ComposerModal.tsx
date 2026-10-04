"use client";

import { useState } from "react";
import { useAuth } from "../lib/auth";
import Avatar from "./Avatar";

export default function ComposerModal({ onClose }: { onClose: () => void }) {
  const { session, authFetch } = useAuth();
  const [body, setBody] = useState("");
  const [file, setFile] = useState<File | null>(null);
  const [posting, setPosting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!body.trim()) return;
    setPosting(true);
    setError(null);
    try {
      const form = new FormData();
      form.set("body", body.trim());
      if (file) form.set("media", file);
      const res = await authFetch("/api/posts", { method: "POST", body: form });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        setError(data.error || "couldn't post — try again");
        return;
      }
      window.dispatchEvent(new Event("feed:posted"));
      onClose();
    } finally {
      setPosting(false);
    }
  }

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div className="modal-sheet" onClick={(e) => e.stopPropagation()}>
        <div className="modal-sheet-header">
          <button className="icon-btn" onClick={onClose} aria-label="Cancel">
            ✕
          </button>
          <span className="modal-sheet-title">New post</span>
          <button className="text-btn" onClick={submit} disabled={posting || !body.trim()}>
            {posting ? "…" : "Share"}
          </button>
        </div>
        <form onSubmit={submit}>
          <div className="composer-body">
            {session?.user && <Avatar username={session.user.username} size={36} />}
            <textarea
              placeholder="What's happening?"
              value={body}
              onChange={(e) => setBody(e.target.value)}
              autoFocus
              rows={4}
            />
          </div>
          {error && <div className="form-error">{error}</div>}
          <div className="composer-footer">
            <label className="media-picker">
              🖼️ <span>Add photo/video</span>
              <input
                type="file"
                accept="image/*,video/*"
                onChange={(e) => setFile(e.target.files?.[0] ?? null)}
                hidden
              />
            </label>
            {file && <span className="media-picked">{file.name}</span>}
          </div>
        </form>
      </div>
    </div>
  );
}
