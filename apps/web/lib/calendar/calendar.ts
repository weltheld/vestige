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

const TODAY = (() => {
  if (typeof window === "undefined") return new Date(2026, 5, 12);
  return new Date();
})();

export function isoDate(d: Date): string {
  return format(d, "yyyy-MM-dd");
}

export function buildMonthGrid(year: number, monthIndex: number): CalendarDay[] {
  const first = startOfMonth(new Date(year, monthIndex, 1));
  const last = endOfMonth(first);
  const gridStart = startOfWeek(first, { weekStartsOn: 1 });
  const days: CalendarDay[] = [];
  const todayIso = isoDate(TODAY);

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
  return { year: TODAY.getFullYear(), monthIndex: TODAY.getMonth() };
}

export function longDateLabel(iso: string) {
  const [y, m, d] = iso.split("-").map(Number);
  return format(new Date(y, m - 1, d), "MMMM d, yyyy");
}

export function weekdayLabel(iso: string) {
  const [y, m, d] = iso.split("-").map(Number);
  return format(new Date(y, m - 1, d), "EEEE");
}
