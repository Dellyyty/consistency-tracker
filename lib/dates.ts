import { format, parseISO, startOfWeek, endOfWeek, startOfMonth, endOfMonth, eachDayOfInterval, differenceInDays, isAfter, isBefore, isEqual } from 'date-fns';
import { toZonedTime } from 'date-fns-tz';

export function getUserNow(timezone: string): Date {
  return toZonedTime(new Date(), timezone);
}

export function getUserToday(timezone: string): string {
  const now = getUserNow(timezone);
  return format(now, 'yyyy-MM-dd');
}

export function getCurrentTimeHHMM(timezone: string): string {
  const now = getUserNow(timezone);
  return format(now, 'HH:mm');
}

export function getCurrentSessionNumber(
  checkInTimes: string[],
  timezone: string
): number | null {
  const currentTime = getCurrentTimeHHMM(timezone);
  const sorted = [...checkInTimes].sort();

  // Find which session window we're in
  // Each session window: from session time to next session time (or end of day)
  for (let i = sorted.length - 1; i >= 0; i--) {
    if (currentTime >= sorted[i]) {
      return i + 1;
    }
  }
  return null; // Before first session
}

export function getNextSessionTime(
  checkInTimes: string[],
  timezone: string
): string | null {
  const currentTime = getCurrentTimeHHMM(timezone);
  const sorted = [...checkInTimes].sort();

  for (const time of sorted) {
    if (time > currentTime) {
      return time;
    }
  }
  return null; // All sessions passed
}

export function getSessionLabel(sessionNumber: number): string {
  const labels = ['Morning', 'Midday', 'Evening'];
  return labels[sessionNumber - 1] || `Session ${sessionNumber}`;
}

export function formatTime12h(time24: string): string {
  const [hours, minutes] = time24.split(':').map(Number);
  const ampm = hours >= 12 ? 'PM' : 'AM';
  const h = hours % 12 || 12;
  return `${h}:${minutes.toString().padStart(2, '0')} ${ampm}`;
}

export function getDaysUntilSummer(summerDate: string, timezone: string): number {
  const today = parseISO(getUserToday(timezone));
  const summer = parseISO(summerDate);
  const diff = differenceInDays(summer, today);
  return Math.max(0, diff);
}

export function getDaysSinceStart(startDate: string, timezone: string): number {
  const today = parseISO(getUserToday(timezone));
  const start = parseISO(startDate);
  return Math.max(0, differenceInDays(today, start));
}

export function getWeekRange(timezone: string): { start: string; end: string } {
  const today = parseISO(getUserToday(timezone));
  const start = startOfWeek(today, { weekStartsOn: 1 }); // Monday
  const end = endOfWeek(today, { weekStartsOn: 1 });
  return {
    start: format(start, 'yyyy-MM-dd'),
    end: format(end, 'yyyy-MM-dd'),
  };
}

export function getMonthRange(timezone: string): { start: string; end: string } {
  const today = parseISO(getUserToday(timezone));
  return {
    start: format(startOfMonth(today), 'yyyy-MM-dd'),
    end: format(endOfMonth(today), 'yyyy-MM-dd'),
  };
}

export function getDaysInRange(start: string, end: string): string[] {
  return eachDayOfInterval({
    start: parseISO(start),
    end: parseISO(end),
  }).map((d) => format(d, 'yyyy-MM-dd'));
}

export function isDateInRange(date: string, start: string, end: string): boolean {
  const d = parseISO(date);
  const s = parseISO(start);
  const e = parseISO(end);
  return (isAfter(d, s) || isEqual(d, s)) && (isBefore(d, e) || isEqual(d, e));
}

export function formatDateShort(date: string): string {
  return format(parseISO(date), 'MMM d');
}

export function formatDateFull(date: string): string {
  return format(parseISO(date), 'EEEE, MMMM d, yyyy');
}

export function getDayOfWeek(date: string): number {
  return parseISO(date).getDay();
}
