'use client';

import { useEffect, useState, useCallback } from 'react';
import { useAuth } from '@/lib/hooks/useAuth';
import { useCheckIn } from '@/lib/hooks/useCheckIn';
import { useTasks } from '@/lib/hooks/useTasks';
import { useStats } from '@/lib/hooks/useStats';
import StatCard from '@/components/StatCard';
import StreakFlame from '@/components/StreakFlame';
import ProgressRing from '@/components/ProgressRing';
import WeeklyHeatmap from '@/components/WeeklyHeatmap';
import MonthlyCalendar from '@/components/MonthlyCalendar';
import { getUserToday } from '@/lib/dates';
import { CheckIn, Completion, Task } from '@/lib/types';
import { TrendingUp, Target, Flame, Trophy } from 'lucide-react';

export default function StatsPage() {
  const { user } = useAuth();
  const { fetchCheckIns } = useCheckIn(user?.id);
  const { tasks, fetchTasks } = useTasks(user?.id);
  const [checkIns, setCheckIns] = useState<CheckIn[]>([]);
  const [completions, setCompletions] = useState<Completion[]>([]);
  const [allTasks, setAllTasks] = useState<Task[]>([]);
  const [loaded, setLoaded] = useState(false);

  const timezone = user?.timezone || 'America/New_York';
  const startDate = user?.start_date || getUserToday(timezone);
  const today = getUserToday(timezone);

  const loadData = useCallback(async () => {
    if (!user) return;
    const [, allTaskList] = await Promise.all([
      fetchTasks(false),
      fetchTasks(true),
    ]);
    setAllTasks(allTaskList);

    const { checkIns: ci, completions: comp } = await fetchCheckIns(startDate);
    setCheckIns(ci);
    setCompletions(comp);
    setLoaded(true);
  }, [user, fetchTasks, fetchCheckIns, startDate]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const stats = useStats(checkIns, completions, tasks, allTasks, startDate, timezone);

  if (!loaded) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-accent border-t-transparent" />
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-md space-y-4 px-4 pt-6">
      <h1 className="text-xl font-bold text-foreground">Statistics</h1>

      {/* Overall Progress */}
      <div className="flex items-center justify-center gap-8 rounded-xl bg-surface p-6">
        <ProgressRing percentage={stats.overall.allTime} size={110} strokeWidth={10} label="all time" />
        <div className="space-y-3">
          <div className="flex items-center gap-2">
            <Flame size={16} className="text-orange" />
            <div>
              <p className="text-lg font-bold text-foreground">{stats.overall.currentStreak}</p>
              <p className="text-[10px] text-muted">Current Streak</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Trophy size={16} className="text-warning" />
            <div>
              <p className="text-lg font-bold text-foreground">{stats.overall.longestStreak}</p>
              <p className="text-[10px] text-muted">Best Streak</p>
            </div>
          </div>
        </div>
      </div>

      {/* Period Stats */}
      <div className="grid grid-cols-4 gap-2">
        <StatCard label="Today" value={`${stats.overall.today}%`} />
        <StatCard label="Week" value={`${stats.overall.week}%`} />
        <StatCard label="Month" value={`${stats.overall.month}%`} />
        <StatCard label="All Time" value={`${stats.overall.allTime}%`} />
      </div>

      {/* Weekly Heatmap */}
      <WeeklyHeatmap
        checkIns={checkIns}
        completions={completions}
        tasks={allTasks}
        today={today}
      />

      {/* Monthly Calendar */}
      <MonthlyCalendar
        checkIns={checkIns}
        completions={completions}
        tasks={allTasks}
        today={today}
      />

      {/* Per-Task Breakdown */}
      <section className="space-y-3">
        <h2 className="flex items-center gap-2 text-sm font-semibold text-muted">
          <Target size={14} />
          Task Breakdown
        </h2>
        {stats.taskStats.length === 0 ? (
          <p className="text-center text-sm text-muted">No tasks yet</p>
        ) : (
          stats.taskStats.map((ts) => (
            <div
              key={ts.task.id}
              className="flex items-center gap-3 rounded-xl bg-surface p-3"
            >
              <span className="text-xl">{ts.task.emoji}</span>
              <div className="flex-1">
                <p className="text-sm font-medium text-foreground">{ts.task.name}</p>
                <div className="mt-1 h-1.5 w-full overflow-hidden rounded-full bg-surface-light">
                  <div
                    className="h-full rounded-full bg-accent transition-all"
                    style={{ width: `${ts.percentage}%` }}
                  />
                </div>
              </div>
              <span className="text-sm font-bold text-foreground">{ts.percentage}%</span>
            </div>
          ))
        )}
      </section>

      {/* Total Check-ins */}
      <div className="rounded-xl bg-surface p-4 text-center">
        <p className="text-xs text-muted">Total Check-ins Completed</p>
        <p className="text-3xl font-bold text-foreground">{stats.overall.totalCheckIns}</p>
        <p className="text-xs text-muted">
          out of {stats.overall.totalPossibleCheckIns} possible sessions
        </p>
      </div>
    </div>
  );
}
