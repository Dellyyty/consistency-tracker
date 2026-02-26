'use client';

import { format, parseISO, startOfWeek, addDays, subWeeks } from 'date-fns';
import { CheckIn, Completion, Task } from '@/lib/types';
import { computeDayStats } from '@/lib/stats';

interface WeeklyHeatmapProps {
  checkIns: CheckIn[];
  completions: Completion[];
  tasks: Task[];
  today: string;
}

const DAY_LABELS = ['M', 'T', 'W', 'T', 'F', 'S', 'S'];

function getColor(percentage: number): string {
  if (percentage === 0) return 'bg-surface-light';
  if (percentage < 33) return 'bg-danger/60';
  if (percentage < 66) return 'bg-warning/60';
  if (percentage < 90) return 'bg-success/50';
  return 'bg-success';
}

export default function WeeklyHeatmap({ checkIns, completions, tasks, today }: WeeklyHeatmapProps) {
  const todayDate = parseISO(today);
  const weeks = [];

  for (let w = 3; w >= 0; w--) {
    const weekStart = startOfWeek(subWeeks(todayDate, w), { weekStartsOn: 1 });
    const days = [];
    for (let d = 0; d < 7; d++) {
      const day = addDays(weekStart, d);
      const dateStr = format(day, 'yyyy-MM-dd');
      const isFuture = dateStr > today;
      const stats = isFuture
        ? { percentage: -1 }
        : computeDayStats(dateStr, checkIns, completions, tasks);
      days.push({ date: dateStr, ...stats, isFuture });
    }
    weeks.push(days);
  }

  return (
    <div className="rounded-xl bg-surface p-4">
      <h3 className="mb-3 text-sm font-semibold text-foreground">Last 4 Weeks</h3>
      {/* Day labels */}
      <div className="mb-1 grid grid-cols-7 gap-1">
        {DAY_LABELS.map((label, i) => (
          <span key={i} className="text-center text-[10px] text-muted">
            {label}
          </span>
        ))}
      </div>
      {/* Weeks */}
      <div className="flex flex-col gap-1">
        {weeks.map((week, wi) => (
          <div key={wi} className="grid grid-cols-7 gap-1">
            {week.map((day) => (
              <div
                key={day.date}
                className={`aspect-square rounded-sm ${
                  day.isFuture
                    ? 'bg-surface-light/30'
                    : getColor(day.percentage)
                }`}
                title={`${day.date}: ${day.isFuture ? 'Future' : `${day.percentage}%`}`}
              />
            ))}
          </div>
        ))}
      </div>
      {/* Legend */}
      <div className="mt-3 flex items-center justify-end gap-1 text-[10px] text-muted">
        <span>Less</span>
        <div className="h-3 w-3 rounded-sm bg-surface-light" />
        <div className="h-3 w-3 rounded-sm bg-danger/60" />
        <div className="h-3 w-3 rounded-sm bg-warning/60" />
        <div className="h-3 w-3 rounded-sm bg-success/50" />
        <div className="h-3 w-3 rounded-sm bg-success" />
        <span>More</span>
      </div>
    </div>
  );
}
