"use client";

import { useEffect } from "react";
import { format } from "date-fns";
import { Swords, X } from "lucide-react";
import type { CalendarDay } from "@/lib/calendar/calendar";
import type { Vote, VoteValue } from "@/lib/calendar/types";
import { cn } from "@/lib/calendar/utils";

type Props = {
  day: CalendarDay;
  votes: Vote[];
  nameByUserId: Record<string, string>;
  isSession: boolean;
  conflictCampaigns?: string[];
  alignVotes?: { value: VoteValue; campaignName: string }[];
  showVotes?: boolean;
  onClose: () => void;
};

const RANK: Record<string, number> = { yes: 0, maybe: 1, no: 2 };

function voteDotClass(value: VoteValue | undefined) {
  return value === "yes"
    ? "bg-vote-yes"
    : value === "maybe"
      ? "bg-vote-maybe"
      : value === "no"
        ? "bg-vote-no"
        : "bg-ink-soft/40";
}
function voteTextClass(value: VoteValue | undefined) {
  return value === "yes"
    ? "text-vote-yes"
    : value === "maybe"
      ? "text-vote-maybe"
      : value === "no"
        ? "text-vote-no"
        : "text-ink-soft/45";
}

/**
 * The one detail sheet for the whole calendar — who voted what for a day,
 * plus any cross-campaign conflict/alignment — opened by a long-press on a
 * DayCell and owned by CalendarPanel rather than the cell itself.
 *
 * A fixed panel rather than something anchored to the tile or the pointer:
 * anchoring to touch/cursor position was the previous version's actual bug
 * (see DayCell's own history) — hover set it, hover was supposed to clear
 * it, and touch never reliably fires the second half of that pair. This
 * only ever opens from an explicit long-press and only ever closes from an
 * explicit dismissal, so there's nothing left for a missing event to leave
 * stuck open.
 */
export function DayDetailSheet({
  day,
  votes,
  nameByUserId,
  isSession,
  conflictCampaigns,
  alignVotes,
  showVotes = true,
  onClose,
}: Props) {
  // Esc closes it too, for anyone on a keyboard/mouse who triggered this via
  // press-and-hold rather than touch.
  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") onClose();
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  const voteByUserId = new Map(votes.map((v) => [v.userId, v.value]));
  const rosterRows = Object.entries(nameByUserId)
    .map(([id, name]) => ({ name, value: voteByUserId.get(id) }))
    .sort((a, b) => (a.value ? RANK[a.value] : 3) - (b.value ? RANK[b.value] : 3));

  const hasConflict = !!conflictCampaigns?.length;
  const hasAlign = !day.isPast && !!alignVotes?.length;
  const hasRoster = showVotes && !day.isPast && rosterRows.length > 0;

  return (
    <>
      {/* Backdrop: any tap outside the sheet dismisses it, same as tapping
          the explicit close button. */}
      <button
        type="button"
        aria-label="Close"
        onClick={onClose}
        className="fixed inset-0 z-40 bg-black/20"
      />
      <div
        role="dialog"
        aria-label={`Details for ${format(day.date, "EEEE, MMMM d")}`}
        className="fixed inset-x-3 bottom-3 z-50 mx-auto max-w-sm rounded-2xl border border-hairline bg-surface p-4 shadow-parchment sm:inset-x-auto sm:left-1/2 sm:bottom-8 sm:w-[340px] sm:-translate-x-1/2"
      >
        <div className="mb-3 flex items-center justify-between gap-3">
          <div>
            <p className="font-display text-sm font-semibold text-ink">
              {format(day.date, "EEEE, MMMM d")}
            </p>
            {isSession && (
              <p className="font-body text-[11px] text-dm-gold">Game session</p>
            )}
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close"
            className="rounded-full p-1 text-ink-soft transition hover:bg-cod-soft hover:text-ink"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {hasConflict && (
          <div className="mb-2.5">
            <div className="flex items-center gap-1.5 font-body text-[12px] font-bold text-wine">
              <Swords className="h-3.5 w-3.5" />
              Booked elsewhere
            </div>
            {conflictCampaigns!.map((c) => (
              <div key={c} className="pl-5 font-body text-[12px] leading-snug text-ink-soft">
                {c}
              </div>
            ))}
          </div>
        )}

        {hasAlign && (
          <div className={cn("mb-2.5", hasConflict && "border-t border-hairline pt-2")}>
            <p className="mb-1 font-body text-[12px] font-bold text-ink">Your other campaigns</p>
            {alignVotes!.map((av, i) => (
              <div
                key={i}
                className={cn(
                  "flex items-center gap-1.5 font-body text-[12px] leading-snug",
                  voteTextClass(av.value),
                )}
              >
                <span className={cn("h-1.5 w-1.5 shrink-0 rounded-full", voteDotClass(av.value))} />
                {av.campaignName} · {av.value}
              </div>
            ))}
          </div>
        )}

        {hasRoster ? (
          <div className={cn((hasConflict || hasAlign) && "border-t border-hairline pt-2")}>
            {rosterRows.map((r) => (
              <div
                key={r.name}
                className={cn(
                  "flex items-center gap-1.5 py-0.5 font-body text-[13px] leading-snug",
                  voteTextClass(r.value),
                )}
              >
                <span className={cn("h-1.5 w-1.5 shrink-0 rounded-full", voteDotClass(r.value))} />
                {r.name}
              </div>
            ))}
          </div>
        ) : (
          !hasConflict &&
          !hasAlign && (
            <p className="font-body text-[12px] italic text-muted">
              {day.isPast ? "This day has passed." : "No votes to show yet."}
            </p>
          )
        )}
      </div>
    </>
  );
}
