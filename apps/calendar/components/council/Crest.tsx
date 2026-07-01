import { cn } from "@/lib/utils";

type CrestProps = {
  size?: number;
  className?: string;
};

// "Gold Table Mark" from the Pencil design: a gold table ring, a faint inner
// echo, and eight wine seats spaced evenly around it.
const SEATS = Array.from({ length: 8 }, (_, i) => {
  const angle = (-90 + i * 45) * (Math.PI / 180);
  return {
    cx: 74 + 50 * Math.cos(angle),
    cy: 74 + 50 * Math.sin(angle),
  };
});

export function Crest({ size = 48, className }: CrestProps) {
  return (
    <svg
      viewBox="0 0 148 148"
      width={size}
      height={size}
      role="img"
      aria-label="Calendar"
      className={cn(
        "drop-shadow-[0_2px_4px_rgba(43,33,24,0.25)]",
        className,
      )}
    >
      <circle cx="74" cy="74" r="48" fill="none" stroke="#B68A2E" strokeWidth="4" />
      <circle cx="74" cy="74" r="37.5" fill="none" stroke="#D8C8AC" strokeWidth="1" />
      {SEATS.map((s, i) => (
        <circle key={i} cx={s.cx} cy={s.cy} r="5" fill="#6B2230" />
      ))}
    </svg>
  );
}
