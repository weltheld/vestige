"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Loader2 } from "lucide-react";
import type { AiProviderDb } from "@vestige/db";
import type { AiKeySettings as AiKeyView } from "@/lib/journal/campaign-settings";
import {
  saveCampaignAiKey,
  removeCampaignAiKey,
} from "@/app/journal/c/[campaignId]/settings/actions";

const PROVIDERS: Array<{ value: AiProviderDb; label: string; hint: string }> = [
  {
    value: "anthropic",
    label: "Anthropic (Claude)",
    hint: "Best quality — paid per use. Get a key at console.anthropic.com.",
  },
  {
    value: "groq",
    label: "Groq (Llama, free tier)",
    hint: "Free — open-source Llama hosted by Groq. Get a key at console.groq.com.",
  },
];

/** Creator-only card for the campaign's AI summarization key. The full key
 *  is write-only from here — after saving, only a masked preview comes back. */
export function AiKeySettings({
  campaignId,
  current,
}: {
  campaignId: string;
  current: AiKeyView | null;
}) {
  const router = useRouter();
  const [provider, setProvider] = useState<AiProviderDb>(current?.provider ?? "anthropic");
  const [key, setKey] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const hint = PROVIDERS.find((p) => p.value === provider)?.hint;

  async function save() {
    setError(null);
    setBusy(true);
    try {
      await saveCampaignAiKey(campaignId, provider, key);
      setKey("");
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not save the key.");
    } finally {
      setBusy(false);
    }
  }

  async function remove() {
    if (!window.confirm("Remove the saved API key? Codex summaries stop working until a new one is added.")) return;
    setError(null);
    setBusy(true);
    try {
      await removeCampaignAiKey(campaignId);
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not remove the key.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="flex flex-col gap-3">
      <p className="font-body text-[12px] leading-[1.6] text-ink-soft">
        Powers the Codex&apos;s &ldquo;Summarize from sessions&rdquo; button. Bring your own
        key — it&apos;s stored for this campaign only and never shown in full again.
      </p>

      {current && (
        <div className="flex items-center justify-between rounded-[10px] bg-cod-soft px-3.5 py-2.5">
          <span className="font-body text-[13px] text-ink">
            {PROVIDERS.find((p) => p.value === current.provider)?.label ?? current.provider}
            <span className="ml-2 font-mono text-[12px] text-muted">{current.keyPreview}</span>
          </span>
          <button
            type="button"
            disabled={busy}
            onClick={remove}
            className="font-body text-[11px] text-muted transition hover:text-vote-no disabled:opacity-50"
          >
            Remove
          </button>
        </div>
      )}

      <div className="flex flex-col gap-2">
        <div className="flex gap-2">
          <select
            value={provider}
            onChange={(e) => setProvider(e.target.value as AiProviderDb)}
            className="rounded-md border border-hairline bg-transparent px-2 py-2 font-body text-[13px] text-ink outline-none transition focus:border-gold"
          >
            {PROVIDERS.map((p) => (
              <option key={p.value} value={p.value}>
                {p.label}
              </option>
            ))}
          </select>
          <input
            type="password"
            value={key}
            onChange={(e) => setKey(e.target.value)}
            placeholder={current ? "Paste a new key to replace" : "Paste your API key"}
            autoComplete="off"
            className="min-w-0 flex-1 rounded-md border border-hairline bg-transparent px-3 py-2 font-body text-[13px] text-ink outline-none transition focus:border-gold"
          />
          <button
            type="button"
            disabled={busy || !key.trim()}
            onClick={save}
            className="inline-flex items-center gap-1.5 rounded-lg bg-wine px-4 py-2 font-display text-[11px] font-semibold uppercase tracking-[0.08em] text-white transition hover:brightness-110 disabled:opacity-50"
          >
            {busy && <Loader2 size={12} className="animate-spin" />}
            Save
          </button>
        </div>
        {hint && <p className="font-body text-[11px] italic text-muted">{hint}</p>}
        {error && <p className="font-body text-[12px] text-vote-no">{error}</p>}
      </div>
    </div>
  );
}
