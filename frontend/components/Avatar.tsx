const PALETTE = [
  "linear-gradient(135deg, #f58529, #dd2a7b)", // IG-ish gradient
  "linear-gradient(135deg, #3fb8c4, #1f6feb)",
  "linear-gradient(135deg, #a78bfa, #f472b6)",
  "linear-gradient(135deg, #4ade80, #3fb8c4)",
  "linear-gradient(135deg, #f2c14e, #dd2a7b)",
  "linear-gradient(135deg, #60a5fa, #a78bfa)",
];

function colorFor(username: string): string {
  let hash = 0;
  for (let i = 0; i < username.length; i++) hash = (hash * 31 + username.charCodeAt(i)) >>> 0;
  return PALETTE[hash % PALETTE.length];
}

export default function Avatar({
  username,
  size = 40,
  ring = false,
}: {
  username: string;
  size?: number;
  ring?: boolean;
}) {
  const initial = username.slice(0, 1).toUpperCase();
  return (
    <div
      className="avatar"
      style={{
        width: size,
        height: size,
        fontSize: size * 0.42,
        background: colorFor(username),
        boxShadow: ring ? "0 0 0 2px #0b0b0c, 0 0 0 4px #f2c14e" : undefined,
      }}
      aria-hidden
    >
      {initial}
    </div>
  );
}
