"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import type { NpcStatusDb } from "@vestige/db";
import { createNpc, updateNpc } from "@/app/journal/c/[campaignId]/codex/actions";
import { journal } from "@/lib/journal/links";

const STATUS_OPTIONS: Array<{ value: NpcStatusDb; label: string }> = [
  { value: "alive", label: "Alive" },
  { value: "dead", label: "Dead" },
  { value: "unknown", label: "Unknown" },
];

/** Create/edit form for a codex entry. With `npcId` it edits in place;
 *  without, it creates and navigates to the new entry. */
export function NpcForm({
  campaignId,
  npcId,
  initial,
}: {
  campaignId: string;
  npcId?: string;
  initial?: { name: string; summary: string | null; status: NpcStatusDb };
}) {
  const router = useRouter();
  const [name, setName] = useState(initial?.name ?? "");
  const [summary, setSummary] = useState(initial?.summary ?? "");
  const [status, setStatus] = useState<NpcStatusDb>(initial?.status ?? "unknown");
  const [error, setError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);
  const [pending, startTransition] = useTransition();

  function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!name.trim()) {
      setError("A name is required.");
      return;
    }
    setError(null);
    setSaved(false);
    startTransition(async () => {
      try {
        const input = { name, summary: summary.trim() || null, status };
        if (npcId) {
          await updateNpc(campaignId, npcId, input);
          setSaved(true);
          window.setTimeout(() => setSaved(false), 2000);
          router.refresh();
        } else {
          const { id } = await createNpc(campaignId, input);
          router.push(journal.npc(campaignId, id));
        }
      } catch (err) {
        setError(err instanceof Error ? err.message : "Could not save.");
      }
    });
  }

  return (
    <form onSubmit={onSubmit} className="flex flex-col gap-6">
      <label className="flex flex-col gap-1.5">
        <span className="font-display text-[11px] font-semibold uppercase tracking-[0.1em] text-muted">
          Name
        </span>
        <input
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="Arroth Tepherok"
          className="border-b border-hairline bg-transparent py-1.5 font-display text-[20px] text-ink outline-none transition focus:border-gold"
        />
      </label>

      <label className="flex flex-col gap-1.5">
        <span className="font-display text-[11px] font-semibold uppercase tracking-[0.1em] text-muted">
          Summary
        </span>
        <textarea
          value={summary}
          onChange={(e) => setSummary(e.target.value)}
          rows={5}
          placeholder="Who they are, what they want, what the party knows."
          className="rounded-md border border-hairline bg-transparent px-3 py-2.5 font-body text-[15px] leading-[1.7] text-ink outline-none transition focus:border-gold"
        />
      </label>

      <label className="flex w-40 flex-col gap-1.5">
        <span className="font-display text-[11px] font-semibold uppercase tracking-[0.1em] text-muted">
          Status
        </span>
        <select
          value={status}
          onChange={(e) => setStatus(e.target.value as NpcStatusDb)}
          className="rounded-md border border-hairline bg-transparent px-2 py-2 font-body text-[14px] text-ink outline-none transition focus:border-gold"
        >
          {STATUS_OPTIONS.map((o) => (
            <option key={o.value} value={o.value}>
              {o.label}
            </option>
          ))}
        </select>
      </label>

      <div className="flex items-center gap-3">
        <button
          type="submit"
          disabled={pending}
          className="rounded-lg bg-wine px-[22px] py-3 font-display text-[11px] font-semibold uppercase tracking-[0.08em] text-white transition hover:brightness-110 disabled:opacity-60"
        >
          {pending ? "Saving…" : npcId ? "Save changes" : "Add to codex"}
        </button>
        {saved && <span className="font-body text-[12px] text-vote-yes">Saved.</span>}
        {error && <span className="font-body text-[12px] text-vote-no">{error}</span>}
      </div>
    </form>
  );
}
