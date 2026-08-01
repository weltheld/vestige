import Link from "next/link";
import type { CharacterSummary } from "@/lib/characters/data";
import { characters } from "@/lib/journal/links";

/**
 * Moving between party members.
 *
 * A chip strip rather than a dropdown: a party is three to six people, and at
 * that size a dropdown hides the roster behind a click to save space there's
 * no shortage of. It scrolls horizontally if a table ever gets big enough to
 * need it. With only one character imported there's nothing to switch between,
 * so it renders nothing at all.
 */
export function CharacterSwitcher({
  campaignId,
  roster,
  currentId,
}: {
  campaignId: string;
  roster: CharacterSummary[];
  currentId: string;
}) {
  if (roster.length < 2) return null;

  return (
    <nav aria-label="Characters" className="-mx-1 flex gap-1.5 overflow-x-auto px-1 pb-1">
      {roster.map((c) => {
        const active = c.id === currentId;
        return (
          <Link
            key={c.id}
            href={characters.sheet(campaignId, c.id)}
            aria-current={active ? "page" : undefined}
            className={`shrink-0 rounded-full border px-3.5 py-1.5 font-body text-[13px] transition ${
              active
                ? "border-gold bg-[color-mix(in_srgb,var(--gold)_16%,transparent)] text-ink"
                : "border-hairline bg-surface text-ink-soft hover:border-gold hover:text-ink"
            }`}
          >
            {c.name}
          </Link>
        );
      })}
    </nav>
  );
}
