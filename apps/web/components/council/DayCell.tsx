"use client";

import { useState } from "react";
import { Check, Minus, Plus, Swords, VenetianMask, X } from "lucide-react";
import type { CalendarDay } from "@/lib/calendar/calendar";
import type { Vote, VoteValue } from "@/lib/calendar/types";
import { cn } from "@/lib/calendar/utils";
import { WaxSeal } from "./WaxSeal";

type Props = {
  day: CalendarDay;
  votes: Vote[];
  myUserId: string | null;
  dmUserIds: string[];
  isBestDay: boolean;
  isViableWeekday: boolean;
  /** userId → character name, for the hover tooltip. */
  nameByUserId: Record<string, string>;
  onCycle: (date: string) => void;
  /** Whether this date is marked as a game session. */
  isSession?: boolean;
  /** Creator can stamp / unstamp session days. */
  isCreator?: boolean;
  onToggleSession?: (iso: string) => void;
  /** Names of OTHER campaigns with a play-date on this day (the user is booked). */
  conflictCampaigns?: string[];
  /** The user's votes in OTHER campaigns (only when the align overlay is on). */
  alignVotes?: { value: VoteValue; campaignName: string }[];
  /** Whether to show the yes/maybe/no tallies and per-member tooltip breakdown.
   *  When false, only the viewer's own vote (via the tile's tint) is visible. */
  showVotes?: boolean;
};

function nextVoteValue(current: VoteValue | undefined): VoteValue | null {
  if (current === "yes") return "maybe";
  if (current === "maybe") return "no";
  if (current === "no") return null;
  return "yes";
}

export function DayCell({
  day,
  votes,
  myUserId,
  dmUserIds,
  isBestDay,
  isViableWeekday,
  nameByUserId,
  onCycle,
  isSession = false,
  isCreator = false,
  onToggleSession,
  conflictCampaigns,
  alignVotes,
  showVotes = true,
}: Props) {
  const hasConflict = !!conflictCampaigns?.length;
  // Cross-campaign vote dots are votes too — dropped on past days along
  // with the tallies (conflict swords stay: a booked session is a fact,
  // not a scheduling signal).
  const hasAlign = !day.isPast && !!alignVotes?.length;
  // Tooltip: every member, name coloured by their vote; non-voters greyed.
  const voteByUserId = new Map(votes.map((v) => [v.userId, v.value]));
  const rank: Record<string, number> = { yes: 0, maybe: 1, no: 2 };
  const tooltipRows = Object.entries(nameByUserId)
    .map(([id, name]) => ({ name, value: voteByUserId.get(id) }))
    .sort(
      (a, b) =>
        (a.value ? rank[a.value] : 3) - (b.value ? rank[b.value] : 3),
    );
  const voteColor = (value: VoteValue | undefined) =>
    value === "yes"
      ? "text-vote-yes"
      : value === "maybe"
        ? "text-vote-maybe"
        : value === "no"
          ? "text-vote-no"
          : "text-ink-soft/45";
  const myVote = myUserId
    ? (votes.find((v) => v.userId === myUserId)?.value as VoteValue | undefined)
    : undefined;
  const dmFree =
    !day.isPast &&
    dmUserIds.length > 0 &&
    dmUserIds.every((id) =>
      votes.some((v) => v.userId === id && v.value === "yes"),
    );

  const yesCount = votes.filter((v) => v.value === "yes").length;
  const maybeCount = votes.filter((v) => v.value === "maybe").length;
  const noCount = votes.filter((v) => v.value === "no").length;

  const interactive =
    day.inCurrentMonth && isViableWeekday && !day.isPast && !!myUserId;
  // Votes are scheduling signals — once the day has passed they're noise,
  // so past days drop their tallies and hover breakdown entirely.
  const votesVisible = showVotes && !day.isPast;
  // In-month days that can never be voted on: past days and non-viable
  // weekdays. Rendered de-emphasised (no border, low opacity).
  const isDisabled = day.inCurrentMonth && (day.isPast || !isViableWeekday);

  const [cursor, setCursor] = useState<{ x: number; y: number } | null>(null);
  // Per-click pulse ring in the colour of the vote the click switches TO —
  // keyed on a counter so rapid cycling re-fires the animation every time.
  const [pop, setPop] = useState<{ key: number; color: string } | null>(null);

  function cycle() {
    if (!interactive) return;
    const next = nextVoteValue(myVote);
    const color =
      next === "yes"
        ? "var(--vote-yes)"
        : next === "maybe"
          ? "var(--vote-maybe)"
          : next === "no"
            ? "var(--vote-no)"
            : "var(--ink-soft)";
    setPop((p) => ({ key: (p?.key ?? 0) + 1, color }));
    onCycle(day.iso);
  }

  // Tinted background derived from user's own vote. Solid (opaque) beige
  // blends so the tile keeps its parchment color and just gains a subtle
  // green/yellow/red tint — never going transparent.
  // Tints are mixed from the themed vote/surface tokens (not fixed hexes) so
  // they stay opaque and legible under every theme — a soft tint on the light
  // themes, a subtle one on the dark themes.
  // Past days show as plain/disabled, same as non-viable weekdays — voting
  // is closed by then, so there's no reason to keep surfacing what you
  // voted (or didn't) once the date can't change.
  const bgTint = !day.inCurrentMonth
    ? "bg-transparent"
    : !isViableWeekday || day.isPast
      ? "bg-surface"
      : myVote === "yes"
        ? "bg-[color-mix(in_srgb,var(--vote-yes)_22%,var(--surface))]"
        : myVote === "no"
          ? "bg-[color-mix(in_srgb,var(--vote-no)_22%,var(--surface))]"
          : myVote === "maybe"
            ? "bg-[color-mix(in_srgb,var(--vote-maybe)_24%,var(--surface))]"
            : "bg-surface";

  return (
    <div
      className="group relative h-full"
      onMouseMove={(e) => setCursor({ x: e.clientX, y: e.clientY })}
      onMouseLeave={() => setCursor(null)}
    >
    <button
      type="button"
      onClick={cycle}
      disabled={!interactive}
      className={cn(
        "relative flex h-full min-h-[70px] w-full flex-col rounded-md border p-1.5 text-left transition lg:min-h-[78px]",
        bgTint,
        // Disabled days (past or non-viable) recede hard — no card border and
        // low opacity — so they don't read as tappable. Opacity composites
        // toward the page background, so it works in every theme (a colour-mix
        // tint flips direction between light and dark themes).
        isDisabled
          ? "cursor-not-allowed border-transparent opacity-40"
          : day.inCurrentMonth
            ? "border-hairline"
            : "border-transparent opacity-40",
        // Press-down squish (springs back via the button's transition) —
        // instant physical feedback before the tint/ring even land.
        // color-mix, not /N modifiers — opacity modifiers on our var()
        // colors compile to no CSS, so hover/best-day fell back to defaults.
        interactive &&
          "hover:border-[color-mix(in_srgb,var(--ink)_40%,var(--surface))] cursor-pointer active:scale-[0.96]",
        isBestDay &&
          "border-[color-mix(in_srgb,var(--dm-gold)_80%,var(--surface))] ring-1 ring-[color-mix(in_srgb,var(--dm-gold)_40%,var(--surface))]",
        // Today gets a wine frame + the edge tag below — last in the list so
        // tailwind-merge lets it win over the hairline/disabled borders (and
        // over Best day's gold, which keeps its ring).
        day.isToday && "border-2 border-wine",
      )}
      aria-label={
        interactive
          ? `Cycle vote for ${day.iso}, currently ${myVote ?? "none"}`
          : day.iso
      }
    >
      <div className="flex items-start justify-between">
        <div className="flex flex-wrap items-baseline gap-1">
          <span
            className={cn(
              "font-display text-sm leading-none",
              day.isToday && "text-wine font-bold",
            )}
          >
            {day.dayOfMonth}
          </span>
          {isBestDay && (
            <span className="ml-1 hidden rounded-sm bg-dm-gold px-1 py-0.5 text-[9px] font-display tracking-wider uppercase text-parchment shadow-sm sm:inline-block">
              Best day
            </span>
          )}
        </div>
        {day.inCurrentMonth && (hasAlign || hasConflict || dmFree) && (
          <div className="flex items-center gap-1">
            {hasAlign && (
              <span className="inline-flex items-center gap-0.5">
                {alignVotes!.slice(0, 3).map((av, i) => (
                  <span
                    key={i}
                    className={cn(
                      // ring-surface (not white) — the ring's job is only to
                      // separate adjacent pips from the tile tint, so it must
                      // match the theme's tile color, not hardcode white.
                      "h-1.5 w-1.5 rounded-full ring-1 ring-surface",
                      av.value === "yes"
                        ? "bg-vote-yes"
                        : av.value === "maybe"
                          ? "bg-vote-maybe"
                          : "bg-vote-no",
                    )}
                  />
                ))}
              </span>
            )}
            {hasConflict && (
              <span className="inline-flex" aria-label="Booked in another campaign">
                <Swords className="h-3 w-3 text-wine" />
              </span>
            )}
            {dmFree && (
              <span
                aria-label="The Dungeon Master is available this day"
                className="inline-flex"
              >
                <VenetianMask className="h-3 w-3 text-dm-gold" />
              </span>
            )}
          </div>
        )}
      </div>

      {/* min-h reserves the badge row's height regardless of whether any
          badges are actually showVotes-visible, so toggling "hide party
          votes" never changes the tile's (and therefore the whole grid
          row's) height. */}
      <div
        className={cn(
          "mt-auto flex min-h-[18px] flex-wrap gap-1 pt-1.5",
          isSession && "pr-7",
        )}
      >
        {votesVisible && yesCount > 0 && (
          <span className="inline-flex items-center gap-0.5 rounded px-1 py-0.5 font-display text-[10px] font-bold leading-none" style={{background:"#c8d8c0",color:"#1e3a28"}}>
            <Check className="h-2.5 w-2.5" strokeWidth={3} />
            {yesCount}
          </span>
        )}
        {votesVisible && maybeCount > 0 && (
          <span className="inline-flex items-center gap-0.5 rounded px-1 py-0.5 font-display text-[10px] font-bold leading-none" style={{background:"#e8d8a8",color:"#5a4010"}}>
            <Minus className="h-2.5 w-2.5" strokeWidth={3} />
            {maybeCount}
          </span>
        )}
        {votesVisible && noCount > 0 && (
          <span className="inline-flex items-center gap-0.5 rounded px-1 py-0.5 font-display text-[10px] font-bold leading-none" style={{background:"#e8c0c0",color:"#5a1820"}}>
            <X className="h-2.5 w-2.5" strokeWidth={3} />
            {noCount}
          </span>
        )}
      </div>

      {pop && (
        <span
          key={pop.key}
          aria-hidden
          className="vote-pop-ring pointer-events-none absolute inset-0 rounded-md"
          style={{ "--pop-color": pop.color } as React.CSSProperties}
        />
      )}
    </button>

      {/* "Today" tag straddling the tile's top border (option B). Outside
          the button so the press squish doesn't drag it along. */}
      {day.isToday && (
        <span className="pointer-events-none absolute left-1.5 top-0 z-10 -translate-y-1/2 rounded bg-wine px-1.5 py-px font-display text-[9px] font-semibold uppercase tracking-[0.1em] text-white">
          Today
        </span>
      )}

      {/* Session crest medallion. Owners can click it to remove the session
          (an × fades in over the coin on hover); everyone else just sees it. */}
      {isSession && day.inCurrentMonth &&
        (isCreator && onToggleSession ? (
          <button
            type="button"
            onClick={() => onToggleSession(day.iso)}
            className="group/seal absolute bottom-1 right-1 z-20 inline-flex items-center justify-center rounded-full"
            aria-label={`Remove game session on ${day.iso}`}
            title="Click to remove this session"
          >
            <WaxSeal played={day.isPast} />
            <span className="pointer-events-none absolute inset-[4px] inline-flex items-center justify-center rounded-full bg-black/50 opacity-0 transition group-hover/seal:opacity-100">
              <X className="h-3.5 w-3.5 text-white" strokeWidth={2.75} />
            </span>
          </button>
        ) : (
          <div className="pointer-events-none absolute bottom-1 right-1 z-10">
            <WaxSeal played={day.isPast} />
          </div>
        ))}

      {/* Owner control: stamp a new session (faint seal + on hover) */}
      {isCreator && onToggleSession && !isSession && day.inCurrentMonth && (
        <button
          type="button"
          onClick={() => onToggleSession(day.iso)}
          className="absolute bottom-1 right-1 z-20 inline-flex h-[26px] w-[26px] items-center justify-center rounded-full border border-dashed border-dm-gold/70 bg-dm-gold/15 text-dm-gold opacity-0 transition hover:bg-dm-gold/25 group-hover:opacity-100"
          aria-label={`Mark ${day.iso} as a game session`}
          title="Mark as game session"
        >
          <Plus className="h-3.5 w-3.5" strokeWidth={2.5} />
        </button>
      )}

      {day.inCurrentMonth &&
        cursor &&
        (hasConflict || hasAlign || (votesVisible && isViableWeekday && tooltipRows.length > 0)) && (
          <div
            className="pointer-events-none fixed z-50 w-max max-w-[220px] rounded-md border border-hairline bg-surface px-3 py-2 text-left shadow-parchment"
            style={{ left: cursor.x + 14, top: cursor.y + 14 }}
          >
            {hasConflict && (
              <div className="mb-1">
                <div className="flex items-center gap-1 text-[11px] font-bold text-wine">
                  <Swords className="h-3 w-3" />
                  Booked elsewhere
                </div>
                {conflictCampaigns!.map((c) => (
                  <div key={c} className="pl-4 text-[11px] leading-snug text-ink-soft">
                    {c}
                  </div>
                ))}
              </div>
            )}

            {hasAlign && (
              <div className={cn("mb-1", hasConflict && "border-t border-hairline pt-1")}>
                <div className="text-[11px] font-bold text-ink">Your other campaigns</div>
                {alignVotes!.map((av, i) => (
                  <div
                    key={i}
                    className={cn(
                      "flex items-center gap-1.5 text-[11px] leading-snug",
                      voteColor(av.value),
                    )}
                  >
                    <span
                      className={cn(
                        "h-1.5 w-1.5 shrink-0 rounded-full",
                        av.value === "yes"
                          ? "bg-vote-yes"
                          : av.value === "maybe"
                            ? "bg-vote-maybe"
                            : "bg-vote-no",
                      )}
                    />
                    {av.campaignName} · {av.value}
                  </div>
                ))}
              </div>
            )}

            {votesVisible && isViableWeekday && tooltipRows.length > 0 && (
              <div
                className={cn(
                  (hasConflict || hasAlign) && "border-t border-hairline pt-1",
                )}
              >
                {tooltipRows.map((r) => (
                  <div
                    key={r.name}
                    className={cn(
                      "flex items-center gap-1.5 text-[11px] leading-snug",
                      voteColor(r.value),
                    )}
                  >
                    <span
                      className={cn(
                        "h-1.5 w-1.5 shrink-0 rounded-full",
                        r.value === "yes"
                          ? "bg-vote-yes"
                          : r.value === "maybe"
                            ? "bg-vote-maybe"
                            : r.value === "no"
                              ? "bg-vote-no"
                              : "bg-ink-soft/40",
                      )}
                    />
                    {r.name}
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
    </div>
  );
}
