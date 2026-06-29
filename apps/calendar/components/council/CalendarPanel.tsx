"use client";

import { useMemo, useState } from "react";
import { ChevronLeft, ChevronRight, Settings2 } from "lucide-react";
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
  onOpenSettings?: () => void;
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
  onOpenSettings,
  belowHeader,
  sessionDates,
  onToggleSession,
  conflictByDate,
  alignByDate,
  showAlign,
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

  function go(delta: -1 | 1) {
    const m = delta === -1 ? prevMonth(year, monthIndex) : nextMonth(year, monthIndex);
    setMonth(m);
    onMonthChange?.(m.year, m.monthIndex);
  }

  return (
    <section className="flex h-full flex-col gap-3 p-4 sm:p-5">
      <div className="flex flex-wrap items-center gap-x-2 gap-y-2 sm:gap-x-4">
        <button
          aria-label="Previous month"
          onClick={() => go(-1)}
          className="inline-flex h-9 w-9 items-center justify-center rounded-md border border-hairline bg-surface shadow-sm hover:bg-parchment"
        >
          <ChevronLeft className="h-4 w-4" />
        </button>
        <h2 className="font-display text-xl sm:text-2xl text-ink">
          {monthLabel(year, monthIndex)}
        </h2>
        <button
          aria-label="Next month"
          onClick={() => go(1)}
          className="inline-flex h-9 w-9 items-center justify-center rounded-md border border-hairline bg-surface shadow-sm hover:bg-parchment"
        >
          <ChevronRight className="h-4 w-4" />
        </button>
        <div className="flex-1" />
        {isCreator && onOpenSettings && (
          <button
            type="button"
            onClick={onOpenSettings}
            className="inline-flex items-center gap-1.5 rounded-md border border-hairline bg-surface px-3 py-1.5 text-xs font-body font-bold text-ink-soft shadow-sm hover:bg-parchment hover:text-ink"
          >
            <Settings2 className="h-3.5 w-3.5" />
            Poll settings
          </button>
        )}
      </div>

      {belowHeader}

      <div className="grid grid-cols-7 gap-1 text-center small-caps">
        {WEEKDAYS.map((w) => (
          <span key={w}>{w}</span>
        ))}
      </div>

      <div className="grid flex-1 grid-cols-7 auto-rows-fr gap-1">
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
