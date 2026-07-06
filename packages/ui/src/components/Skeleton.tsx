/** A shimmering placeholder block for loading.tsx skeletons — compose with
 *  width/height/shape via `className`. */
export function Skeleton({ className = "" }: { className?: string }) {
  return <div className={`animate-pulse rounded-md bg-ink/[0.12] ${className}`} />;
}
