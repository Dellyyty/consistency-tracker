import { CheckIn, Completion, Task, DayStats, TaskStats } from './types';
import { parseISO, isBefore, isAfter, isEqual, format } from 'date-fns';

export function computeDayStats(
  date: string,
  checkIns: CheckIn[],
  completions: Completion[],
  tasks: Task[],
  sessionsPerDay: number = 3
): DayStats {
  // Get active tasks for this date
  const activeTasks = tasks.filter((t) => {
    const created = format(parseISO(t.created_at), 'yyyy-MM-dd');
    const isCreatedBefore = created <= date;
    const isNotRemoved = !t.removed_at || format(parseISO(t.removed_at), 'yyyy-MM-dd') > date;
    return isCreatedBefore && isNotRemoved;
  });

  const dayCheckIns = checkIns.filter((ci) => ci.date === date);
  const totalPossible = activeTasks.length * sessionsPerDay;

  let completedCount = 0;
  const dayCompletionIds = dayCheckIns.map((ci) => ci.id);
  const dayCompletions = completions.filter((c) =>
    dayCompletionIds.includes(c.check_in_id) && c.completed
  );
  completedCount = dayCompletions.length;

  return {
    date,
    totalTasks: totalPossible,
    completedTasks: completedCount,
    percentage: totalPossible > 0 ? Math.round((completedCount / totalPossible) * 100) : 0,
    sessions: [],
  };
}

export function computeStreak(
  dates: string[],
  checkIns: CheckIn[],
  completions: Completion[],
  tasks: Task[],
  sessionsPerDay: number = 3
): { current: number; longest: number } {
  if (dates.length === 0) return { current: 0, longest: 0 };

  // Sort dates descending (most recent first)
  const sorted = [...dates].sort().reverse();

  let currentStreak = 0;
  let longestStreak = 0;
  let tempStreak = 0;

  // Check from most recent date backward
  for (const date of sorted) {
    const stats = computeDayStats(date, checkIns, completions, tasks, sessionsPerDay);

    if (stats.percentage > 0) {
      tempStreak++;
      if (tempStreak > longestStreak) longestStreak = tempStreak;
    } else {
      if (currentStreak === 0) currentStreak = tempStreak;
      tempStreak = 0;
    }
  }

  // If we never broke the streak
  if (currentStreak === 0) currentStreak = tempStreak;
  if (tempStreak > longestStreak) longestStreak = tempStreak;

  return { current: currentStreak, longest: longestStreak };
}

export function computeRangePercentage(
  dates: string[],
  checkIns: CheckIn[],
  completions: Completion[],
  tasks: Task[],
  sessionsPerDay: number = 3
): number {
  let totalPossible = 0;
  let totalCompleted = 0;

  for (const date of dates) {
    const stats = computeDayStats(date, checkIns, completions, tasks, sessionsPerDay);
    totalPossible += stats.totalTasks;
    totalCompleted += stats.completedTasks;
  }

  return totalPossible > 0 ? Math.round((totalCompleted / totalPossible) * 100) : 0;
}

export function computeTaskStats(
  task: Task,
  checkIns: CheckIn[],
  completions: Completion[],
  dates: string[],
  sessionsPerDay: number = 3
): TaskStats {
  // Only count dates where this task was active
  const activeDates = dates.filter((date) => {
    const created = format(parseISO(task.created_at), 'yyyy-MM-dd');
    const isCreatedBefore = created <= date;
    const isNotRemoved = !task.removed_at || format(parseISO(task.removed_at), 'yyyy-MM-dd') > date;
    return isCreatedBefore && isNotRemoved;
  });

  const totalPossible = activeDates.length * sessionsPerDay;

  const allCheckInIds = checkIns
    .filter((ci) => activeDates.includes(ci.date))
    .map((ci) => ci.id);

  const totalCompleted = completions.filter(
    (c) => c.task_id === task.id && allCheckInIds.includes(c.check_in_id) && c.completed
  ).length;

  return {
    task,
    totalPossible,
    totalCompleted,
    percentage: totalPossible > 0 ? Math.round((totalCompleted / totalPossible) * 100) : 0,
  };
}

export function getMotivationalMessage(percentage: number, messages: typeof import('./constants').MOTIVATIONAL_MESSAGES): string {
  let category: keyof typeof messages;
  if (percentage === 100) category = 'perfect';
  else if (percentage >= 75) category = 'great';
  else if (percentage >= 50) category = 'good';
  else if (percentage > 0) category = 'low';
  else category = 'none';

  const pool = messages[category];
  return pool[Math.floor(Math.random() * pool.length)];
}
