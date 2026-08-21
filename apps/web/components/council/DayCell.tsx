"use client";

import { useRef, useState } from "react";
import { Check, Minus, Swords, VenetianMask, X } from "lucide-react";
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
  onCycle: (date: string) => void;
  /** Whether this date is marked as a game session. Shown as a passive
   *  medallion regardless of mode — marking/unmarking one happens through
   *  the tap itself once `setDatesMode` is on, not a separate control. */
  isSession?: boolean;
  /** Owner-only mode, set from a toggle above the grid: while on, tapping a
   *  day marks/unmarks a session instead of cycling a vote. Replaces the
   *  small corner button this cell used to carry for the same job — that
   *  button sat right on top of the vote button it shared the tile with,
   *  which on a touch target this size was an easy thing to mis-tap. */
  setDatesMode?: boolean;
  onToggleSession?: (iso: string) => void;
  /** Names of OTHER campaigns with a play-date on this day (the user is booked). */
  conflictCampaigns?: string[];
  /** The user's votes in OTHER campaigns (only when the align overlay is on). */
  alignVotes?: { value: VoteValue; campaignName: string }[];
  /** Whether to show the yes/maybe/no tallies (the full breakdown now lives
   *  in the long-press detail sheet, not a hover tooltip on the tile). */
  showVotes?: boolean;
  /** Long-press (or press-and-hold with a mouse) opens the shared detail
   *  sheet for this day — one sheet for the whole calendar, owned by the
   *  parent, rather than a per-tile popover. A per-tile popover driven by
   *  hover is what used to get stuck open on mobile: touch fires the hover
   *  events that open it but never the one that closes it. */
  onLongPress?: (iso: string) => void;
};

function nextVoteValue(current: VoteValue | undefined): VoteValue | null {
  if (current === "yes") return "maybe";
  if (current === "maybe") return "no";
  if (current === "no") return null;
  return "yes";
}

/** How long a press has to hold before it counts as "long", not "tap". */
const LONG_PRESS_MS = 450;
/** Movement past this radius (px) cancels a long-press in progress — a drag
 *  (scrolling, the month swipe) was never trying to press-and-hold. */
const LONG_PRESS_CANCEL_PX = 10;

export function DayCell({
  day,
  votes,
  myUserId,
  dmUserIds,
  isBestDay,
  isViableWeekday,
  onCycle,
  isSession = false,
  setDatesMode = false,
  onToggleSession,
  conflictCampaigns,
  alignVotes,
  showVotes = true,
  onLongPress,
}: Props) {
  const hasConflict = !!conflictCampaigns?.length;
  const hasAlign = !day.isPast && !!alignVotes?.length;
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

  const canVote = day.inCurrentMonth && isViableWeekday && !day.isPast && !!myUserId;
  // Marking a session was always available for any in-month day (past ones
  // included — a DM backfilling what already happened is a real case), so
  // this keeps that same reach rather than narrowing it to votable days.
  const canSetDate = day.inCurrentMonth;
  const interactive = setDatesMode ? canSetDate : canVote;
  const votesVisible = showVotes && !day.isPast;
  const isDisabled = day.inCurrentMonth && (day.isPast || !isViableWeekday);

  // Per-click pulse ring in the colour of the vote the click switches TO —
  // keyed on a counter so rapid cycling re-fires the animation every time.
  const [pop, setPop] = useState<{ key: number; color: string } | null>(null);

  // Long-press bookkeeping. Refs, not state — nothing here should ever
  // trigger a re-render on its own; it only ever feeds a single boolean
  // read at release time.
  const pressTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const pressStart = useRef<{ x: number; y: number } | null>(null);
  const longPressFired = useRef(false);

  function clearPressTimer() {
    if (pressTimer.current) clearTimeout(pressTimer.current);
    pressTimer.current = null;
  }

  function onPointerDown(e: React.PointerEvent) {
    if (!onLongPress) return;
    pressStart.current = { x: e.clientX, y: e.clientY };
    longPressFired.current = false;
    clearPressTimer();
    pressTimer.current = setTimeout(() => {
      longPressFired.current = true;
      onLongPress(day.iso);
    }, LONG_PRESS_MS);
  }
  function onPointerMove(e: React.PointerEvent) {
    if (!pressStart.current) return;
    const dx = e.clientX - pressStart.current.x;
    const dy = e.clientY - pressStart.current.y;
    if (Math.hypot(dx, dy) > LONG_PRESS_CANCEL_PX) clearPressTimer();
  }
  function onPointerUp() {
    clearPressTimer();
  }
  function onPointerLeave() {
    clearPressTimer();
  }

  function handleTap() {
    // A long-press that already fired also completes as a click once the
    // finger/button lifts — swallow that one click rather than also voting
    // or marking a date on top of the sheet it just opened.
    if (longPressFired.current) {
      longPressFired.current = false;
      return;
    }
    if (setDatesMode) {
      if (canSetDate) onToggleSession?.(day.iso);
      return;
    }
    if (!canVote) return;
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
    <div className="group relative h-full">
      <button
        type="button"
        onClick={handleTap}
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={onPointerUp}
        onPointerLeave={onPointerLeave}
        onContextMenu={(e) => {
          // The browser's own "hold to get a context menu / callout" would
          // otherwise fire alongside — and sometimes instead of — our own
          // long-press on mobile.
          if (onLongPress) e.preventDefault();
        }}
        disabled={!interactive}
        className={cn(
          "relative flex h-full min-h-[70px] w-full select-none flex-col rounded-md border p-1.5 text-left transition lg:min-h-[78px]",
          bgTint,
          // Disabled days (past or non-viable) recede hard — no card border and
          // low opacity — so they don't read as tappable. Opacity composites
          // toward the page background, so it works in every theme (a colour-mix
          // tint flips direction between light and dark themes).
          isDisabled && !setDatesMode
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
          // "Set play dates" is a different mode for the whole grid, not
          // just this tile — the gold wash is what tells the owner tapping
          // means something else right now, without having to remember it.
          setDatesMode &&
            day.inCurrentMonth &&
            "border-[color-mix(in_srgb,var(--dm-gold)_55%,var(--surface))] bg-[color-mix(in_srgb,var(--dm-gold)_9%,var(--surface))]",
        )}
        aria-label={
          setDatesMode
            ? canSetDate
              ? `${isSession ? "Remove" : "Mark"} game session on ${day.iso}`
              : day.iso
            : interactive
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
            // De-emphasised, not hidden — the owner picking a date still
            // benefits from seeing who's free, just shouldn't read it as
            // "this is what tapping does right now."
            setDatesMode && "opacity-70",
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

      {/* Session medallion — purely informational now, on every day it
          applies to, for every viewer. Marking/unmarking one is a mode
          (the toggle above the grid), not a control living on the tile
          itself, so there's nothing here to compete with the tap target
          underneath it for touch. */}
      {isSession && day.inCurrentMonth && (
        <div className="pointer-events-none absolute bottom-1 right-1 z-10">
          <WaxSeal played={day.isPast} />
        </div>
      )}
    </div>
  );
}
