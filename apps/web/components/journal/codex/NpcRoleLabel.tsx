import type { NpcKindDb, NpcRoleDb } from "@vestige/db";

/**
 * What kind of character an entry is — the thing worth knowing at a glance.
 *
 * This replaces the old alive/dead/unknown status, which every auto-created
 * entry carried as "unknown" forever because nothing ever set it: it read as
 * a claim about a character's fate when it only meant "unfilled".
 */
export const ROLE_LABEL: Record<NpcRoleDb, string> = {
  pc: "Player character",
  npc: "NPC",
  companion: "Companion",
};

/** The card grid's version: short enough to never fight the entry's own name
 *  for room. "NPC" and "Companion" are already this short — only "Player
 *  character" needed shortening, in the app's wide display face it was
 *  wrapping to two lines at typical card widths and crowding out the name
 *  beside it. */
const ROLE_LABEL_COMPACT: Record<NpcRoleDb, string> = {
  pc: "PC",
  npc: "NPC",
  companion: "Companion",
};

/** Only characters have a role; a town or a sword doesn't. */
export const ROLE_KINDS = new Set<NpcKindDb>(["person", "creature"]);

export function NpcRoleLabel({
  role,
  kind,
  compact = false,
}: {
  role: NpcRoleDb;
  kind: NpcKindDb;
  /** Card-grid contexts: shortens "Player character" to "PC". The entry's
   *  own detail page has room for the full word and doesn't need this. */
  compact?: boolean;
}) {
  if (!ROLE_KINDS.has(kind)) return null;
  return (
    // --wine, not --muted: "NPC" / "Player character" is the fact worth
    // noticing on a card at a glance (the doc comment above says so), and a
    // neutral grey read as the same weight as any other metadata on the
    // card. --wine is the app's one red across every theme.
    <span className="shrink-0 whitespace-nowrap font-display text-[10px] font-semibold uppercase tracking-[0.1em] text-wine">
      {(compact ? ROLE_LABEL_COMPACT : ROLE_LABEL)[role]}
    </span>
  );
}
