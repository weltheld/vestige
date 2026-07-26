"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { format, parseISO } from "date-fns";
import { Plus, MessageCircle } from "lucide-react";
import { addAnnotation } from "@/app/journal/c/[campaignId]/s/actions";
import type { Annotation } from "@/lib/journal/session-detail";

/** The whole commenting surface for a Recap paragraph (there's no separate
 *  Comments section — this is where users comment directly on the summary,
 *  or any other section, right where it appears). Zero comments renders a
 *  bare hover "+"; one or more renders a "N comments" toggle that expands
 *  the full thread (every comment, not just the first) plus a composer that
 *  stays open so more can be added. */
export function AnnotationThread({
  campaignId,
  sessionId,
  anchor,
  excerpt,
  annotations,
}: {
  campaignId: string;
  sessionId: string;
  anchor: string;
  excerpt: string;
  annotations: Annotation[];
}) {
  // Open by default when there ARE comments: a collapsed "2 comments" toggle
  // meant discussion on the page was invisible unless you went looking, and
  // people couldn't find where comments lived at all. Still collapsible.
  const [expanded, setExpanded] = useState(true);

  if (annotations.length === 0) {
    return <Composer campaignId={campaignId} sessionId={sessionId} anchor={anchor} excerpt={excerpt} alwaysOpen={false} />;
  }

  return (
    <div className="mt-1.5">
      <button
        type="button"
        onClick={() => setExpanded((v) => !v)}
        className="flex items-center gap-1.5 font-body text-[11px] text-ink-soft hover:text-ink"
      >
        <MessageCircle size={12} className="text-gold" />
        {annotations.length} {annotations.length === 1 ? "comment" : "comments"}
      </button>

      {expanded && (
        <div className="mt-2 flex max-w-[480px] flex-col gap-3 rounded-xl bg-cod-soft p-3.5">
          {annotations.map((a) => (
            <div key={a.id} className="flex gap-2.5">
              <span
                className="flex h-6 w-6 shrink-0 items-center justify-center overflow-hidden rounded-full bg-wine font-display text-[10px] text-parchment"
                aria-hidden="true"
              >
                {a.authorAvatar ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={a.authorAvatar} alt="" className="h-full w-full object-cover" />
                ) : (
                  a.authorName.charAt(0).toUpperCase()
                )}
              </span>
              <div className="flex flex-1 flex-col gap-0.5">
                <div className="flex items-center gap-2">
                  <span className="font-display text-[12px] text-ink">{a.authorName}</span>
                  <span className="font-body text-[10px] text-muted">
                    {format(parseISO(a.createdAt), "MMM d, h:mmaaa")}
                  </span>
                </div>
                <p className="font-body text-[13px] leading-[1.55] text-ink">{a.body}</p>
              </div>
            </div>
          ))}
          <div className="h-px bg-hairline" />
          <Composer campaignId={campaignId} sessionId={sessionId} anchor={anchor} excerpt={excerpt} alwaysOpen />
        </div>
      )}
    </div>
  );
}

function Composer({
  campaignId,
  sessionId,
  anchor,
  excerpt,
  alwaysOpen,
}: {
  campaignId: string;
  sessionId: string;
  anchor: string;
  excerpt: string;
  alwaysOpen: boolean;
}) {
  const router = useRouter();
  const [open, setOpen] = useState(alwaysOpen);
  const [body, setBody] = useState("");
  const [saving, setSaving] = useState(false);

  async function save() {
    if (!body.trim()) return;
    setSaving(true);
    await addAnnotation(campaignId, sessionId, anchor, body.trim());
    setBody("");
    if (!alwaysOpen) setOpen(false);
    setSaving(false);
    router.refresh();
  }

  if (!open) {
    return (
      // Inline and labelled, not a bare "+" floating in the left margin: that
      // was invisible until hovered, unlabelled once found, and the timeline
      // rail now occupies the gutter it used to sit in. Fades in on hover
      // like the reaction control, but stays reachable by keyboard.
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="mt-1.5 flex items-center gap-1.5 rounded-full border border-hairline bg-surface px-2.5 py-0.5 font-body text-[12px] text-ink-soft opacity-0 transition hover:border-gold hover:text-ink focus-visible:opacity-100 group-hover:opacity-100"
      >
        <Plus size={12} /> Comment
      </button>
    );
  }

  return (
    <div
      className={
        alwaysOpen
          ? "flex flex-col gap-2"
          : "mt-2 flex w-[240px] flex-col gap-2 rounded-xl bg-cod-soft p-3.5"
      }
    >
      {!alwaysOpen && (
        <span className="line-clamp-1 font-body text-[11px] text-muted">
          Commenting on: &ldquo;{excerpt}&rdquo;
        </span>
      )}
      <textarea
        autoFocus={!alwaysOpen}
        value={body}
        onChange={(e) => setBody(e.target.value)}
        placeholder="Add a comment…"
        className="min-h-[52px] resize-none rounded-md border border-hairline bg-surface px-2.5 py-2 font-body text-[13px] text-ink outline-none placeholder:text-muted"
      />
      <div className="flex items-center justify-between">
        {!alwaysOpen && (
          <button type="button" onClick={() => setOpen(false)} className="font-body text-[11px] text-ink-soft">
            Cancel
          </button>
        )}
        <button
          type="button"
          onClick={save}
          disabled={saving}
          className="ml-auto rounded bg-wine px-3 py-1.5 font-display text-[10px] font-semibold uppercase tracking-[0.08em] text-white disabled:opacity-60"
        >
          {saving ? "Posting…" : "Post comment"}
        </button>
      </div>
    </div>
  );
}
