import {
  addDays,
  endOfMonth,
  format,
  startOfMonth,
  startOfWeek,
} from "date-fns";

export type CalendarDay = {
  date: Date;
  iso: string;
  dayOfMonth: number;
  weekday: 0 | 1 | 2 | 3 | 4 | 5 | 6;
  inCurrentMonth: boolean;
  isToday: boolean;
  isPast: boolean;
};

// Evaluated per call, never at module scope: a module-level Date on the
// server sticks for the lifetime of a warm serverless instance, and the
// old hardcoded server fixture (June 12, 2026) made SSR mark genuinely
// past days as "future" — which kept their votes visible.
function today(): Date {
  return new Date();
}

export function isoDate(d: Date): string {
  return format(d, "yyyy-MM-dd");
}

export function buildMonthGrid(year: number, monthIndex: number): CalendarDay[] {
  const first = startOfMonth(new Date(year, monthIndex, 1));
  const last = endOfMonth(first);
  const gridStart = startOfWeek(first, { weekStartsOn: 1 });
  const days: CalendarDay[] = [];
  const todayIso = isoDate(today());

  let cursor = gridStart;
  while (true) {
    days.push({
      date: cursor,
      iso: isoDate(cursor),
      dayOfMonth: cursor.getDate(),
      weekday: cursor.getDay() as 0 | 1 | 2 | 3 | 4 | 5 | 6,
      inCurrentMonth:
        cursor.getMonth() === monthIndex && cursor.getFullYear() === year,
      isToday: isoDate(cursor) === todayIso,
      isPast: isoDate(cursor) < todayIso,
    });
    if (days.length >= 35 && cursor >= last) break;
    cursor = addDays(cursor, 1);
    if (days.length >= 42) break;
  }
  return days;
}

export function monthLabel(year: number, monthIndex: number) {
  return format(new Date(year, monthIndex, 1), "LLLL yyyy");
}

export function shortMonthLabel(year: number, monthIndex: number) {
  return format(new Date(year, monthIndex, 1), "LLL yyyy");
}

export function prevMonth(year: number, monthIndex: number) {
  return monthIndex === 0
    ? { year: year - 1, monthIndex: 11 }
    : { year, monthIndex: monthIndex - 1 };
}

export function nextMonth(year: number, monthIndex: number) {
  return monthIndex === 11
    ? { year: year + 1, monthIndex: 0 }
    : { year, monthIndex: monthIndex + 1 };
}

export function defaultMonth() {
  const t = today();
  return { year: t.getFullYear(), monthIndex: t.getMonth() };
}

export function longDateLabel(iso: string) {
  const [y, m, d] = iso.split("-").map(Number);
  return format(new Date(y, m - 1, d), "MMMM d, yyyy");
}

export function weekdayLabel(iso: string) {
  const [y, m, d] = iso.split("-").map(Number);
  return format(new Date(y, m - 1, d), "EEEE");
}
