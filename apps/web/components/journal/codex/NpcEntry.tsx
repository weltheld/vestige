"use client";

import { useState } from "react";
import { Pencil } from "lucide-react";
import type { NpcKindDb, NpcRoleDb } from "@vestige/db";
import { ROLE_KINDS, ROLE_LABEL } from "./NpcRoleLabel";
import { NpcForm } from "./NpcForm";
import { DeleteNpcButton } from "./DeleteNpcButton";
import { SummaryWithFootnotes } from "./SummaryWithFootnotes";
import type { MentionNpc } from "../session/MentionSuggestion";

const KIND_LABEL: Record<NpcKindDb, string> = {
  person: "Person",
  place: "Place",
  event: "Event",
  item: "Item",
  creature: "Creature",
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
  mentionTargets = [],
}: {
  campaignId: string;
  npc: {
    id: string;
    name: string;
    summary: string | null;
    role: NpcRoleDb;
    kind: NpcKindDb;
    image_url: string | null;
  };
  canSummarize: boolean;
  /** Codex entries + sessions for the summary's @-mention crosslinking. */
  mentionTargets?: MentionNpc[];
}) {
  const [editing, setEditing] = useState(false);

  if (editing) {
    return (
      <div className="flex flex-col gap-8">
        <NpcForm
          campaignId={campaignId}
          npcId={npc.id}
          initial={{
            name: npc.name,
            summary: npc.summary,
            role: npc.role,
            kind: npc.kind,
            imageUrl: npc.image_url,
          }}
          canSummarize={canSummarize}
          mentionTargets={mentionTargets}
          onSaved={() => setEditing(false)}
          onCancel={() => setEditing(false)}
        />
        <div className="border-t border-hairline pt-5">
          <DeleteNpcButton campaignId={campaignId} npcId={npc.id} name={npc.name} />
        </div>
      </div>
    );
  }

  // Characters read as their role ("NPC"); everything else as its kind.
  const meta = [KIND_LABEL[npc.kind], ROLE_KINDS.has(npc.kind) ? ROLE_LABEL[npc.role] : null]
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

      {npc.image_url && (
        // object-contain, not object-cover: the old crop forced every image
        // to the width of the card at a fixed max-height, cutting off
        // whatever didn't fit that box. max-height stays only as a ceiling
        // for a pathologically tall image — anything within it now renders
        // at its own real proportions instead of being cropped to fit ours.
        <figure className="flex max-h-[480px] items-center justify-center overflow-hidden rounded-lg border border-hairline bg-cod-soft">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={npc.image_url}
            alt={npc.name}
            className="max-h-[480px] w-full object-contain"
          />
        </figure>
      )}

      {npc.summary ? (
        <SummaryWithFootnotes
          summary={npc.summary}
          campaignId={campaignId}
          className="whitespace-pre-line font-body text-[15px] leading-[1.8] text-ink"
          // mentionTargets already excludes this entry (getMentionTargets'
          // excludeNpcId) and already fed the @-menu while editing — reusing
          // it here means a plain-text mention of another entry's name
          // crosslinks it too, without waiting for someone to have typed @
          // for it. Sessions are filtered out: they aren't codex cards, so
          // auto-linking them here isn't what was asked for.
          codexEntries={mentionTargets.filter((t) => t.type !== "session")}
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
