/** A pulsing placeholder block for loading.tsx skeletons — compose with
 *  width/height/shape via `className`.
 *  Uses color-mix as an arbitrary VALUE (not Tailwind's bg-x/opacity
 *  MODIFIER syntax) — Tailwind can't apply an opacity modifier to colors
 *  defined as plain var(--x) strings (as ours are), so bg-ink/50-style
 *  classes silently compile to no CSS at all. This form is mixed directly
 *  and is theme-aware (works on light and dark themes) with real contrast. */
export function Skeleton({ className = "" }: { className?: string }) {
  return (
    <div
      className={`animate-pulse rounded-md bg-[color-mix(in_srgb,var(--ink)_12%,var(--surface))] ${className}`}
    />
  );
}
