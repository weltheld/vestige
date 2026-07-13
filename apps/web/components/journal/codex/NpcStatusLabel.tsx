import type { NpcKindDb, NpcStatusDb } from "@vestige/db";

const LABELS: Record<NpcStatusDb, string> = {
  alive: "Alive",
  dead: "Dead",
  unknown: "Unknown",
};

/** Quiet, text-only status label — a library catalogue note, deliberately
 *  not a traffic-light badge. Alive/dead only means something for people and
 *  creatures; places, events and items show nothing (their kind is the
 *  section heading). */
export function NpcStatusLabel({
  status,
  kind = "person",
}: {
  status: NpcStatusDb;
  kind?: NpcKindDb;
}) {
  if (kind !== "person" && kind !== "creature") return null;
  return (
    <span className="shrink-0 font-display text-[10px] font-semibold uppercase tracking-[0.12em] text-muted">
      {LABELS[status]}
    </span>
  );
}
