type IconProps = { size?: number; filled?: boolean };

const stroke = { fill: "none", stroke: "currentColor", strokeWidth: 1.9, strokeLinecap: "round", strokeLinejoin: "round" } as const;

export function HomeIcon({ size = 24, filled = false }: IconProps) {
  return filled ? (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="currentColor">
      <path d="M12 2.4 2.6 10.2c-.4.3-.6.8-.6 1.3V20a2 2 0 0 0 2 2h4.5v-6.5h7V22H20a2 2 0 0 0 2-2v-8.5c0-.5-.2-1-.6-1.3L12 2.4Z" />
    </svg>
  ) : (
    <svg width={size} height={size} viewBox="0 0 24 24" {...stroke}>
      <path d="M3 10.8 12 3.3l9 7.5V20a1.5 1.5 0 0 1-1.5 1.5H15V15H9v6.5H4.5A1.5 1.5 0 0 1 3 20v-9.2Z" />
    </svg>
  );
}

export function CompassIcon({ size = 24, filled = false }: IconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" {...stroke}>
      <circle cx="12" cy="12" r="9.5" fill={filled ? "currentColor" : "none"} />
      <path
        d="m15.6 8.4-2 5.2-5.2 2 2-5.2 5.2-2Z"
        fill={filled ? "var(--bg)" : "none"}
        stroke={filled ? "var(--bg)" : "currentColor"}
      />
    </svg>
  );
}

export function SearchIcon({ size = 24 }: IconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" {...stroke}>
      <circle cx="11" cy="11" r="7.5" />
      <path d="m21 21-4.3-4.3" />
    </svg>
  );
}

export function PlusSquareIcon({ size = 24 }: IconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" {...stroke}>
      <rect x="3" y="3" width="18" height="18" rx="5.5" />
      <path d="M12 8v8M8 12h8" />
    </svg>
  );
}

export function HeartIcon({ size = 24, filled = false }: IconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" {...stroke} fill={filled ? "currentColor" : "none"}>
      <path d="M12 20.7s-8.5-5-8.5-11.1A4.7 4.7 0 0 1 12 6.8a4.7 4.7 0 0 1 8.5 2.8c0 6.1-8.5 11.1-8.5 11.1Z" />
    </svg>
  );
}

export function BookmarkIcon({ size = 24, filled = false }: IconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" {...stroke} fill={filled ? "currentColor" : "none"}>
      <path d="M18.5 21 12 15.8 5.5 21V4.5A1.5 1.5 0 0 1 7 3h10a1.5 1.5 0 0 1 1.5 1.5V21Z" />
    </svg>
  );
}

export function SendIcon({ size = 24 }: IconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" {...stroke}>
      <path d="M21.5 3 10 14.5M21.5 3l-7 18-4.5-6.5L3.5 10l18-7Z" />
    </svg>
  );
}

export function GridIcon({ size = 20 }: IconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" {...stroke}>
      <rect x="3" y="3" width="18" height="18" rx="2" />
      <path d="M9 3v18M15 3v18M3 9h18M3 15h18" />
    </svg>
  );
}

export function LogoutIcon({ size = 20 }: IconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" {...stroke}>
      <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4M16 17l5-5-5-5M21 12H9" />
    </svg>
  );
}

export function CloseIcon({ size = 20 }: IconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" {...stroke} strokeWidth={2.2}>
      <path d="M6 6l12 12M18 6 6 18" />
    </svg>
  );
}

export function ImageIcon({ size = 22 }: IconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" {...stroke}>
      <rect x="3" y="4" width="18" height="16" rx="3" />
      <circle cx="9" cy="10" r="1.8" fill="currentColor" stroke="none" />
      <path d="m4 17 5-5 4 4 3-3 4 4" />
    </svg>
  );
}

export function ArrowUpIcon({ size = 16 }: IconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" {...stroke} strokeWidth={2.4}>
      <path d="M12 19V5M5 12l7-7 7 7" />
    </svg>
  );
}

export function CheckIcon({ size = 20 }: IconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" {...stroke} strokeWidth={2.4}>
      <path d="m5 12.5 4.5 4.5L19 7.5" />
    </svg>
  );
}

export function VerifiedBadge({ size = 14 }: IconProps) {
  return (
    <svg className="verified" width={size} height={size} viewBox="0 0 24 24" aria-label="Verified creator">
      <path
        fill="#3897f0"
        d="M12 1.5 14.6 3.6l3.3-.3 1 3.2 2.9 1.6-.8 3.2 1.5 3-2.6 2.1-.4 3.3-3.3.4-2.1 2.6-3-1.5-3.2.8-1.6-2.9-3.2-1-.3-3.3L1.5 12l1.6-2.9-.4-3.3 3.2-1 1.6-2.9 3.2.8L12 1.5Z"
      />
      <path d="m7.8 12.2 2.8 2.8 5.6-5.6" fill="none" stroke="#fff" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}
