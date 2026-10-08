export function Skeleton({ className = "" }: { className?: string }) {
  return <div aria-hidden className={`os-skeleton ${className}`} />;
}

export function CardSkeleton({ rows = 4, className = "" }: { rows?: number; className?: string }) {
  return (
    <div className={`os-card p-6 ${className}`} role="status" aria-label="Loading">
      <Skeleton className="mb-5 h-5 w-40" />
      <div className="space-y-3">{Array.from({ length: rows }, (_, i) => <Skeleton key={i} className="h-10 w-full" />)}</div>
    </div>
  );
}
