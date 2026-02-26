'use client';

import { format, parseISO, startOfMonth, endOfMonth, eachDayOfInterval, getDay } from 'date-fns';
import { CheckIn, Completion, Task } from '@/lib/types';
import { computeDayStats } from '@/lib/stats';

interface MonthlyCalendarProps {
  checkIns: CheckIn[];
  completions: Completion[];
  tasks: Task[];
  today: string;
  month?: Date;
}

function getDayColor(percentage: number): string {
  if (percentage === 0) return 'bg-surface-light text-muted';
  if (percentage < 33) return 'bg-danger/40 text-foreground';
  if (percentage < 66) return 'bg-warning/40 text-foreground';
  if (percentage < 90) return 'bg-success/40 text-foreground';
  return 'bg-success text-white';
}

export default function MonthlyCalendar({
  checkIns,
  completions,
  tasks,
  today,
  month,
}: MonthlyCalendarProps) {
  const monthDate = month || parseISO(today);
  const monthStart = startOfMonth(monthDate);
  const monthEnd = endOfMonth(monthDate);
  const days = eachDayOfInterval({ start: monthStart, end: monthEnd });

  // Padding for start of month (Monday = 0)
  const startDay = (getDay(monthStart) + 6) % 7; // Convert Sunday=0 to Monday=0
  const padding = Array.from({ length: startDay });

  return (
    <div className="rounded-xl bg-surface p-4">
      <h3 className="mb-3 text-sm font-semibold text-foreground">
        {format(monthDate, 'MMMM yyyy')}
      </h3>
      {/* Day headers */}
      <div className="mb-1 grid grid-cols-7 gap-1">
        {['M', 'T', 'W', 'T', 'F', 'S', 'S'].map((d, i) => (
          <span key={i} className="text-center text-[10px] text-muted">
            {d}
          </span>
        ))}
      </div>
      {/* Calendar grid */}
      <div className="grid grid-cols-7 gap-1">
        {padding.map((_, i) => (
          <div key={`pad-${i}`} />
        ))}
        {days.map((day) => {
          const dateStr = format(day, 'yyyy-MM-dd');
          const isFuture = dateStr > today;
          const isToday = dateStr === today;
          const stats = isFuture
            ? null
            : computeDayStats(dateStr, checkIns, completions, tasks);

          return (
            <div
              key={dateStr}
              className={`flex aspect-square items-center justify-center rounded-md text-xs font-medium ${
                isFuture
                  ? 'text-muted/30'
                  : stats
                  ? getDayColor(stats.percentage)
                  : 'bg-surface-light text-muted'
              } ${isToday ? 'ring-2 ring-accent' : ''}`}
              title={`${dateStr}: ${isFuture ? 'Future' : `${stats?.percentage ?? 0}%`}`}
            >
              {format(day, 'd')}
            </div>
          );
        })}
      </div>
    </div>
  );
}
