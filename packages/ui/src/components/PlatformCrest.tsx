/**
 * The Vestige mark — a faceted four-point star (compass rose construction:
 * outer points, inner "waist" points, and the cross + diagonal facet lines
 * between them), rendered as thin gold linework.
 */
export function PlatformCrest({ size = 38, className }: { size?: number; className?: string }) {
  return (
    <svg
      viewBox="0 0 148 148"
      width={size}
      height={size}
      role="img"
      aria-label="Vestige"
      className={className}
    >
      <g fill="none" stroke="var(--gold)" strokeWidth="2.75" strokeLinejoin="round">
        <path d="M74 8 L88 60 L140 74 L88 88 L74 140 L60 88 L8 74 L60 60 Z" />
        <path d="M74 8 L74 140 M8 74 L140 74" />
        <path d="M74 74 L60 60 M74 74 L88 60 M74 74 L88 88 M74 74 L60 88" />
      </g>
    </svg>
  );
}
