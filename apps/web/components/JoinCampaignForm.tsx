"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { KeyRound } from "lucide-react";
import { redeemJoinCode } from "@/app/app/actions";

/** Lets a signed-in visitor redeem a campaign's join code — the
 *  low-friction counterpart to the creator's magic-link invite. Rendered
 *  both as the empty state's primary action (no campaigns yet) and as a
 *  small standing form for people who already have one but want to join
 *  another. */
export function JoinCampaignForm({ emptyState = false }: { emptyState?: boolean }) {
  const router = useRouter();
  const [code, setCode] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!code.trim()) return;
    setError(null);
    setNotice(null);
    startTransition(async () => {
      const res = await redeemJoinCode(code);
      if (!res.ok) {
        setError(res.error);
        return;
      }
      setCode("");
      setNotice(
        res.alreadyMember
          ? `You're already in ${res.campaignName}.`
          : `Joined ${res.campaignName}!`,
      );
      router.refresh();
    });
  }

  return (
    <div
      className={
        emptyState
          ? "mt-6 flex flex-col items-center gap-3 rounded-xl border border-hairline bg-surface p-8 text-center"
          : "flex flex-col gap-2 rounded-md border border-hairline bg-surface px-4 py-3"
      }
    >
      <p
        className={
          emptyState
            ? "flex items-center gap-2 font-display text-sm font-semibold uppercase tracking-wider text-ink"
            : "flex items-center gap-1.5 font-display text-[11px] font-semibold uppercase tracking-[0.1em] text-muted"
        }
      >
        <KeyRound className={emptyState ? "h-4 w-4 text-gold" : "h-3.5 w-3.5 text-gold"} />
        Have a join code?
      </p>
      {emptyState && (
        <p className="max-w-[36ch] font-body text-[13px] text-ink-soft">
          You don&rsquo;t have any campaigns yet. Ask your DM for their campaign&rsquo;s code and
          enter it here to join.
        </p>
      )}
      <form onSubmit={onSubmit} className="flex items-center gap-2">
        <input
          value={code}
          onChange={(e) => setCode(e.target.value.toUpperCase())}
          placeholder="ABC123"
          maxLength={8}
          className="h-11 w-32 rounded-md border border-hairline bg-[color-mix(in_srgb,var(--surface)_80%,var(--parchment))] px-3 text-center font-mono text-[14px] uppercase tracking-widest text-ink outline-none transition focus:border-gold"
        />
        <button
          type="submit"
          disabled={pending || !code.trim()}
          className="h-11 rounded-lg bg-wine px-5 font-display text-[11px] font-semibold uppercase tracking-[0.08em] text-white transition hover:brightness-110 disabled:opacity-60"
        >
          {pending ? "Joining…" : "Join"}
        </button>
      </form>
      {error && <p className="font-body text-[12px] text-vote-no">{error}</p>}
      {notice && !error && <p className="font-body text-[12px] text-vote-yes">{notice}</p>}
    </div>
  );
}
