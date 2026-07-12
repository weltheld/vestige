"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Library, Loader2 } from "lucide-react";
import { extractCodexFromSession } from "@/app/journal/c/[campaignId]/s/actions";

/** Owner-only: run the AI extraction pass over this session and add the
 *  people/places/events it finds to the campaign codex, linking their names
 *  in the text. Sits next to "Edit session" in the hero. */
export function ExtractCodexButton({
  campaignId,
  sessionId,
}: {
  campaignId: string;
  sessionId: string;
}) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [note, setNote] = useState<string | null>(null);
  const [error, setError] = useState(false);

  async function extract() {
    setBusy(true);
    setNote(null);
    setError(false);
    try {
      const res = await extractCodexFromSession(campaignId, sessionId);
      if (!res.ok) {
        setNote(res.error);
        setError(true);
        return;
      }
      setNote(
        res.created > 0
          ? `${res.created} new ${res.created === 1 ? "entry" : "entries"} · ${res.linked} linked`
          : `Nothing new — ${res.linked} linked`,
      );
      router.refresh();
    } finally {
      setBusy(false);
      window.setTimeout(() => setNote(null), 6000);
    }
  }

  return (
    <span className="relative inline-flex">
      <button
        type="button"
        disabled={busy}
        onClick={extract}
        title="Find people, places, and events in this session and add them to the codex"
        className="inline-flex items-center gap-1.5 rounded-lg border border-white/40 bg-black/30 px-4 py-2.5 font-display text-[11px] font-semibold uppercase tracking-[0.08em] text-white backdrop-blur-sm transition hover:bg-black/45 disabled:opacity-60"
      >
        {busy ? <Loader2 size={12} className="animate-spin" /> : <Library size={12} />}
        {busy ? "Reading…" : "Add to Codex"}
      </button>
      {note && (
        <span
          className={`absolute right-0 top-full mt-2 whitespace-nowrap rounded-md px-2.5 py-1.5 font-body text-[11px] shadow-md ${
            error ? "bg-vote-no text-white" : "bg-surface text-ink"
          }`}
        >
          {note}
        </span>
      )}
    </span>
  );
}
