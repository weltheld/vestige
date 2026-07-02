/** A shimmering placeholder block for loading.tsx skeletons — compose with
 *  width/height/shape via `className`. Ported locally to match
 *  @vestige/ui's Skeleton (Council of Days can't import that package). */
export function Skeleton({ className = "" }: { className?: string }) {
  return <div className={`animate-pulse rounded-md bg-hairline/60 ${className}`} />;
}
