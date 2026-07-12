"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Sparkles, Loader2 } from "lucide-react";
import type { NpcKindDb, NpcStatusDb } from "@vestige/db";
import { createNpc, updateNpc, summarizeNpc } from "@/app/journal/c/[campaignId]/codex/actions";
import { journal } from "@/lib/journal/links";

const KIND_OPTIONS: Array<{ value: NpcKindDb; label: string }> = [
  { value: "person", label: "Person" },
  { value: "place", label: "Place" },
  { value: "event", label: "Event" },
];

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
  canSummarize = false,
}: {
  campaignId: string;
  npcId?: string;
  initial?: { name: string; summary: string | null; status: NpcStatusDb; kind: NpcKindDb };
  /** Only the campaign owner may trigger the paid AI summarize action. */
  canSummarize?: boolean;
}) {
  const router = useRouter();
  const [name, setName] = useState(initial?.name ?? "");
  const [summary, setSummary] = useState(initial?.summary ?? "");
  const [status, setStatus] = useState<NpcStatusDb>(initial?.status ?? "unknown");
  const [kind, setKind] = useState<NpcKindDb>(initial?.kind ?? "person");
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();
  const [summarizing, setSummarizing] = useState(false);

  function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!name.trim()) {
      setError("A name is required.");
      return;
    }
    setError(null);
    setNotice(null);
    startTransition(async () => {
      try {
        const input = { name, summary: summary.trim() || null, status, kind };
        if (npcId) {
          await updateNpc(campaignId, npcId, input);
          setNotice("Saved.");
          window.setTimeout(() => setNotice(null), 2000);
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

  async function summarize() {
    if (!npcId) return;
    setError(null);
    setNotice(null);
    setSummarizing(true);
    try {
      const result = await summarizeNpc(campaignId, npcId);
      if (!result.ok) {
        setError(result.error);
        return;
      }
      // Draft only — lands in the textarea for review; Save persists it.
      setSummary(result.summary);
      setNotice("Summary drafted from the sessions below — review and save.");
    } finally {
      setSummarizing(false);
    }
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

      <div className="flex gap-6">
        <label className="flex w-40 flex-col gap-1.5">
          <span className="font-display text-[11px] font-semibold uppercase tracking-[0.1em] text-muted">
            Type
          </span>
          <select
            value={kind}
            onChange={(e) => setKind(e.target.value as NpcKindDb)}
            className="rounded-md border border-hairline bg-transparent px-2 py-2 font-body text-[14px] text-ink outline-none transition focus:border-gold"
          >
            {KIND_OPTIONS.map((o) => (
              <option key={o.value} value={o.value}>
                {o.label}
              </option>
            ))}
          </select>
        </label>

        {kind === "person" && (
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
        )}
      </div>

      <label className="flex flex-col gap-1.5">
        <span className="flex items-center font-display text-[11px] font-semibold uppercase tracking-[0.1em] text-muted">
          Summary
          {npcId && canSummarize && (
            <button
              type="button"
              disabled={summarizing || pending}
              onClick={summarize}
              className="ml-auto inline-flex items-center gap-1.5 rounded-md border border-hairline px-2.5 py-1 font-display text-[10px] font-semibold uppercase tracking-wider text-ink-soft transition hover:bg-cod-soft hover:text-ink disabled:opacity-60"
            >
              {summarizing ? (
                <Loader2 size={11} className="animate-spin" />
              ) : (
                <Sparkles size={11} className="text-gold" />
              )}
              {summarizing ? "Summarizing…" : "Summarize from sessions"}
            </button>
          )}
        </span>
        <textarea
          value={summary}
          onChange={(e) => setSummary(e.target.value)}
          rows={5}
          placeholder="Who or what this is, why it matters, what the party knows."
          className="rounded-md border border-hairline bg-transparent px-3 py-2.5 font-body text-[15px] leading-[1.7] text-ink outline-none transition focus:border-gold"
        />
      </label>

      <div className="flex items-center gap-3">
        <button
          type="submit"
          disabled={pending || summarizing}
          className="rounded-lg bg-wine px-[22px] py-3 font-display text-[11px] font-semibold uppercase tracking-[0.08em] text-white transition hover:brightness-110 disabled:opacity-60"
        >
          {pending ? "Saving…" : npcId ? "Save changes" : "Add to codex"}
        </button>
        {notice && !error && <span className="font-body text-[12px] text-vote-yes">{notice}</span>}
        {error && <span className="font-body text-[12px] text-vote-no">{error}</span>}
      </div>
    </form>
  );
}
