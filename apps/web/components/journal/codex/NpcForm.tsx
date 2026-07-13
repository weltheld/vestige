"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Sparkles, Loader2, ImagePlus, BookOpen, ScrollText, X } from "lucide-react";
import type { NpcKindDb, NpcStatusDb } from "@vestige/db";
import {
  createNpc,
  updateNpc,
  summarizeNpc,
  enrichFromSrd,
  enrichFromWiki,
} from "@/app/journal/c/[campaignId]/codex/actions";
import { journal } from "@/lib/journal/links";
import { parseFootnotes, type Footnote } from "@/lib/journal/codex-footnotes";
import { uploadJournalImage, pickImageFile } from "@/lib/journal/upload";
import { SummaryEditor } from "./SummaryEditor";
import type { MentionNpc } from "../session/MentionSuggestion";

/** Storage keeps body + legend in one text column; the form edits only the
 *  body and re-attaches the legend on save. */
function joinFootnotes(body: string, notes: Footnote[]): string {
  const text = body.trim();
  if (!text || notes.length === 0) return text;
  return `${text}\n\n—\n${notes.map((f) => `[${f.n}] ${f.label}`).join("\n")}`;
}

const KIND_OPTIONS: Array<{ value: NpcKindDb; label: string }> = [
  { value: "person", label: "Person" },
  { value: "place", label: "Place" },
  { value: "event", label: "Event" },
  { value: "item", label: "Item" },
  { value: "creature", label: "Creature" },
];

/** Kinds that exist in the 5e SRD, so an "Look up in SRD" enrichment button
 *  is worth offering. */
const SRD_KINDS = new Set<NpcKindDb>(["item", "creature"]);
const STATUS_KINDS = new Set<NpcKindDb>(["person", "creature"]);

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
  mentionTargets = [],
  onSaved,
  onCancel,
}: {
  campaignId: string;
  npcId?: string;
  /** Codex entries + sessions offered by the summary's @-mention dropdown. */
  mentionTargets?: MentionNpc[];
  initial?: {
    name: string;
    summary: string | null;
    status: NpcStatusDb;
    kind: NpcKindDb;
    imageUrl: string | null;
  };
  /** Only the campaign owner may trigger the paid AI summarize action. */
  canSummarize?: boolean;
  /** Called after a successful in-place save (detail page returns to view mode). */
  onSaved?: () => void;
  /** Renders a Cancel button that calls this (back to view mode, unsaved edits dropped). */
  onCancel?: () => void;
}) {
  const router = useRouter();
  const parsed = parseFootnotes(initial?.summary ?? null);
  const [name, setName] = useState(initial?.name ?? "");
  // The textarea holds only the summary body; the footnote legend is shown
  // read-only below it and re-attached on save.
  const [summary, setSummary] = useState(parsed.body);
  const [footnotes, setFootnotes] = useState<Footnote[]>(parsed.notes);
  // The tiptap editor owns its content after mount — bump this key to remount
  // it whenever the summary is replaced programmatically (AI draft, SRD/wiki
  // lookup) so the new text actually shows up.
  const [editorKey, setEditorKey] = useState(0);
  const replaceSummary = (text: string) => {
    setSummary(text);
    setEditorKey((k) => k + 1);
  };
  const [status, setStatus] = useState<NpcStatusDb>(initial?.status ?? "unknown");
  const [kind, setKind] = useState<NpcKindDb>(initial?.kind ?? "person");
  const [imageUrl, setImageUrl] = useState<string | null>(initial?.imageUrl ?? null);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();
  const [summarizing, setSummarizing] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [enriching, setEnriching] = useState<"srd" | "wiki" | null>(null);

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
        const input = {
          name,
          summary: joinFootnotes(summary, footnotes) || null,
          status,
          kind,
          imageUrl,
        };
        if (npcId) {
          await updateNpc(campaignId, npcId, input);
          setNotice("Saved.");
          window.setTimeout(() => setNotice(null), 2000);
          router.refresh();
          onSaved?.();
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
      // Draft only — lands in the editor for review; Save persists it.
      const draft = parseFootnotes(result.summary);
      replaceSummary(draft.body);
      setFootnotes(draft.notes);
      setNotice("Summary drafted from the sessions below — review and save.");
    } finally {
      setSummarizing(false);
    }
  }

  async function chooseImage() {
    const file = await pickImageFile();
    if (!file) return;
    setError(null);
    setUploading(true);
    try {
      const url = await uploadJournalImage(campaignId, file);
      setImageUrl(url);
    } catch {
      setError("Image upload failed. Try again.");
    } finally {
      setUploading(false);
    }
  }

  async function lookUpSrd() {
    if (!name.trim()) {
      setError("Enter a name first.");
      return;
    }
    setError(null);
    setNotice(null);
    setEnriching("srd");
    try {
      const res = await enrichFromSrd(kind, name);
      if (!res.ok) {
        setError(res.error);
        return;
      }
      // Drop the SRD description into the summary body for review — it's
      // never saved until the user hits Save.
      replaceSummary(res.match.description);
      setNotice(`Filled from ${res.match.source} (“${res.match.name}”) — review and save.`);
    } finally {
      setEnriching(null);
    }
  }

  async function lookUpWiki() {
    if (!name.trim()) {
      setError("Enter a name first.");
      return;
    }
    setError(null);
    setNotice(null);
    setEnriching("wiki");
    try {
      const res = await enrichFromWiki(name);
      if (!res.ok) {
        setError(res.error);
        return;
      }
      replaceSummary(res.match.description);
      setNotice(`Filled from ${res.match.source} (“${res.match.name}”) — review and save.`);
    } finally {
      setEnriching(null);
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

        {STATUS_KINDS.has(kind) && (
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

      <div className="flex flex-col gap-1.5">
        <span className="font-display text-[11px] font-semibold uppercase tracking-[0.1em] text-muted">
          Image
        </span>
        <div className="flex items-center gap-3">
          <span className="flex h-20 w-20 shrink-0 items-center justify-center overflow-hidden rounded-md border border-hairline bg-cod-soft">
            {imageUrl ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={imageUrl} alt="" className="h-full w-full object-cover" />
            ) : (
              <ImagePlus size={20} className="text-muted" />
            )}
          </span>
          <div className="flex items-center gap-3">
            <button
              type="button"
              disabled={uploading}
              onClick={chooseImage}
              className="inline-flex items-center gap-1.5 rounded-md border border-hairline px-3 py-1.5 font-display text-[10px] font-semibold uppercase tracking-wider text-ink-soft transition hover:bg-cod-soft hover:text-ink disabled:opacity-60"
            >
              {uploading ? <Loader2 size={11} className="animate-spin" /> : <ImagePlus size={11} />}
              {uploading ? "Uploading…" : imageUrl ? "Replace" : "Upload image"}
            </button>
            {imageUrl && !uploading && (
              <button
                type="button"
                onClick={() => setImageUrl(null)}
                className="inline-flex items-center gap-1 font-body text-[12px] text-ink-soft transition hover:text-vote-no"
              >
                <X size={12} /> Remove
              </button>
            )}
          </div>
        </div>
      </div>

      <div className="flex flex-col gap-1.5">
        <span className="flex items-center gap-2 font-display text-[11px] font-semibold uppercase tracking-[0.1em] text-muted">
          Summary
          <button
            type="button"
            disabled={!!enriching || pending}
            onClick={lookUpWiki}
            title="Fill the summary from the Critical Role wiki (Exandria / Wildemount lore)"
            className="inline-flex items-center gap-1.5 rounded-md border border-hairline px-2.5 py-1 font-display text-[10px] font-semibold uppercase tracking-wider text-ink-soft transition hover:bg-cod-soft hover:text-ink disabled:opacity-60"
          >
            {enriching === "wiki" ? (
              <Loader2 size={11} className="animate-spin" />
            ) : (
              <ScrollText size={11} className="text-gold" />
            )}
            {enriching === "wiki" ? "Looking up…" : "Critical Role wiki"}
          </button>
          {SRD_KINDS.has(kind) && (
            <button
              type="button"
              disabled={!!enriching || pending}
              onClick={lookUpSrd}
              title="Fill the summary from the 5e SRD (Open5e)"
              className="inline-flex items-center gap-1.5 rounded-md border border-hairline px-2.5 py-1 font-display text-[10px] font-semibold uppercase tracking-wider text-ink-soft transition hover:bg-cod-soft hover:text-ink disabled:opacity-60"
            >
              {enriching === "srd" ? (
                <Loader2 size={11} className="animate-spin" />
              ) : (
                <BookOpen size={11} className="text-gold" />
              )}
              {enriching === "srd" ? "Looking up…" : "SRD"}
            </button>
          )}
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
        <SummaryEditor
          key={editorKey}
          value={summary}
          onChange={setSummary}
          placeholder="Who or what this is, why it matters, what the party knows."
          targets={mentionTargets}
        />
      </div>

      {/* No legend UI here — the [n] badges on the "Appears in" list below
          carry the source association. The legend still rides along in the
          stored summary (re-attached on save) for the overview tooltips. */}

      <div className="flex items-center gap-3">
        <button
          type="submit"
          disabled={pending || summarizing}
          className="rounded-lg bg-wine px-[22px] py-3 font-display text-[11px] font-semibold uppercase tracking-[0.08em] text-white transition hover:brightness-110 disabled:opacity-60"
        >
          {pending ? "Saving…" : npcId ? "Save changes" : "Add to codex"}
        </button>
        {onCancel && (
          <button
            type="button"
            disabled={pending || summarizing}
            onClick={onCancel}
            className="font-body text-[13px] text-ink-soft underline underline-offset-2 transition hover:text-ink disabled:opacity-60"
          >
            Cancel
          </button>
        )}
        {notice && !error && <span className="font-body text-[12px] text-vote-yes">{notice}</span>}
        {error && <span className="font-body text-[12px] text-vote-no">{error}</span>}
      </div>
    </form>
  );
}
