"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import type { CampaignPlayer } from "@/lib/journal/data";
import type { CharacterSummary } from "@/lib/characters/data";
import { characters } from "@/lib/journal/links";
import { assignSheetPlayer } from "@/app/characters/c/[campaignId]/actions";

/**
 * The DM's view of the whole roster: every imported character in the
 * campaign, and who plays it.
 *
 * Allocating one at a time from each character's own sheet meant clicking
 * through the switcher to find the unallocated ones. The table is the shape
 * the job actually has — the party arrives from Foundry in one push, and gets
 * handed out in one sitting.
 *
 * Rendered inside the header menu's dialog rather than on the page: it is a
 * job the DM does once after an import, and it was taking up the top of a
 * page everyone else only reads.
 */
export function CharacterAllocationTable({
  campaignId,
  roster,
  players,
  allocations,
}: {
  campaignId: string;
  roster: CharacterSummary[];
  players: CampaignPlayer[];
  allocations: Record<string, string>;
}) {
  const router = useRouter();
  const [values, setValues] = useState<Record<string, string>>(allocations);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  if (roster.length === 0) return null;

  function onChange(sheetId: string, next: string) {
    const previous = values[sheetId] ?? "";
    setValues((v) => ({ ...v, [sheetId]: next }));
    setError(null);
    startTransition(async () => {
      const result = await assignSheetPlayer(campaignId, sheetId, next || null);
      if (!result.ok) {
        setValues((v) => ({ ...v, [sheetId]: previous }));
        setError(result.error);
        return;
      }
      router.refresh();
    });
  }

  return (
    <div className="flex flex-col gap-2">
      {roster.map((character) => (
        <div
          key={character.id}
          className="flex flex-wrap items-center justify-between gap-3 border-b border-hairline pb-2 last:border-0 last:pb-0"
        >
          <Link
            href={characters.sheet(campaignId, character.id)}
            className="font-body text-[14px] text-ink transition hover:text-gold"
          >
            {character.name}
          </Link>
          <select
            value={values[character.id] ?? ""}
            disabled={pending}
            onChange={(e) => onChange(character.id, e.target.value)}
            aria-label={`Who plays ${character.name}`}
            className="rounded-md border border-hairline bg-surface px-2 py-1.5 font-body text-[13px] text-ink disabled:opacity-60"
          >
            <option value="">Unallocated</option>
            {players.map((p) => (
              <option key={p.userId} value={p.userId}>
                {p.playerName}
                {p.isDm ? " (DM)" : ""}
              </option>
            ))}
          </select>
        </div>
      ))}

      {error && <p className="font-body text-[12px] text-vote-no">{error}</p>}
    </div>
  );
}
