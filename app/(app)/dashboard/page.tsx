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
import TaskCheckbox from '@/components/TaskCheckbox';
import { getUserToday, getCurrentSessionNumber, getSessionLabel, getCurrentTimeHHMM } from '@/lib/dates';
import { CheckIn, Completion, Task, SessionStatus } from '@/lib/types';
import { Plus, X } from 'lucide-react';

export default function DashboardPage() {
  const { user } = useAuth();
  const router = useRouter();
  const { fetchCheckIns } = useCheckIn(user?.id);
  const { tasks, fetchTasks } = useTasks(user?.id);
  const [checkIns, setCheckIns] = useState<CheckIn[]>([]);
  const [completions, setCompletions] = useState<Completion[]>([]);
  const [allTasks, setAllTasks] = useState<Task[]>([]);
  const [loaded, setLoaded] = useState(false);
  const [expandedSession, setExpandedSession] = useState<number | null>(null);

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
        ? completions.filter((c) => c.check_in_id === existingCheckIn.id)
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

  // First-time user with no tasks - onboarding
  if (tasks.length === 0) {
    return (
      <div className="mx-auto max-w-md px-4 pt-6">
        <div className="mb-6">
          <h1 className="text-xl font-bold text-foreground">
            Welcome, {user?.display_name}!
          </h1>
          <p className="text-sm text-muted">Let&apos;s get you set up.</p>
        </div>

        <Countdown daysLeft={daysLeft} progress={progress} />

        <div className="mt-6 flex flex-col items-center gap-4 rounded-2xl border border-dashed border-surface-light bg-surface p-8">
          <Plus size={40} className="text-muted" />
          <h2 className="text-lg font-bold text-foreground">Add your daily tasks</h2>
          <p className="text-center text-sm text-muted">
            Set up the habits you want to track every day. You&apos;ll check in 3 times daily to mark what you completed.
          </p>
          <button
            onClick={() => router.push('/settings')}
            className="mt-2 rounded-xl bg-accent px-8 py-3 text-sm font-bold text-white transition-all hover:bg-accent-light active:scale-[0.98]"
          >
            Set Up Tasks
          </button>
        </div>
      </div>
    );
  }

  const handleSessionClick = (session: SessionStatus) => {
    if (session.status === 'available') {
      router.push('/checkin');
    } else if (session.status === 'completed') {
      setExpandedSession(expandedSession === session.sessionNumber ? null : session.sessionNumber);
    }
  };

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
        {sessions.map((session) => {
          const completedCount = session.completions?.filter((c) => c.completed).length || 0;
          return (
            <div key={session.sessionNumber}>
              <CheckInCard
                sessionNumber={session.sessionNumber}
                label={session.label}
                time={session.time}
                status={session.status}
                completedCount={completedCount}
                totalCount={tasks.length}
                onClick={() => handleSessionClick(session)}
              />
              {/* Expanded completed session - show task results */}
              {expandedSession === session.sessionNumber && session.status === 'completed' && (
                <div className="mt-1 space-y-1.5 rounded-xl bg-surface/50 p-3 fade-in-up">
                  {tasks.map((t) => {
                    const done = session.completions?.some(
                      (c) => c.task_id === t.id && c.completed
                    );
                    return (
                      <div
                        key={t.id}
                        className={`flex items-center gap-3 rounded-lg px-3 py-2 text-sm ${
                          done ? 'text-foreground' : 'text-muted line-through'
                        }`}
                      >
                        <span>{t.emoji}</span>
                        <span className="flex-1">{t.name}</span>
                        {done ? (
                          <span className="text-xs text-success">Done</span>
                        ) : (
                          <X size={14} className="text-danger/50" />
                        )}
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          );
        })}
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
