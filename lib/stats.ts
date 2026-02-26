import { CheckIn, Completion, Task, DayStats, TaskStats } from './types';
import { parseISO, format } from 'date-fns';

function getActiveTasksForDate(tasks: Task[], date: string): Task[] {
  return tasks.filter((t) => {
    const created = format(parseISO(t.created_at), 'yyyy-MM-dd');
    const isCreatedBefore = created <= date;
    const isNotRemoved = !t.removed_at || format(parseISO(t.removed_at), 'yyyy-MM-dd') > date;
    return isCreatedBefore && isNotRemoved;
  });
}

// How many completions are possible for a task on a given day
function taskMaxForDay(task: Task, sessionsPerDay: number): number {
  return task.frequency === 'daily' ? 1 : sessionsPerDay;
}

export function computeDayStats(
  date: string,
  checkIns: CheckIn[],
  completions: Completion[],
  tasks: Task[],
  sessionsPerDay: number = 3
): DayStats {
  const activeTasks = getActiveTasksForDate(tasks, date);
  const dayCheckIns = checkIns.filter((ci) => ci.date === date);
  const dayCheckInIds = dayCheckIns.map((ci) => ci.id);
  const dayCompletions = completions.filter(
    (c) => dayCheckInIds.includes(c.check_in_id) && c.completed
  );

  let totalPossible = 0;
  let completedCount = 0;

  for (const task of activeTasks) {
    const max = taskMaxForDay(task, sessionsPerDay);
    totalPossible += max;

    const taskCompletions = dayCompletions.filter((c) => c.task_id === task.id).length;
    // Cap at max (daily task can only count as 1 even if marked in multiple sessions)
    completedCount += Math.min(taskCompletions, max);
  }

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

  const sorted = [...dates].sort().reverse();

  let currentStreak = 0;
  let longestStreak = 0;
  let tempStreak = 0;

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
  const activeDates = dates.filter((date) => {
    const created = format(parseISO(task.created_at), 'yyyy-MM-dd');
    return created <= date && (!task.removed_at || format(parseISO(task.removed_at), 'yyyy-MM-dd') > date);
  });

  const maxPerDay = taskMaxForDay(task, sessionsPerDay);
  const totalPossible = activeDates.length * maxPerDay;

  let totalCompleted = 0;
  for (const date of activeDates) {
    const dayCheckInIds = checkIns.filter((ci) => ci.date === date).map((ci) => ci.id);
    const count = completions.filter(
      (c) => c.task_id === task.id && dayCheckInIds.includes(c.check_in_id) && c.completed
    ).length;
    totalCompleted += Math.min(count, maxPerDay);
  }

  return {
    task,
    totalPossible,
    totalCompleted,
    percentage: totalPossible > 0 ? Math.round((totalCompleted / totalPossible) * 100) : 0,
  };
}
