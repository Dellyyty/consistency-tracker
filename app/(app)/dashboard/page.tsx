'use client';

import { useEffect, useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/lib/hooks/useAuth';
import { useCheckIn } from '@/lib/hooks/useCheckIn';
import { useTasks } from '@/lib/hooks/useTasks';
import { useCountdown } from '@/lib/hooks/useCountdown';
import { useStats } from '@/lib/hooks/useStats';
import Countdown from '@/components/Countdown';
import CheckInCard from '@/components/CheckInCard';
import StatCard from '@/components/StatCard';
import StreakFlame from '@/components/StreakFlame';
import MotivationalBanner from '@/components/MotivationalBanner';
import ProgressRing from '@/components/ProgressRing';
import { getUserToday, getCurrentSessionNumber, getSessionLabel, getCurrentTimeHHMM } from '@/lib/dates';
import { CheckIn, Completion, Task, SessionStatus } from '@/lib/types';

export default function DashboardPage() {
  const { user } = useAuth();
  const router = useRouter();
  const { fetchCheckIns } = useCheckIn(user?.id);
  const { tasks, fetchTasks } = useTasks(user?.id);
  const [checkIns, setCheckIns] = useState<CheckIn[]>([]);
  const [completions, setCompletions] = useState<Completion[]>([]);
  const [allTasks, setAllTasks] = useState<Task[]>([]);
  const [loaded, setLoaded] = useState(false);

  const timezone = user?.timezone || 'America/New_York';
  const startDate = user?.start_date || getUserToday(timezone);
  const { daysLeft, progress } = useCountdown(startDate, timezone);

  const loadData = useCallback(async () => {
    if (!user) return;
    const [activeTasks, allTaskList] = await Promise.all([
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

  // Build session statuses for today
  const today = getUserToday(timezone);
  const checkInTimes = (user?.check_in_times || ['07:00', '12:00', '20:00']) as string[];
  const currentSession = getCurrentSessionNumber(checkInTimes, timezone);
  const currentTime = getCurrentTimeHHMM(timezone);

  const todayCheckIns = checkIns.filter((ci) => ci.date === today);

  const sessions: SessionStatus[] = checkInTimes
    .sort()
    .map((time, i) => {
      const sessionNum = i + 1;
      const existingCheckIn = todayCheckIns.find((ci) => ci.session_number === sessionNum);

      let status: SessionStatus['status'];
      if (existingCheckIn) {
        status = 'completed';
      } else if (currentSession === sessionNum) {
        status = 'available';
      } else if (currentTime < time) {
        status = 'upcoming';
      } else {
        status = 'missed';
      }

      const sessionCompletions = existingCheckIn
        ? completions.filter((c) => c.check_in_id === existingCheckIn.id && c.completed)
        : [];

      return {
        sessionNumber: sessionNum,
        label: getSessionLabel(sessionNum),
        time,
        status,
        checkIn: existingCheckIn,
        completions: sessionCompletions,
      };
    });

  if (!loaded) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-accent border-t-transparent" />
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-md space-y-4 px-4 pt-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-foreground">
            Hey, {user?.display_name} 👋
          </h1>
          <p className="text-xs text-muted">Let&apos;s make today count.</p>
        </div>
        <StreakFlame streak={stats.overall.currentStreak} />
      </div>

      {/* Countdown */}
      <Countdown daysLeft={daysLeft} progress={progress} />

      {/* Today's Sessions */}
      <div className="space-y-2">
        <h2 className="text-sm font-semibold text-muted">Today&apos;s Check-ins</h2>
        {sessions.map((session) => (
          <CheckInCard
            key={session.sessionNumber}
            sessionNumber={session.sessionNumber}
            label={session.label}
            time={session.time}
            status={session.status}
            completedCount={session.completions?.length || 0}
            totalCount={tasks.length}
            onClick={() => router.push('/checkin')}
          />
        ))}
      </div>

      {/* Quick Stats */}
      <div className="grid grid-cols-4 gap-2">
        <StatCard label="Today" value={`${stats.overall.today}%`} />
        <StatCard label="Week" value={`${stats.overall.week}%`} />
        <StatCard label="Streak" value={stats.overall.currentStreak} />
        <StatCard label="All Time" value={`${stats.overall.allTime}%`} />
      </div>

      {/* Today's Progress Ring */}
      <div className="flex justify-center">
        <ProgressRing percentage={stats.overall.today} size={100} strokeWidth={8} label="today" />
      </div>

      {/* Motivational Banner */}
      <MotivationalBanner percentage={stats.overall.today} />
    </div>
  );
}
