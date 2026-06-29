/**
 * The Vestige sigil — a faceted gem/seal mark in the gold + wine palette.
 * Museum-restrained: a single struck emblem, no gloss.
 */
export function Sigil({ size = 28 }: { size?: number }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 32 32"
      fill="none"
      aria-hidden="true"
      role="presentation"
    >
      <circle cx="16" cy="16" r="15" fill="var(--wine)" />
      <circle
        cx="16"
        cy="16"
        r="15"
        fill="none"
        stroke="var(--gold)"
        strokeWidth="1.25"
      />
      <path
        d="M16 6 L24 13 L21 24 H11 L8 13 Z"
        fill="var(--gold-soft)"
        stroke="var(--gold)"
        strokeWidth="0.75"
        strokeLinejoin="round"
      />
      <path
        d="M16 6 L21 24 M16 6 L11 24 M8 13 H24 M11 24 L24 13 M21 24 L8 13"
        stroke="var(--wine)"
        strokeWidth="0.6"
        opacity="0.5"
      />
    </svg>
  );
}
