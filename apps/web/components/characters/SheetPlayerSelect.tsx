import { UserRound } from "lucide-react";
import type { CampaignPlayer } from "@/lib/journal/data";

/**
 * Whose character this is, as a byline.
 *
 * Read-only for everyone, DM included: allocation happens in the roster
 * table, where the whole party is visible at once, so there is only ever one
 * control that can change it. Absent rather than empty when nobody is
 * allocated — an unallocated sheet is the normal state right after an import,
 * and "Played by —" is noise.
 */
export function SheetPlayerSelect({
  players,
  playerId,
}: {
  players: CampaignPlayer[];
  playerId: string | null;
}) {
  const player = playerId ? players.find((p) => p.userId === playerId) : null;
  if (!player) return null;

  return (
    <p className="flex items-center gap-2 font-body text-[13px] text-muted">
      <UserRound size={14} />
      Played by {player.playerName}
    </p>
  );
}
