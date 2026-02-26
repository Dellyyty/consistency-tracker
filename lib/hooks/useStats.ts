'use client';

import { useState, useCallback } from 'react';
import { CheckIn, Completion, Task, OverallStats, TaskStats } from '@/lib/types';
import { getUserToday, getWeekRange, getMonthRange, getDaysInRange } from '@/lib/dates';
import { computeDayStats, computeStreak, computeRangePercentage, computeTaskStats } from '@/lib/stats';

export function useStats(
  checkIns: CheckIn[],
  completions: Completion[],
  tasks: Task[],
  allTasks: Task[],
  startDate: string,
  timezone: string
) {
  const today = getUserToday(timezone);
  const weekRange = getWeekRange(timezone);
  const monthRange = getMonthRange(timezone);

  // All dates from start to today
  const allDates = getDaysInRange(startDate, today);
  const weekDates = getDaysInRange(weekRange.start, weekRange.end).filter(
    (d) => d <= today && d >= startDate
  );
  const monthDates = getDaysInRange(monthRange.start, monthRange.end).filter(
    (d) => d <= today && d >= startDate
  );

  const todayStats = computeDayStats(today, checkIns, completions, allTasks);

  const todayPct = todayStats.percentage;
  const weekPct = computeRangePercentage(weekDates, checkIns, completions, allTasks);
  const monthPct = computeRangePercentage(monthDates, checkIns, completions, allTasks);
  const allTimePct = computeRangePercentage(allDates, checkIns, completions, allTasks);

  const { current: currentStreak, longest: longestStreak } = computeStreak(
    allDates,
    checkIns,
    completions,
    allTasks
  );

  const taskStats: TaskStats[] = allTasks.map((task) =>
    computeTaskStats(task, checkIns, completions, allDates)
  );

  const overall: OverallStats = {
    today: todayPct,
    week: weekPct,
    month: monthPct,
    allTime: allTimePct,
    currentStreak,
    longestStreak,
    totalCheckIns: checkIns.length,
    totalPossibleCheckIns: allDates.length * 3,
  };

  return {
    overall,
    taskStats,
    todayStats,
    allDates,
    weekDates,
    monthDates,
  };
}
