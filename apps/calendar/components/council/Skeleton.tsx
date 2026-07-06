/** A pulsing placeholder block for loading.tsx skeletons — compose with
 *  width/height/shape via `className`. Ported locally to match
 *  @vestige/ui's Skeleton (Council of Days can't import that package).
 *  bg-ink/[0.12] is theme-aware (readable on light and dark themes) and has
 *  enough contrast to actually read as content while loading. */
export function Skeleton({ className = "" }: { className?: string }) {
  return <div className={`animate-pulse rounded-md bg-ink/[0.12] ${className}`} />;
}
