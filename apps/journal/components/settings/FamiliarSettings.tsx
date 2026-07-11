"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { format, parseISO } from "date-fns";
import { Check, Copy, RefreshCw } from "lucide-react";
import type { FamiliarConnection } from "@/lib/familiar";
import { regenerateFamiliarToken } from "@/app/c/[campaignId]/settings/actions";

/** Familiar (recap bot) integration controls — creator only. Shows the
 *  ingest endpoint + per-campaign token to paste into Familiar, plus whether
 *  a recap has ever come through. */
export function FamiliarSettings({
  campaignId,
  connection,
}: {
  campaignId: string;
  connection: FamiliarConnection;
}) {
  const router = useRouter();
  const [token, setToken] = useState(connection.token);
  const [copied, setCopied] = useState<"token" | "url" | null>(null);
  const [pending, startTransition] = useTransition();

  function copy(which: "token" | "url", value: string) {
    navigator.clipboard?.writeText(value);
    setCopied(which);
    window.setTimeout(() => setCopied(null), 1500);
  }

  function regenerate() {
    if (
      !window.confirm(
        "Generate a new token? Any Familiar install using the current token will stop sending recaps until you paste the new one in.",
      )
    )
      return;
    startTransition(async () => {
      const { token: next } = await regenerateFamiliarToken(campaignId);
      setToken(next);
      router.refresh();
    });
  }

  return (
    <div className="flex flex-col gap-3">
      {/* Connection status */}
      <div className="flex items-center gap-2">
        <span
          className="h-2 w-2 shrink-0 rounded-full"
          style={{
            background:
              connection.recapCount > 0
                ? "var(--vote-yes)"
                : connection.verifiedAt
                  ? "var(--gold)"
                  : "var(--muted)",
          }}
        />
        <span className="font-body text-[13px] text-ink">
          {connection.recapCount > 0 ? (
            <>
              Connected — {connection.recapCount}{" "}
              {connection.recapCount === 1 ? "recap" : "recaps"} received
              {connection.lastRecapAt
                ? `, last ${format(parseISO(connection.lastRecapAt), "MMM d, yyyy")}`
                : ""}
              .
            </>
          ) : connection.verifiedAt ? (
            "Verified — Familiar can reach this campaign. Recaps will appear here after your next session."
          ) : (
            "Not connected yet — paste the token below into Familiar to link this campaign."
          )}
        </span>
      </div>

      {/* Ingest endpoint */}
      <label className="flex flex-col gap-1">
        <span className="font-body text-[11px] text-muted">Endpoint URL</span>
        <div className="flex items-center gap-2">
          <input
            readOnly
            value={connection.ingestUrl}
            className="flex-1 rounded-md border border-hairline bg-[color-mix(in_srgb,var(--surface)_80%,var(--parchment))] px-3 py-2 font-mono text-[12px] text-ink"
          />
          <IconButton
            onClick={() => copy("url", connection.ingestUrl)}
            label="Copy endpoint URL"
            done={copied === "url"}
          />
        </div>
      </label>

      {/* Token */}
      <label className="flex flex-col gap-1">
        <span className="font-body text-[11px] text-muted">Ingest token (secret)</span>
        <div className="flex items-center gap-2">
          <input
            readOnly
            value={token}
            className="flex-1 rounded-md border border-hairline bg-[color-mix(in_srgb,var(--surface)_80%,var(--parchment))] px-3 py-2 font-mono text-[12px] text-ink"
          />
          <IconButton onClick={() => copy("token", token)} label="Copy token" done={copied === "token"} />
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

      <p className="font-body text-[12px] italic text-ink-soft">
        In Familiar, set this campaign&rsquo;s recap destination to the endpoint above and paste the
        token as its key. New session recaps then appear here automatically.
      </p>
    </div>
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
