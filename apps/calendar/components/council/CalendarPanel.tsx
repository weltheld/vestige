"use client";

import { useMemo, useRef, useState } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";
import {
  buildMonthGrid,
  defaultMonth,
  monthLabel,
  nextMonth,
  prevMonth,
} from "@/lib/calendar";
import type { CalendarDay } from "@/lib/calendar";
import type { Vote, VoteValue, Weekday } from "@/lib/types";
import { DayCell } from "./DayCell";

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
  /** Whether to show yes/maybe/no tallies and the per-member tooltip
   *  breakdown on each day (default true). */
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

  const bestDayIso = useMemo(() => {
    let best: { iso: string; yes: number } | null = null;
    for (const d of days) {
      if (!d.inCurrentMonth || !viableSet.has(d.weekday as Weekday)) continue;
      const dayVotes = monthVotes[d.iso] ?? [];
      const dmsFree =
        dmUserIds.length > 0 &&
        dmUserIds.every((id) =>
          dayVotes.some((v) => v.userId === id && v.value === "yes"),
        );
      if (!dmsFree) continue;
      const yes = dayVotes.filter((v) => v.value === "yes").length;
      if (!best || yes > best.yes) best = { iso: d.iso, yes };
    }
    return best?.iso ?? null;
  }, [days, monthVotes, dmUserIds, viableSet]);

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

  function go(delta: -1 | 1) {
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

  return (
    <section className="flex h-full flex-col gap-3 p-4 sm:p-5">
      {/* Desktop header: month nav (poll settings now lives in the sidebar). */}
      <div className="hidden flex-wrap items-center gap-x-4 gap-y-2 lg:flex">
        <button
          aria-label="Previous month"
          onClick={() => go(-1)}
          className="inline-flex h-9 w-9 items-center justify-center rounded-md border border-hairline bg-surface shadow-sm hover:bg-parchment"
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
            className="inline-flex h-9 w-9 items-center justify-center rounded-md border border-hairline bg-surface shadow-sm hover:bg-parchment"
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
            nameByUserId={nameByUserId}
            isBestDay={bestDayIso === d.iso}
            isViableWeekday={viableSet.has(d.weekday as Weekday)}
            isSession={sessionDates?.has(d.iso) ?? false}
            isCreator={isCreator}
            onToggleSession={onToggleSession}
            conflictCampaigns={conflictByDate?.get(d.iso)}
            alignVotes={showAlign ? alignByDate?.get(d.iso) : undefined}
            showVotes={showVotes}
            onCycle={(iso) => {
              const current = (monthVotes[iso] ?? []).find(
                (v) => v.userId === myUserId,
              )?.value as VoteValue | undefined;
              onCycleDay(iso, current);
            }}
          />
        ))}
      </div>
    </section>
  );
}
