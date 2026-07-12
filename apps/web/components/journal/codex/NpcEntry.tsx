"use client";

import { useState } from "react";
import { Pencil } from "lucide-react";
import type { NpcKindDb, NpcStatusDb } from "@vestige/db";
import { NpcForm } from "./NpcForm";
import { DeleteNpcButton } from "./DeleteNpcButton";
import { SummaryWithFootnotes } from "./SummaryWithFootnotes";

const KIND_LABEL: Record<NpcKindDb, string> = {
  person: "Person",
  place: "Place",
  event: "Event",
};
const STATUS_LABEL: Record<NpcStatusDb, string> = {
  alive: "Alive",
  dead: "Dead",
  unknown: "Unknown",
};

/**
 * A codex entry's detail body with a read-first design: view mode renders
 * the chronicle (footnote markers tooltipped); Edit swaps in the form.
 * Save returns to view; Cancel drops unsaved edits. Delete only appears
 * while editing.
 */
export function NpcEntry({
  campaignId,
  npc,
  canSummarize,
}: {
  campaignId: string;
  npc: { id: string; name: string; summary: string | null; status: NpcStatusDb; kind: NpcKindDb };
  canSummarize: boolean;
}) {
  const [editing, setEditing] = useState(false);

  if (editing) {
    return (
      <div className="flex flex-col gap-8">
        <NpcForm
          campaignId={campaignId}
          npcId={npc.id}
          initial={{ name: npc.name, summary: npc.summary, status: npc.status, kind: npc.kind }}
          canSummarize={canSummarize}
          onSaved={() => setEditing(false)}
          onCancel={() => setEditing(false)}
        />
        <div className="border-t border-hairline pt-5">
          <DeleteNpcButton campaignId={campaignId} npcId={npc.id} name={npc.name} />
        </div>
      </div>
    );
  }

  const meta = [KIND_LABEL[npc.kind], npc.kind === "person" ? STATUS_LABEL[npc.status] : null]
    .filter(Boolean)
    .join(" · ");

  return (
    <div className="flex flex-col gap-5">
      <div className="flex items-start justify-between gap-4">
        <div className="min-w-0">
          <h1 className="font-display text-[26px] font-semibold text-ink">{npc.name}</h1>
          <p className="mt-0.5 font-display text-[11px] font-semibold uppercase tracking-[0.12em] text-muted">
            {meta}
          </p>
        </div>
        <button
          type="button"
          onClick={() => setEditing(true)}
          className="inline-flex shrink-0 items-center gap-1.5 rounded-lg bg-wine px-4 py-2.5 font-display text-[11px] font-semibold uppercase tracking-[0.08em] text-white transition hover:brightness-110"
        >
          <Pencil size={12} />
          Edit entry
        </button>
      </div>

      {npc.summary ? (
        <SummaryWithFootnotes
          summary={npc.summary}
          className="whitespace-pre-line font-body text-[15px] leading-[1.8] text-ink"
        />
      ) : (
        <p className="font-body text-[14px] italic text-muted">
          No summary yet — edit the entry to add one
          {canSummarize ? ", or draft it from the sessions below" : ""}.
        </p>
      )}
    </div>
  );
}
