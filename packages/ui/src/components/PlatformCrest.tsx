/**
 * The Vestige platform crest — same construction as Council of Days' Crest
 * (a gold table ring, a faint inner echo, eight wine seats spaced evenly
 * around it), reused as the base for the unified platform header.
 */
const SEATS = Array.from({ length: 8 }, (_, i) => {
  const angle = (-90 + i * 45) * (Math.PI / 180);
  return {
    cx: 74 + 50 * Math.cos(angle),
    cy: 74 + 50 * Math.sin(angle),
  };
});

export function PlatformCrest({ size = 38 }: { size?: number }) {
  return (
    <svg
      viewBox="0 0 148 148"
      width={size}
      height={size}
      role="img"
      aria-label="Vestige"
      className="drop-shadow-[0_2px_4px_rgba(43,33,24,0.25)]"
    >
      <circle cx="74" cy="74" r="48" fill="none" stroke="var(--gold)" strokeWidth="4" />
      <circle cx="74" cy="74" r="37.5" fill="none" stroke="var(--hairline)" strokeWidth="1" />
      {SEATS.map((s, i) => (
        <circle key={i} cx={s.cx} cy={s.cy} r="5" fill="var(--wine)" />
      ))}
    </svg>
  );
}
