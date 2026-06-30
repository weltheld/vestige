"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Plus, Quote } from "lucide-react";
import { addAnnotation } from "@/app/c/[campaignId]/s/actions";

/** The gold count badge on an annotated paragraph (drawer deferred — logs). */
export function AnnotationBadge({ anchor, count }: { anchor: string; count: number }) {
  return (
    <button
      type="button"
      aria-label={`${count} annotations`}
      onClick={() => console.log("open annotations drawer for", anchor)}
      className="absolute -right-3 top-1 flex h-[22px] w-[22px] items-center justify-center rounded-full bg-gold font-display text-[11px] font-semibold text-white"
    >
      {count}
    </button>
  );
}

/** Hover "+" that opens an inline composer and writes an annotation. */
export function AnnotationAdder({
  campaignId,
  sessionId,
  anchor,
  excerpt,
}: {
  campaignId: string;
  sessionId: string;
  anchor: string;
  excerpt: string;
}) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [body, setBody] = useState("");
  const [saving, setSaving] = useState(false);

  async function save() {
    if (!body.trim()) return;
    setSaving(true);
    await addAnnotation(campaignId, sessionId, anchor, body.trim());
    setBody("");
    setOpen(false);
    setSaving(false);
    router.refresh();
  }

  if (!open) {
    return (
      <button
        type="button"
        aria-label="Add annotation"
        onClick={() => setOpen(true)}
        className="absolute -left-9 top-1 flex h-6 w-6 items-center justify-center rounded-md border border-hairline bg-surface text-gold opacity-0 transition group-hover:opacity-100"
      >
        <Plus size={14} />
      </button>
    );
  }

  return (
    <div className="mt-2 flex w-[220px] flex-col gap-2 rounded-xl bg-cod-soft p-3.5">
      <div className="flex items-center gap-1.5">
        <Quote size={12} className="text-gold-soft" />
        <span className="line-clamp-1 font-body text-[11px] text-muted">Annotating: “{excerpt}”</span>
      </div>
      <textarea
        autoFocus
        value={body}
        onChange={(e) => setBody(e.target.value)}
        placeholder="Your note…"
        className="min-h-[60px] resize-none bg-transparent font-body text-[13px] text-ink outline-none placeholder:text-muted"
      />
      <div className="flex items-center justify-between">
        <button type="button" onClick={() => setOpen(false)} className="font-body text-[11px] text-ink-soft">
          Cancel
        </button>
        <button
          type="button"
          onClick={save}
          disabled={saving}
          className="rounded bg-wine px-3 py-1.5 font-display text-[10px] font-semibold uppercase tracking-[0.08em] text-white disabled:opacity-60"
        >
          Save note
        </button>
      </div>
    </div>
  );
}
