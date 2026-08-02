"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { UserRound } from "lucide-react";
import type { CampaignPlayer } from "@/lib/journal/data";
import { assignSheetPlayer } from "@/app/characters/c/[campaignId]/actions";

/**
 * Who plays this character.
 *
 * The sheet arrives from Foundry knowing its campaign and nothing about
 * people — the module authenticates with a campaign token, and Foundry's own
 * ownership is per-install, not per-Vestige-account. So the DM says, and
 * everyone else reads.
 */
export function SheetPlayerSelect({
  campaignId,
  sheetId,
  players,
  playerId,
  canEdit,
}: {
  campaignId: string;
  sheetId: string;
  players: CampaignPlayer[];
  playerId: string | null;
  canEdit: boolean;
}) {
  const router = useRouter();
  const [value, setValue] = useState(playerId ?? "");
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  const named = players.find((p) => p.userId === value);

  if (!canEdit) {
    // Nothing allocated and nothing the reader can do about it — better to
    // show no line at all than an empty label.
    if (!named) return null;
    return (
      <p className="flex items-center gap-2 font-body text-[13px] text-muted">
        <UserRound size={14} />
        Played by {named.characterName}
      </p>
    );
  }

  function onChange(next: string) {
    const previous = value;
    setValue(next);
    setError(null);
    startTransition(async () => {
      const result = await assignSheetPlayer(campaignId, sheetId, next || null);
      if (!result.ok) {
        setValue(previous); // put the control back to the truth
        setError(result.error);
        return;
      }
      router.refresh();
    });
  }

  return (
    <div className="flex flex-col gap-1">
      <label className="flex flex-wrap items-center gap-2">
        <span className="flex items-center gap-2 font-body text-[13px] text-muted">
          <UserRound size={14} />
          Played by
        </span>
        <select
          value={value}
          disabled={pending}
          onChange={(e) => onChange(e.target.value)}
          className="rounded-md border border-hairline bg-surface px-2 py-1.5 font-body text-[13px] text-ink disabled:opacity-60"
        >
          <option value="">Unallocated</option>
          {players.map((p) => (
            <option key={p.userId} value={p.userId}>
              {p.characterName}
              {p.isDm ? " (DM)" : ""}
            </option>
          ))}
        </select>
      </label>
      {error && <p className="font-body text-[12px] text-vote-no">{error}</p>}
    </div>
  );
}
