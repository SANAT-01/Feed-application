"use client";

import { useEffect, useRef, useState } from "react";
import { useAuth } from "../lib/auth";
import Avatar from "./Avatar";
import { CloseIcon, ImageIcon } from "./Icons";
import { useToast } from "./Toast";

const MAX_CHARS = 2000; // matches the API's zod limit on posts.body

export default function ComposerModal({ onClose }: { onClose: () => void }) {
  const { session, authFetch } = useAuth();
  const toast = useToast();
  const [body, setBody] = useState("");
  const [file, setFile] = useState<File | null>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const [dragging, setDragging] = useState(false);
  const [posting, setPosting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const textRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    if (!file) {
      setPreview(null);
      return;
    }
    const url = URL.createObjectURL(file);
    setPreview(url);
    return () => URL.revokeObjectURL(url);
  }, [file]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    window.addEventListener("keydown", onKey);
    document.body.classList.add("no-scroll");
    return () => {
      window.removeEventListener("keydown", onKey);
      document.body.classList.remove("no-scroll");
    };
  }, [onClose]);

  // Grow the textarea with its content instead of scrolling inside it.
  useEffect(() => {
    const el = textRef.current;
    if (!el) return;
    el.style.height = "auto";
    el.style.height = `${el.scrollHeight}px`;
  }, [body]);

  function pickImage(f: File | undefined | null) {
    if (f && f.type.startsWith("image/")) setFile(f);
  }

  const remaining = MAX_CHARS - body.length;
  const canPost = body.trim().length > 0 && remaining >= 0 && !posting;

  async function submit() {
    if (!canPost) return;
    setPosting(true);
    setError(null);
    try {
      const form = new FormData();
      form.set("body", body.trim());
      if (file) form.set("media", file);
      const res = await authFetch("/api/posts", { method: "POST", body: form });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        setError(data.error || "Couldn't post — try again");
        return;
      }
      window.dispatchEvent(new Event("feed:posted"));
      toast("Posted! Delivering to your followers…");
      onClose();
    } catch {
      setError("Network error — try again");
    } finally {
      setPosting(false);
    }
  }

  const ringPct = Math.min(1, body.length / MAX_CHARS);

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div
        className={`modal-sheet composer ${dragging ? "is-dragging" : ""}`}
        onClick={(e) => e.stopPropagation()}
        onDragOver={(e) => {
          e.preventDefault();
          setDragging(true);
        }}
        onDragLeave={() => setDragging(false)}
        onDrop={(e) => {
          e.preventDefault();
          setDragging(false);
          pickImage(e.dataTransfer.files?.[0]);
        }}
      >
        <div className="sheet-header">
          <button className="icon-btn" onClick={onClose} aria-label="Cancel">
            <CloseIcon />
          </button>
          <span className="sheet-title">New post</span>
          <button className="share-btn" onClick={submit} disabled={!canPost}>
            {posting ? <span className="spinner" /> : "Share"}
          </button>
        </div>

        <div className="composer-body">
          {session && <Avatar username={session.user.username} size={40} />}
          <div className="composer-main">
            {session && <strong className="composer-name">{session.user.username}</strong>}
            <textarea
              ref={textRef}
              placeholder="What's on your mind?"
              value={body}
              onChange={(e) => setBody(e.target.value)}
              onPaste={(e) => pickImage(e.clipboardData.files?.[0])}
              onKeyDown={(e) => {
                if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) submit();
              }}
              autoFocus
              rows={3}
            />
            {preview && (
              <div className="composer-preview">
                <img src={preview} alt="Selected" />
                <button className="composer-preview-remove" onClick={() => setFile(null)} aria-label="Remove image">
                  <CloseIcon size={16} />
                </button>
              </div>
            )}
          </div>
        </div>

        {error && <div className="form-error">{error}</div>}

        <div className="composer-footer">
          <label className="media-picker">
            <ImageIcon />
            <span>{file ? "Change photo" : "Add photo"}</span>
            <input type="file" accept="image/*" onChange={(e) => pickImage(e.target.files?.[0])} hidden />
          </label>
          <span className="composer-hint">or drop / paste an image</span>
          <span
            className={`char-ring ${remaining < 100 ? "warn" : ""} ${remaining < 0 ? "over" : ""}`}
            style={{ "--pct": ringPct } as React.CSSProperties}
            title={`${remaining} characters left`}
          >
            {remaining < 100 && <span>{remaining}</span>}
          </span>
        </div>
      </div>
    </div>
  );
}
