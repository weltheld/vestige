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

/** Only characters have a role; a town or a sword doesn't. */
export const ROLE_KINDS = new Set<NpcKindDb>(["person", "creature"]);

export function NpcRoleLabel({ role, kind }: { role: NpcRoleDb; kind: NpcKindDb }) {
  if (!ROLE_KINDS.has(kind)) return null;
  return (
    // --wine, not --muted: "NPC" / "Player character" is the fact worth
    // noticing on a card at a glance (the doc comment above says so), and a
    // neutral grey read as the same weight as any other metadata on the
    // card. --wine is the app's one red across every theme.
    <span className="font-display text-[10px] font-semibold uppercase tracking-[0.1em] text-wine">
      {ROLE_LABEL[role]}
    </span>
  );
}
