import type { NpcStatusDb } from "@vestige/db";

const LABELS: Record<NpcStatusDb, string> = {
  alive: "Alive",
  dead: "Dead",
  unknown: "Unknown",
};

/** Quiet, text-only status label — a library catalogue note, deliberately
 *  not a traffic-light badge. Dead entries get a strikethrough name treatment
 *  elsewhere; here the word alone carries the meaning. */
export function NpcStatusLabel({ status }: { status: NpcStatusDb }) {
  return (
    <span className="shrink-0 font-display text-[10px] font-semibold uppercase tracking-[0.12em] text-muted">
      {LABELS[status]}
    </span>
  );
}
