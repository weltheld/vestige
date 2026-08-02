/**
 * One visual language for "this is notable", reused across the whole sheet:
 * skill and saving-throw proficiency, expertise, and prepared spells.
 *
 * A filled box rather than a dot, because a printed character sheet has
 * always used a box and everyone reading this has ticked one. Expertise is a
 * stronger version of the same mark rather than a different shape — the
 * reader learns one thing, not three. Empty renders an unticked box rather
 * than nothing, so the column stays aligned and a proficient row is legible
 * at a glance instead of by comparison.
 *
 * Still called a Dot: it is imported in four places, and the shape is the
 * detail while the meaning is the name.
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
      ? "border-wine bg-wine ring-1 ring-offset-1 ring-wine ring-offset-[var(--surface)]"
      : level === "proficient"
        ? "border-wine bg-wine"
        : "border-hairline bg-transparent";

  return (
    <span
      aria-hidden="true"
      title={title}
      className={`inline-block h-[9px] w-[9px] shrink-0 border-[1.5px] ${className}`}
    />
  );
}

/** The same mark, described for screen readers where the box alone carries
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
