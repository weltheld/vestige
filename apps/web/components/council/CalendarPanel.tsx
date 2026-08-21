"use client";

import { useMemo, useRef, useState } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";
import {
  buildMonthGrid,
  defaultMonth,
  monthLabel,
  nextMonth,
  prevMonth,
} from "@/lib/calendar/calendar";
import type { CalendarDay } from "@/lib/calendar/calendar";
import type { Vote, VoteValue, Weekday } from "@/lib/calendar/types";
import { cn } from "@/lib/calendar/utils";
import { DayCell } from "./DayCell";
import { DayDetailSheet } from "./DayDetailSheet";

const WEEKDAYS = ["MON", "TUE", "WED", "THU", "FRI", "SAT", "SUN"];

type Props = {
  dmUserIds: string[];
  myUserId: string | null;
  nameByUserId: Record<string, string>;
  votes: Vote[];
  viableWeekdays: Weekday[];
  onCycleDay: (date: string, currentValue: VoteValue | undefined) => void;
  /** Optional callback so the parent can also know the best day (for the sidebar). */
  onBestDayChange?: (iso: string | null) => void;
  /** Expose current month days so parent can render QuickFillBar externally. */
  onDaysChange?: (days: CalendarDay[]) => void;
  onMonthChange?: (year: number, monthIndex: number) => void;
  initialMonth?: { year: number; monthIndex: number };
  isCreator?: boolean;
  /** Optional content rendered directly below the month header (e.g. quick fill on mobile). */
  belowHeader?: React.ReactNode;
  /** ISO dates marked as game sessions. */
  sessionDates?: Set<string>;
  /** Creator-only: toggle a date's session mark. */
  onToggleSession?: (iso: string) => void;
  /** date → names of OTHER campaigns with a play-date that day. */
  conflictByDate?: Map<string, string[]>;
  /** date → the user's votes in OTHER campaigns. */
  alignByDate?: Map<string, { value: VoteValue; campaignName: string }[]>;
  /** Whether the align overlay is active. */
  showAlign?: boolean;
  /** Whether to show yes/maybe/no tallies on each tile (the full breakdown
   *  lives in the long-press detail sheet regardless of this). */
  showVotes?: boolean;
};

export function CalendarPanel({
  dmUserIds,
  myUserId,
  nameByUserId,
  votes,
  viableWeekdays,
  onCycleDay,
  onBestDayChange,
  onDaysChange,
  onMonthChange,
  initialMonth,
  isCreator,
  belowHeader,
  sessionDates,
  onToggleSession,
  conflictByDate,
  alignByDate,
  showAlign,
  showVotes = true,
}: Props) {
  const start = initialMonth ?? defaultMonth();
  const [{ year, monthIndex }, setMonth] = useState(start);

  const days = useMemo(
    () => buildMonthGrid(year, monthIndex),
    [year, monthIndex],
  );
  const monthVotes = useMemo(() => {
    const byDate: Record<string, Vote[]> = {};
    for (const d of days) byDate[d.iso] = [];
    for (const v of votes) if (byDate[v.date]) byDate[v.date].push(v);
    return byDate;
  }, [days, votes]);

  const viableSet = useMemo(() => new Set(viableWeekdays), [viableWeekdays]);

  // The best day is the NEAREST upcoming viable day where the whole party
  // has voted and nobody voted no — full attendance is certain, so the
  // first such date wins (not the one with the most yes votes).
  const bestDayIso = useMemo(() => {
    const memberIds = Object.keys(nameByUserId);
    if (memberIds.length === 0) return null;
    for (const d of days) {
      if (!d.inCurrentMonth || d.isPast || !viableSet.has(d.weekday as Weekday)) continue;
      const dayVotes = monthVotes[d.iso] ?? [];
      const everyoneVoted = memberIds.every((id) => dayVotes.some((v) => v.userId === id));
      if (!everyoneVoted) continue;
      if (dayVotes.some((v) => v.value === "no")) continue;
      return d.iso; // days are chronological — first match is the nearest
    }
    return null;
  }, [days, monthVotes, nameByUserId, viableSet]);

  // Surface best-day and current days to parent.
  const lastReportedRef = useMemo(() => ({ bestDay: null as string | null, days: null as CalendarDay[] | null }), []);
  if (onBestDayChange && lastReportedRef.bestDay !== bestDayIso) {
    lastReportedRef.bestDay = bestDayIso;
    queueMicrotask(() => onBestDayChange(bestDayIso));
  }
  if (onDaysChange && lastReportedRef.days !== days) {
    lastReportedRef.days = days;
    queueMicrotask(() => onDaysChange(days));
  }

  // Direction of the last month change — drives the slide-in animation
  // (grid slides from the side you're navigating toward). null on first
  // render so the initial mount doesn't animate.
  const [slideDir, setSlideDir] = useState<-1 | 1 | null>(null);

  // Fully past months are gone — scheduling starts at the current month,
  // so back-navigation stops there (arrows and swipe alike).
  const min = defaultMonth();
  const atMinMonth =
    year < min.year || (year === min.year && monthIndex <= min.monthIndex);

  function go(delta: -1 | 1) {
    if (delta === -1 && atMinMonth) return;
    const m = delta === -1 ? prevMonth(year, monthIndex) : nextMonth(year, monthIndex);
    setSlideDir(delta);
    setMonth(m);
    onMonthChange?.(m.year, m.monthIndex);
  }

  // Horizontal swipe on the grid switches months (mobile/tablet — but it
  // works with any touch input). Mostly-horizontal + a minimum distance so
  // vertical scrolling and taps never trigger it.
  const touchStart = useRef<{ x: number; y: number } | null>(null);
  function onTouchStart(e: React.TouchEvent) {
    const t = e.touches[0];
    touchStart.current = { x: t.clientX, y: t.clientY };
  }
  function onTouchEnd(e: React.TouchEvent) {
    const start = touchStart.current;
    touchStart.current = null;
    if (!start) return;
    const t = e.changedTouches[0];
    const dx = t.clientX - start.x;
    const dy = t.clientY - start.y;
    if (Math.abs(dx) < 48 || Math.abs(dx) < Math.abs(dy) * 1.5) return;
    // Swipe left = forward (next month), swipe right = back.
    go(dx < 0 ? 1 : -1);
  }

  // Owner-only: while on, tapping a day marks/unmarks a session instead of
  // voting — replaces the small per-tile corner button that used to share
  // the tile with the (much bigger) vote button, which is what made it easy
  // to mis-tap on a touch screen.
  const [setDatesMode, setSetDatesMode] = useState(false);
  const canSetDates = isCreator && !!onToggleSession;

  // The one open detail sheet for the whole grid, keyed by iso rather than
  // living inside each DayCell — a per-tile popover was the other mobile
  // bug: hover-driven, so touch could open one but never fire the event
  // that closes it, and nothing stopped five different days from ending up
  // stuck open at once.
  const [openDetailIso, setOpenDetailIso] = useState<string | null>(null);
  const openDay = days.find((d) => d.iso === openDetailIso) ?? null;

  return (
    <section className="flex h-full flex-col gap-3 p-4 sm:p-5">
      {/* Desktop header: month nav (poll settings now lives in the sidebar). */}
      <div className="hidden flex-wrap items-center gap-x-4 gap-y-2 lg:flex">
        <button
          aria-label="Previous month"
          onClick={() => go(-1)}
          disabled={atMinMonth}
          className="inline-flex h-9 w-9 items-center justify-center rounded-md border border-hairline bg-surface shadow-sm hover:bg-parchment disabled:cursor-not-allowed disabled:opacity-30 disabled:hover:bg-surface"
        >
          <ChevronLeft className="h-4 w-4" />
        </button>
        <h2 className="font-display text-2xl text-ink">{monthLabel(year, monthIndex)}</h2>
        <button
          aria-label="Next month"
          onClick={() => go(1)}
          className="inline-flex h-9 w-9 items-center justify-center rounded-md border border-hairline bg-surface shadow-sm hover:bg-parchment"
        >
          <ChevronRight className="h-4 w-4" />
        </button>
      </div>

      {/* Mobile/tablet header: arrows pinned to the screen edges with the
          month centered between them (poll settings lives in the profile menu). */}
      <div className="lg:hidden">
        <div className="flex items-center justify-between">
          <button
            aria-label="Previous month"
            onClick={() => go(-1)}
            disabled={atMinMonth}
            className="inline-flex h-9 w-9 items-center justify-center rounded-md border border-hairline bg-surface shadow-sm hover:bg-parchment disabled:cursor-not-allowed disabled:opacity-30 disabled:hover:bg-surface"
          >
            <ChevronLeft className="h-4 w-4" />
          </button>
          <h2 className="font-display text-xl text-ink">{monthLabel(year, monthIndex)}</h2>
          <button
            aria-label="Next month"
            onClick={() => go(1)}
            className="inline-flex h-9 w-9 items-center justify-center rounded-md border border-hairline bg-surface shadow-sm hover:bg-parchment"
          >
            <ChevronRight className="h-4 w-4" />
          </button>
        </div>
      </div>

      {canSetDates && (
        <button
          type="button"
          onClick={() => setSetDatesMode((v) => !v)}
          className={cn(
            "flex items-center justify-between gap-3 rounded-lg border px-3 py-2 text-left transition",
            setDatesMode
              ? "border-dm-gold bg-[color-mix(in_srgb,var(--dm-gold)_12%,var(--cod-soft))]"
              : "border-hairline bg-cod-soft hover:border-dm-gold/60",
          )}
          aria-pressed={setDatesMode}
        >
          <span className="flex flex-col">
            <span className="font-display text-[12px] font-semibold text-ink">
              Set play dates
            </span>
            <span className="font-body text-[10.5px] text-muted">
              {setDatesMode ? "On — tap a day to mark it" : "Owner only — off by default"}
            </span>
          </span>
          <span
            aria-hidden
            className={cn(
              "relative inline-flex h-[19px] w-[34px] shrink-0 rounded-full transition-colors",
              setDatesMode ? "bg-dm-gold" : "bg-hairline",
            )}
          >
            <span
              className={cn(
                "absolute top-[2px] h-[15px] w-[15px] rounded-full bg-surface shadow transition-[left]",
                setDatesMode ? "left-[17px]" : "left-[2px]",
              )}
            />
          </span>
        </button>
      )}

      {belowHeader}

      <div className="grid grid-cols-7 gap-1 text-center small-caps">
        {WEEKDAYS.map((w) => (
          <span key={w}>{w}</span>
        ))}
      </div>

      {/* key on the month so the slide-in animation re-runs on each change.
          touch-action: pan-y stops the browser's own horizontal pan/bounce
          from engaging on this drag — without it, the native overscroll
          rubber-band effect briefly shifts the whole page sideways before
          our JS swap runs, since the page has no horizontal scroll of its
          own to actually pan. */}
      <div
        key={`${year}-${monthIndex}`}
        onTouchStart={onTouchStart}
        onTouchEnd={onTouchEnd}
        style={{ touchAction: "pan-y" }}
        className={`grid flex-1 grid-cols-7 auto-rows-fr gap-1 ${
          slideDir === 1 ? "month-slide-next" : slideDir === -1 ? "month-slide-prev" : ""
        }`}
      >
        {days.map((d) => (
          <DayCell
            key={d.iso}
            day={d}
            votes={monthVotes[d.iso] ?? []}
            myUserId={myUserId}
            dmUserIds={dmUserIds}
            isBestDay={bestDayIso === d.iso}
            isViableWeekday={viableSet.has(d.weekday as Weekday)}
            isSession={sessionDates?.has(d.iso) ?? false}
            setDatesMode={setDatesMode}
            onToggleSession={onToggleSession}
            conflictCampaigns={conflictByDate?.get(d.iso)}
            alignVotes={showAlign ? alignByDate?.get(d.iso) : undefined}
            showVotes={showVotes}
            onLongPress={setOpenDetailIso}
            onCycle={(iso) => {
              const current = (monthVotes[iso] ?? []).find(
                (v) => v.userId === myUserId,
              )?.value as VoteValue | undefined;
              onCycleDay(iso, current);
            }}
          />
        ))}
      </div>

      {openDay && (
        <DayDetailSheet
          day={openDay}
          votes={monthVotes[openDay.iso] ?? []}
          nameByUserId={nameByUserId}
          isSession={sessionDates?.has(openDay.iso) ?? false}
          conflictCampaigns={conflictByDate?.get(openDay.iso)}
          alignVotes={showAlign ? alignByDate?.get(openDay.iso) : undefined}
          showVotes={showVotes}
          onClose={() => setOpenDetailIso(null)}
        />
      )}
    </section>
  );
}
