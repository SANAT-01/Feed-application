const PALETTE = [
  ["#f58529", "#dd2a7b"],
  ["#3fb8c4", "#1f6feb"],
  ["#a78bfa", "#f472b6"],
  ["#4ade80", "#0ea5e9"],
  ["#fbbf24", "#ef4444"],
  ["#60a5fa", "#8b5cf6"],
  ["#fb7185", "#f59e0b"],
  ["#2dd4bf", "#6366f1"],
];

function hash(s: string): number {
  let h = 0;
  for (let i = 0; i < s.length; i++) h = (h * 31 + s.charCodeAt(i)) >>> 0;
  return h;
}

/** Stable per-username gradient — also reused for profile banners. */
export function gradientFor(username: string, angle = 135): string {
  const [a, b] = PALETTE[hash(username) % PALETTE.length];
  return `linear-gradient(${angle}deg, ${a}, ${b})`;
}

export type AvatarRing = "story" | "seen" | "creator" | "none";

export default function Avatar({
  username,
  size = 40,
  ring = "none",
}: {
  username: string;
  size?: number;
  ring?: AvatarRing;
}) {
  const inner = (
    <span
      className="avatar"
      style={{ width: size, height: size, fontSize: size * 0.42, background: gradientFor(username) }}
      aria-hidden
    >
      {username.slice(0, 1).toUpperCase()}
    </span>
  );
  if (ring === "none") return inner;
  return <span className={`avatar-ring avatar-ring-${ring}`}>{inner}</span>;
}
