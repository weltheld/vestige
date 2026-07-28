"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Languages } from "lucide-react";
import { translateCodex } from "@/app/journal/c/[campaignId]/codex/actions";

/**
 * One-off: rewrite the campaign's existing codex summaries in English.
 *
 * New entries are written in English by the extraction and summary prompts, so
 * this only exists to bring a codex written before that changed into line. It's
 * safe to press twice — entries that already read as English are skipped
 * without spending a call.
 *
 * Owner-only, and it walks the whole codex one entry at a time, so it can take
 * a while: the button reports what it did rather than silently finishing.
 */
export function TranslateCodexButton({ campaignId }: { campaignId: string }) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [note, setNote] = useState<string | null>(null);

  async function run() {
    setBusy(true);
    setNote(null);
    const res = await translateCodex(campaignId);
    setBusy(false);

    if (!res.ok) {
      setNote(res.error);
      return;
    }
    const { translated, skipped, failed, error } = res.result;
    if (translated === 0 && failed === 0) {
      setNote("Everything already reads as English.");
      return;
    }
    setNote(
      [
        `Translated ${translated}`,
        skipped > 0 && `${skipped} already English`,
        failed > 0 && `${failed} failed${error ? ` (${error})` : ""}`,
      ]
        .filter(Boolean)
        .join(" · "),
    );
    if (translated > 0) router.refresh();
  }

  return (
    <div className="flex flex-col items-end gap-1">
      <button
        type="button"
        onClick={run}
        disabled={busy}
        title="Rewrite existing non-English codex summaries in English"
        className="flex items-center gap-2 rounded-lg border border-hairline bg-surface px-4 py-3 font-display text-[11px] font-semibold uppercase tracking-[0.08em] text-ink-soft transition hover:border-gold hover:text-ink disabled:opacity-60"
      >
        <Languages size={14} />
        {busy ? "Translating…" : "Translate to English"}
      </button>
      {note && <span className="font-body text-[11px] text-muted">{note}</span>}
    </div>
  );
}
