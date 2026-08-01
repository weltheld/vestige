/**
 * One visual language for "this is notable", reused across the whole sheet:
 * skill and saving-throw proficiency, expertise, and prepared spells.
 *
 * Expertise is a stronger version of the same mark rather than a different
 * shape — the reader learns one thing, not three. Empty renders a hollow ring
 * at low opacity rather than nothing, so the column of dots stays aligned and
 * a proficient row is legible at a glance instead of by comparison.
 */
export function ProficiencyDot({
  level,
  title,
}: {
  level: "none" | "proficient" | "expertise";
  title?: string;
}) {
  const className =
    level === "expertise"
      ? "bg-gold ring-2 ring-[color-mix(in_srgb,var(--gold)_35%,transparent)]"
      : level === "proficient"
        ? "bg-gold"
        : "border border-hairline";

  return (
    <span
      aria-hidden="true"
      title={title}
      className={`inline-block h-[7px] w-[7px] shrink-0 rounded-full ${className}`}
    />
  );
}

/** The same mark, described for screen readers where the dot alone carries
 *  meaning that isn't in the surrounding text. */
export function proficiencyLabel(level: "none" | "proficient" | "expertise") {
  return level === "expertise"
    ? "Expertise"
    : level === "proficient"
      ? "Proficient"
      : "Not proficient";
}

/** Signed modifiers read as modifiers: "+3", "-1", "+0". */
export function signed(n: number): string {
  return n >= 0 ? `+${n}` : `${n}`;
}
