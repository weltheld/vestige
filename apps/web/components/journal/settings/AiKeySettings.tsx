"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Loader2 } from "lucide-react";
import type { AiProviderDb } from "@vestige/db";
import type { AiKeySettings as AiKeyView } from "@/lib/journal/campaign-settings";
import {
  saveCampaignAiKey,
  setActiveAiProvider,
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

/** Creator-only card for the campaign's AI summarization keys. Both
 *  providers' keys can be stored; the radio picks which one is active.
 *  Keys are write-only from here — only a masked preview comes back. */
export function AiKeySettings({
  campaignId,
  current,
}: {
  campaignId: string;
  current: AiKeyView | null;
}) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const run = async (fn: () => Promise<{ ok: boolean; error?: string }>) => {
    setError(null);
    setBusy(true);
    try {
      const res = await fn();
      if (!res.ok) {
        setError(res.error ?? "Something went wrong.");
        return false;
      }
      router.refresh();
      return true;
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="flex flex-col gap-4">
      <p className="font-body text-[12px] leading-[1.6] text-ink-soft">
        Powers the Codex&apos;s &ldquo;Summarize from sessions&rdquo; button. Bring your own
        keys — they&apos;re stored for this campaign only and never shown in full again.
        Save one or both, then choose which is active.
      </p>

      {PROVIDERS.map((p) => (
        <ProviderRow
          key={p.value}
          campaignId={campaignId}
          provider={p}
          preview={
            p.value === "anthropic" ? current?.anthropicPreview ?? null : current?.groqPreview ?? null
          }
          isActive={current?.active === p.value}
          busy={busy}
          run={run}
        />
      ))}

      {error && <p className="font-body text-[12px] text-vote-no">{error}</p>}
    </div>
  );
}

function ProviderRow({
  campaignId,
  provider,
  preview,
  isActive,
  busy,
  run,
}: {
  campaignId: string;
  provider: { value: AiProviderDb; label: string; hint: string };
  preview: string | null;
  isActive: boolean;
  busy: boolean;
  run: (fn: () => Promise<{ ok: boolean; error?: string }>) => Promise<boolean>;
}) {
  const [key, setKey] = useState("");
  const hasKey = preview !== null;

  return (
    <div
      className={`flex flex-col gap-2.5 rounded-[10px] border px-3.5 py-3 transition ${
        isActive ? "border-gold bg-cod-soft" : "border-hairline"
      }`}
    >
      <div className="flex items-center justify-between gap-3">
        <label className="flex cursor-pointer items-center gap-2">
          <input
            type="radio"
            name="active-ai-provider"
            checked={isActive}
            disabled={busy || !hasKey}
            onChange={() => run(() => setActiveAiProvider(campaignId, provider.value))}
            className="accent-[var(--gold)]"
          />
          <span className="font-display text-[13px] text-ink">{provider.label}</span>
          {isActive && (
            <span className="font-display text-[10px] font-semibold uppercase tracking-wider text-gold">
              Active
            </span>
          )}
        </label>
        {hasKey && (
          <span className="flex items-center gap-2.5">
            <span className="font-mono text-[12px] text-muted">{preview}</span>
            <button
              type="button"
              disabled={busy}
              onClick={() => {
                if (
                  !window.confirm(
                    `Remove the saved ${provider.label} key?${isActive ? " Summaries switch to the other key if one is saved." : ""}`,
                  )
                )
                  return;
                void run(() => removeCampaignAiKey(campaignId, provider.value));
              }}
              className="font-body text-[11px] text-muted transition hover:text-vote-no disabled:opacity-50"
            >
              Remove
            </button>
          </span>
        )}
      </div>

      <div className="flex gap-2">
        <input
          type="password"
          value={key}
          onChange={(e) => setKey(e.target.value)}
          placeholder={hasKey ? "Paste a new key to replace" : "Paste your API key"}
          autoComplete="off"
          className="min-w-0 flex-1 rounded-md border border-hairline bg-transparent px-3 py-2 font-body text-[13px] text-ink outline-none transition focus:border-gold"
        />
        <button
          type="button"
          disabled={busy || !key.trim()}
          onClick={() =>
            void run(() => saveCampaignAiKey(campaignId, provider.value, key)).then((ok) => {
              if (ok) setKey("");
            })
          }
          className="inline-flex items-center gap-1.5 rounded-lg bg-wine px-4 py-2 font-display text-[11px] font-semibold uppercase tracking-[0.08em] text-white transition hover:brightness-110 disabled:opacity-50"
        >
          {busy && <Loader2 size={12} className="animate-spin" />}
          Save
        </button>
      </div>
      <p className="font-body text-[11px] italic text-muted">{provider.hint}</p>
    </div>
  );
}
