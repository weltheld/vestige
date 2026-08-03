"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Trash2, UserRound } from "lucide-react";
import { format, parseISO } from "date-fns";
import type { LibraryEntry } from "@/lib/characters/data";
import type { HeaderCampaign } from "@vestige/ui";
import type { CampaignPlayer } from "@/lib/journal/data";
import { characters } from "@/lib/journal/links";
import { deleteLibrarySheet, fileSheetInCampaign } from "@/app/characters/library/actions";
import { assignSheetPlayer } from "@/app/characters/c/[campaignId]/actions";

/**
 * Everything you have pushed from Foundry: which campaign each character is
 * for, and who plays it.
 *
 * Both decisions in one row, because in practice one person makes them at
 * one sitting — the party arrives from a single Foundry world and gets filed
 * and handed out together. The player list follows the chosen campaign, and
 * allocating is refused (with the reason) for a campaign you don't run.
 */
export function LibraryList({
  entries,
  campaigns,
  playersByCampaign,
}: {
  entries: LibraryEntry[];
  campaigns: HeaderCampaign[];
  playersByCampaign: Record<string, CampaignPlayer[]>;
}) {
  const router = useRouter();
  const [filed, setFiled] = useState<Record<string, string>>(
    Object.fromEntries(entries.map((e) => [e.id, e.campaignId ?? ""])),
  );
  const [played, setPlayed] = useState<Record<string, string>>(
    Object.fromEntries(entries.map((e) => [e.id, e.playerId ?? ""])),
  );
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  function onFile(sheetId: string, next: string) {
    const previous = filed[sheetId] ?? "";
    setFiled((f) => ({ ...f, [sheetId]: next }));
    // Moving a character out of a campaign takes its player with it — the
    // server clears the allocation, and the control should agree.
    if (!next) setPlayed((p) => ({ ...p, [sheetId]: "" }));
    setError(null);
    startTransition(async () => {
      const result = await fileSheetInCampaign(sheetId, next || null);
      if (!result.ok) {
        setFiled((f) => ({ ...f, [sheetId]: previous }));
        setError(result.error);
        return;
      }
      router.refresh();
    });
  }

  function onAssign(sheetId: string, campaignId: string, next: string) {
    const previous = played[sheetId] ?? "";
    setPlayed((p) => ({ ...p, [sheetId]: next }));
    setError(null);
    startTransition(async () => {
      const result = await assignSheetPlayer(campaignId, sheetId, next || null);
      if (!result.ok) {
        setPlayed((p) => ({ ...p, [sheetId]: previous }));
        setError(result.error);
        return;
      }
      router.refresh();
    });
  }

  function onDelete(sheetId: string, name: string) {
    if (!window.confirm(`Remove ${name} from Vestige? Pushing it again from Foundry brings it back.`))
      return;
    setError(null);
    startTransition(async () => {
      const result = await deleteLibrarySheet(sheetId);
      if (!result.ok) {
        setError(result.error);
        return;
      }
      router.refresh();
    });
  }

  return (
    <div className="flex flex-col gap-2">
      {entries.map((entry) => {
        const campaignId = filed[entry.id] ?? "";
        const roster = campaignId ? (playersByCampaign[campaignId] ?? []) : [];

        return (
          <div
            key={entry.id}
            className="flex flex-wrap items-center gap-3 rounded-xl border border-hairline bg-cod-soft px-4 py-3"
          >
            {entry.portrait ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={entry.portrait}
                alt=""
                className="h-10 w-10 shrink-0 rounded-md object-cover"
              />
            ) : (
              <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-md bg-surface text-muted">
                <UserRound size={18} />
              </span>
            )}

            <span className="flex min-w-[10rem] flex-1 flex-col">
              {campaignId ? (
                <Link
                  href={characters.sheet(campaignId, entry.id)}
                  className="font-body text-[15px] text-ink transition hover:text-gold"
                >
                  {entry.name}
                </Link>
              ) : (
                <span className="font-body text-[15px] text-ink">{entry.name}</span>
              )}
              <span className="font-body text-[11px] text-muted">
                Updated {format(parseISO(entry.updatedAt), "MMM d, yyyy")}
              </span>
            </span>

            <select
              value={campaignId}
              disabled={pending}
              onChange={(e) => onFile(entry.id, e.target.value)}
              aria-label={`Campaign for ${entry.name}`}
              className="rounded-md border border-hairline bg-surface px-2 py-1.5 font-body text-[13px] text-ink disabled:opacity-60"
            >
              <option value="">Not in a campaign</option>
              {campaigns.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              ))}
            </select>

            {/* Disabled rather than hidden while unfiled: the control staying
                put explains that a campaign comes first. */}
            <select
              value={played[entry.id] ?? ""}
              disabled={pending || !campaignId}
              onChange={(e) => onAssign(entry.id, campaignId, e.target.value)}
              aria-label={`Who plays ${entry.name}`}
              className="rounded-md border border-hairline bg-surface px-2 py-1.5 font-body text-[13px] text-ink disabled:opacity-40"
            >
              <option value="">{campaignId ? "Unallocated" : "No player"}</option>
              {roster.map((p) => (
                <option key={p.userId} value={p.userId}>
                  {p.playerName}
                  {p.isDm ? " (DM)" : ""}
                </option>
              ))}
            </select>

            <button
              type="button"
              onClick={() => onDelete(entry.id, entry.name)}
              disabled={pending}
              aria-label={`Remove ${entry.name}`}
              title={`Remove ${entry.name}`}
              className="flex h-9 w-9 shrink-0 items-center justify-center rounded-md border border-hairline text-ink-soft transition hover:border-vote-no hover:text-vote-no disabled:opacity-50"
            >
              <Trash2 size={15} />
            </button>
          </div>
        );
      })}

      {error && <p className="font-body text-[12px] text-vote-no">{error}</p>}
    </div>
  );
}
