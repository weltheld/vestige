"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Loader2 } from "lucide-react";
import type { AiProviderDb } from "@vestige/db";
import type { AiKeySettings as AiKeyView, AiProviderKeySettings } from "@/lib/journal/campaign-settings";
import {
  saveCampaignAiKey,
  linkExistingAiKey,
  setActiveAiProvider,
  removeCampaignAiKey,
  deleteAiKey,
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
 *  providers' keys can be linked; the radio picks which is active. Keys
 *  live in the creator's personal library (see the picker in each
 *  provider row) — save once, reuse across every campaign you own,
 *  and see at a glance which other campaigns already use it. */
export function AiKeySettings({
  campaignId,
  current,
}: {
  campaignId: string;
  current: AiKeyView;
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
        keys — they&apos;re saved to your account, not just this campaign, so any other
        campaign you own can reuse the same key instead of you re-pasting it.
      </p>

      {PROVIDERS.map((p) => (
        <ProviderRow
          key={p.value}
          campaignId={campaignId}
          provider={p}
          settings={p.value === "anthropic" ? current.anthropic : current.groq}
          isActive={current.active === p.value}
          busy={busy}
          run={run}
        />
      ))}

      {error && <p className="font-body text-[12px] text-vote-no">{error}</p>}
    </div>
  );
}

function usedInLabel(names: string[]): string {
  if (names.length === 0) return "";
  if (names.length === 1) return `Also used in ${names[0]}`;
  if (names.length === 2) return `Also used in ${names[0]} and ${names[1]}`;
  return `Also used in ${names[0]}, ${names[1]}, and ${names.length - 2} more`;
}

function ProviderRow({
  campaignId,
  provider,
  settings,
  isActive,
  busy,
  run,
}: {
  campaignId: string;
  provider: { value: AiProviderDb; label: string; hint: string };
  settings: AiProviderKeySettings;
  isActive: boolean;
  busy: boolean;
  run: (fn: () => Promise<{ ok: boolean; error?: string }>) => Promise<boolean>;
}) {
  const [key, setKey] = useState("");
  const [picked, setPicked] = useState("");
  const hasKey = settings.linkedKeyId !== null;
  // Other saved keys for this provider the campaign isn't already using —
  // the "use an existing key" picker only needs to offer those.
  const otherOptions = settings.options.filter((o) => o.id !== settings.linkedKeyId);

  async function removeOrDelete() {
    if (!settings.linkedKeyId) return;
    const sharedElsewhere = settings.usedInOtherCampaigns.length > 0;
    const confirmMsg = sharedElsewhere
      ? `Remove this ${provider.label} key from this campaign? It stays saved for ${settings.usedInOtherCampaigns.join(", ")}.`
      : `Delete this ${provider.label} key? It isn't used by any other campaign, so this removes it from your account entirely.`;
    if (!window.confirm(confirmMsg)) return;
    if (sharedElsewhere) {
      void run(() => removeCampaignAiKey(campaignId, provider.value));
    } else {
      void run(() => deleteAiKey(settings.linkedKeyId!, campaignId));
    }
  }

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
          <button
            type="button"
            disabled={busy}
            onClick={removeOrDelete}
            className="font-body text-[11px] text-muted transition hover:text-vote-no disabled:opacity-50"
          >
            Remove
          </button>
        )}
      </div>

      {hasKey ? (
        <div className="flex flex-wrap items-center gap-x-2 gap-y-0.5">
          <span className="font-mono text-[12px] text-muted">{settings.preview}</span>
          {settings.usedInOtherCampaigns.length > 0 && (
            <span className="font-body text-[11px] italic text-muted">
              · {usedInLabel(settings.usedInOtherCampaigns)}
            </span>
          )}
        </div>
      ) : (
        otherOptions.length > 0 && (
          <div className="flex gap-2">
            <select
              value={picked}
              onChange={(e) => setPicked(e.target.value)}
              className="min-w-0 flex-1 rounded-md border border-hairline bg-transparent px-3 py-2 font-body text-[13px] text-ink outline-none transition focus:border-gold"
            >
              <option value="" disabled>
                Use a key already in your account…
              </option>
              {otherOptions.map((o) => (
                <option key={o.id} value={o.id}>
                  {o.preview}
                  {o.usedInOtherCampaigns.length > 0 ? ` — ${usedInLabel(o.usedInOtherCampaigns)}` : ""}
                </option>
              ))}
            </select>
            <button
              type="button"
              disabled={busy || !picked}
              onClick={() =>
                void run(() => linkExistingAiKey(campaignId, provider.value, picked)).then((ok) => {
                  if (ok) setPicked("");
                })
              }
              className="inline-flex items-center gap-1.5 rounded-lg border border-hairline px-4 py-2 font-display text-[11px] font-semibold uppercase tracking-[0.08em] text-ink-soft transition hover:bg-parchment hover:text-ink disabled:opacity-50"
            >
              Use this
            </button>
          </div>
        )
      )}

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
