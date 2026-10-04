export function PostSkeleton() {
  return (
    <div className="post post-skeleton" aria-hidden>
      <div className="post-header">
        <span className="skel skel-circle" style={{ width: 34, height: 34 }} />
        <span className="skel skel-line" style={{ width: 120 }} />
      </div>
      <div className="skel skel-media" />
      <div className="skel-lines">
        <span className="skel skel-line" style={{ width: "70%" }} />
        <span className="skel skel-line" style={{ width: "45%" }} />
      </div>
    </div>
  );
}

export function StoriesSkeleton() {
  return (
    <div className="stories" aria-hidden>
      {Array.from({ length: 7 }, (_, i) => (
        <div className="story-item" key={i}>
          <span className="skel skel-circle" style={{ width: 66, height: 66 }} />
          <span className="skel skel-line" style={{ width: 48 }} />
        </div>
      ))}
    </div>
  );
}

export function GridSkeleton({ count = 9 }: { count?: number }) {
  return (
    <div className="post-grid" aria-hidden>
      {Array.from({ length: count }, (_, i) => (
        <span className="skel grid-tile" key={i} />
      ))}
    </div>
  );
}
