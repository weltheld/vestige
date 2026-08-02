"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { format, parseISO } from "date-fns";
import { Check, Copy, Plug, RefreshCw } from "lucide-react";
import type { FoundryConnection } from "@/lib/characters/foundry-link";
import { regenerateFoundryToken } from "@/app/characters/library/actions";

/**
 * Setup details for the vestige-foundry module.
 *
 * Yours, not a campaign's — the token identifies the person pushing, and one
 * Foundry install serves however many campaigns they are in. Collapsed by
 * default: it is a one-time step, and once connected nobody needs to look at
 * a token again.
 */
export function FoundryConnectionCard({ connection }: { connection: FoundryConnection }) {
  const router = useRouter();
  const [token, setToken] = useState(connection.token);
  const [copied, setCopied] = useState<"token" | "url" | null>(null);
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  function copy(which: "token" | "url", value: string) {
    navigator.clipboard?.writeText(value);
    setCopied(which);
    window.setTimeout(() => setCopied(null), 1500);
  }

  function regenerate() {
    if (
      !window.confirm(
        "Generate a new token? Any Foundry install using the current one will stop pushing characters until you paste the new token in.",
      )
    )
      return;
    startTransition(async () => {
      const result = await regenerateFoundryToken();
      if (!result.ok) {
        setError(result.error);
        return;
      }
      setError(null);
      setToken(result.token);
      router.refresh();
    });
  }

  const status =
    connection.importCount > 0
      ? `Connected — ${connection.importCount} ${
          connection.importCount === 1 ? "push" : "pushes"
        }${
          connection.lastImportAt
            ? `, last ${format(parseISO(connection.lastImportAt), "MMM d, yyyy")}`
            : ""
        }.`
      : connection.verifiedAt
        ? "Verified — Foundry can reach your account. Send a character from its sheet."
        : "Not connected yet — paste the settings below into the Foundry module.";

  return (
    <details className="rounded-xl border border-hairline bg-cod-soft px-5 py-4">
      <summary className="flex cursor-pointer list-none items-center gap-2">
        <Plug size={15} className="text-muted" />
        <span className="font-display text-[11px] font-semibold uppercase tracking-[0.08em] text-ink-soft">
          Push from Foundry
        </span>
        <span
          className="ml-1 h-2 w-2 shrink-0 rounded-full"
          style={{
            background:
              connection.importCount > 0
                ? "var(--vote-yes)"
                : connection.verifiedAt
                  ? "var(--gold)"
                  : "var(--muted)",
          }}
        />
      </summary>

      <div className="flex flex-col gap-3 pt-4">
        <p className="font-body text-[13px] text-ink">{status}</p>

        <label className="flex flex-col gap-1">
          <span className="font-body text-[11px] text-muted">Vestige URL</span>
          <div className="flex items-center gap-2">
            <input
              readOnly
              value={connection.apiBase}
              className="flex-1 rounded-md border border-hairline bg-[color-mix(in_srgb,var(--surface)_80%,var(--parchment))] px-3 py-2 font-mono text-[12px] text-ink"
            />
            <IconButton
              onClick={() => copy("url", connection.apiBase)}
              label="Copy Vestige URL"
              done={copied === "url"}
            />
          </div>
        </label>

        <label className="flex flex-col gap-1">
          <span className="font-body text-[11px] text-muted">Push token (secret)</span>
          <div className="flex items-center gap-2">
            <input
              readOnly
              value={token}
              className="flex-1 rounded-md border border-hairline bg-[color-mix(in_srgb,var(--surface)_80%,var(--parchment))] px-3 py-2 font-mono text-[12px] text-ink"
            />
            <IconButton
              onClick={() => copy("token", token)}
              label="Copy token"
              done={copied === "token"}
            />
            <button
              type="button"
              onClick={regenerate}
              disabled={pending}
              aria-label="Regenerate token"
              title="Regenerate token"
              className="flex h-9 w-9 shrink-0 items-center justify-center rounded-md border border-hairline text-ink-soft transition hover:text-wine disabled:opacity-50"
            >
              <RefreshCw size={15} className={pending ? "animate-spin" : ""} />
            </button>
          </div>
        </label>

        {error && <p className="font-body text-[12px] text-vote-no">{error}</p>}

        <p className="font-body text-[12px] italic text-ink-soft">
          Install the <span className="font-mono not-italic">vestige-foundry</span> module in your
          world, paste both values into its settings, then use{" "}
          <em>Send to Vestige</em> on a character sheet. Sheet and artwork travel together — no
          export file, and no folder to find. Characters arrive here; put each one in a campaign
          below.
        </p>
      </div>
    </details>
  );
}

function IconButton({
  onClick,
  label,
  done,
}: {
  onClick: () => void;
  label: string;
  done: boolean;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-label={label}
      title={label}
      className="flex h-9 w-9 shrink-0 items-center justify-center rounded-md border border-hairline text-ink-soft transition hover:text-ink"
    >
      {done ? <Check size={15} className="text-vote-yes" /> : <Copy size={15} />}
    </button>
  );
}
