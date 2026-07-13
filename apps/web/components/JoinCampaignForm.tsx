"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { KeyRound } from "lucide-react";
import { redeemJoinCode } from "@/app/app/actions";

/** Compact join-code redemption, sized to sit next to "Host a new campaign"
 *  in the header row. Error/notice float below so they never reflow the
 *  row they live in. */
export function JoinCampaignForm() {
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
        res.alreadyMember ? `You're already in ${res.campaignName}.` : `Joined ${res.campaignName}!`,
      );
      router.refresh();
    });
  }

  return (
    <div className="relative">
      <form
        onSubmit={onSubmit}
        className="flex h-9 items-center gap-1.5 rounded-md border border-hairline bg-surface pl-2.5 pr-1.5 transition-colors focus-within:border-gold"
      >
        <KeyRound className="h-3.5 w-3.5 shrink-0 text-gold" />
        {/* w-16 on mobile so this form + "Host a new campaign" share one
            row on a 375px screen; the 6-char code still fits. */}
        <input
          value={code}
          onChange={(e) => setCode(e.target.value.toUpperCase())}
          placeholder="Join code"
          maxLength={8}
          className="h-full w-16 bg-transparent font-mono text-xs uppercase tracking-widest text-ink outline-none placeholder:font-body placeholder:text-[11px] placeholder:normal-case placeholder:tracking-normal placeholder:text-muted sm:w-20"
        />
        <button
          type="submit"
          disabled={pending || !code.trim()}
          className="h-6 shrink-0 rounded px-2.5 font-display text-[10px] font-semibold uppercase tracking-wider text-ink-soft transition hover:bg-cod-soft hover:text-ink disabled:opacity-40"
        >
          {pending ? "…" : "Join"}
        </button>
      </form>
      {(error || notice) && (
        <p
          className={`absolute right-0 top-full z-10 mt-1 whitespace-nowrap rounded-md border px-2 py-1 font-body text-[11px] shadow-sm ${
            error
              ? "border-vote-no/40 bg-vote-no/10 text-vote-no"
              : "border-vote-yes/40 bg-vote-yes/10 text-vote-yes"
          }`}
        >
          {error || notice}
        </p>
      )}
    </div>
  );
}
