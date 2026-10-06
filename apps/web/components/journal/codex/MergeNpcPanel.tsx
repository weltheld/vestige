"use client";

import { useState, useTransition } from "react";
import { GitMerge, Loader2 } from "lucide-react";
import { draftMerge, mergeNpcs } from "@/app/journal/c/[campaignId]/codex/actions";

type Candidate = { id: string; name: string };

/**
 * Merge another codex entry INTO this one. Two steps so nothing is
 * destructive until the text has been read: pick the entry (and the name to
 * keep), draft the combined chronicle, review/edit it, then confirm. The
 * other entry is deleted only on that last click; its session mentions and
 * every link to it move to this entry.
 */
export function MergeNpcPanel({
  campaignId,
  npcId,
  npcName,
  candidates,
}: {
  campaignId: string;
  npcId: string;
  npcName: string;
  candidates: Candidate[];
}) {
  const [open, setOpen] = useState(false);
  const [otherId, setOtherId] = useState("");
  const [name, setName] = useState(npcName);
  const [draft, setDraft] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  const other = candidates.find((c) => c.id === otherId);

  function reset() {
    setOpen(false);
    setOtherId("");
    setName(npcName);
    setDraft(null);
    setError(null);
  }

  function runDraft() {
    if (!other) return;
    setError(null);
    startTransition(async () => {
      const res = await draftMerge(campaignId, npcId, other.id, name);
      if (res.ok) setDraft(res.summary);
      else setError(res.error);
    });
  }

  function runMerge() {
    if (!other || draft === null) return;
    const ok = window.confirm(
      `Merge "${other.name}" into "${name.trim() || npcName}"?\n\n"${other.name}" will be deleted. Its session mentions and every link to it move to the merged entry. This can't be undone.`,
    );
    if (!ok) return;
    setError(null);
    startTransition(async () => {
      const res = await mergeNpcs(campaignId, npcId, other.id, { name, summary: draft });
      // On success the action redirects; only a failure returns here.
      if (res && !res.ok) setError(res.error);
    });
  }

  if (!open) {
    return (
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="inline-flex shrink-0 items-center gap-1.5 rounded-lg border border-hairline px-4 py-2.5 font-display text-[11px] font-semibold uppercase tracking-[0.08em] text-ink-soft transition hover:border-gold hover:text-ink"
      >
        <GitMerge size={12} />
        Merge
      </button>
    );
  }

  return (
    <div className="mt-1 flex w-full flex-col gap-3 rounded-xl border border-hairline bg-cod-soft p-4">
      <p className="font-display text-[11px] font-semibold uppercase tracking-[0.1em] text-ink-soft">
        Merge another entry into {npcName}
      </p>

      <label className="flex flex-col gap-1">
        <span className="font-body text-[12px] text-muted">Entry to merge in (it will be removed)</span>
        <select
          value={otherId}
          disabled={pending || draft !== null}
          onChange={(e) => setOtherId(e.target.value)}
          className="rounded-md border border-hairline bg-surface px-2 py-2 font-body text-[14px] text-ink"
        >
          <option value="">Choose an entry…</option>
          {candidates.map((c) => (
            <option key={c.id} value={c.id}>
              {c.name}
            </option>
          ))}
        </select>
      </label>

      {other && (
        <div className="flex flex-col gap-1">
          <span className="font-body text-[12px] text-muted">Name for the merged entry</span>
          <input
            value={name}
            disabled={pending || draft !== null}
            onChange={(e) => setName(e.target.value)}
            className="rounded-md border border-hairline bg-surface px-2.5 py-2 font-body text-[14px] text-ink"
          />
          {draft === null && (
            <div className="flex gap-3 font-body text-[12px]">
              <button type="button" onClick={() => setName(npcName)} className="text-gold underline underline-offset-2">
                {npcName}
              </button>
              <button type="button" onClick={() => setName(other.name)} className="text-gold underline underline-offset-2">
                {other.name}
              </button>
            </div>
          )}
        </div>
      )}

      {draft !== null && (
        <label className="flex flex-col gap-1">
          <span className="font-body text-[12px] text-muted">
            Combined text — review and edit before merging. Duplicates are removed; sources stay cited.
          </span>
          <textarea
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            rows={10}
            className="rounded-md border border-hairline bg-surface p-2.5 font-body text-[14px] leading-[1.6] text-ink"
          />
        </label>
      )}

      {error && <p className="font-body text-[13px] text-vote-no">{error}</p>}

      <div className="flex flex-wrap items-center gap-3">
        {draft === null ? (
          <button
            type="button"
            disabled={!other || !name.trim() || pending}
            onClick={runDraft}
            className="inline-flex items-center gap-1.5 rounded-lg bg-wine px-4 py-2.5 font-display text-[11px] font-semibold uppercase tracking-[0.08em] text-white transition hover:brightness-110 disabled:opacity-50"
          >
            {pending && <Loader2 size={12} className="animate-spin" />}
            Draft merged text
          </button>
        ) : (
          <button
            type="button"
            disabled={pending}
            onClick={runMerge}
            className="inline-flex items-center gap-1.5 rounded-lg bg-wine px-4 py-2.5 font-display text-[11px] font-semibold uppercase tracking-[0.08em] text-white transition hover:brightness-110 disabled:opacity-50"
          >
            {pending && <Loader2 size={12} className="animate-spin" />}
            Merge entries
          </button>
        )}
        {draft !== null && (
          <button
            type="button"
            disabled={pending}
            onClick={() => setDraft(null)}
            className="font-body text-[13px] text-ink-soft underline underline-offset-2"
          >
            Back
          </button>
        )}
        <button type="button" disabled={pending} onClick={reset} className="font-body text-[13px] text-muted underline underline-offset-2">
          Cancel
        </button>
      </div>
    </div>
  );
}
