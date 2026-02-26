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
import DayClock from '@/components/DayClock';
import { getUserToday, getCurrentSessionNumber, getSessionLabel, getCurrentTimeHHMM } from '@/lib/dates';
import { CheckIn, Completion, Task, SessionStatus, TodayTaskStatus } from '@/lib/types';
import { Plus, X, Check, Repeat, RotateCw } from 'lucide-react';

export default function DashboardPage() {
  const { user } = useAuth();
  const router = useRouter();
  const { fetchCheckIns, quickComplete } = useCheckIn(user?.id);
  const { tasks, fetchTasks } = useTasks(user?.id);
  const [checkIns, setCheckIns] = useState<CheckIn[]>([]);
  const [completions, setCompletions] = useState<Completion[]>([]);
  const [allTasks, setAllTasks] = useState<Task[]>([]);
  const [loaded, setLoaded] = useState(false);
  const [expandedSession, setExpandedSession] = useState<number | null>(null);
  const [togglingTask, setTogglingTask] = useState<string | null>(null);

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

  const today = getUserToday(timezone);
  const checkInTimes = (user?.check_in_times || ['07:00', '12:00', '20:00']) as string[];
  const currentSession = getCurrentSessionNumber(checkInTimes, timezone);
  const currentTime = getCurrentTimeHHMM(timezone);

  const todayCheckIns = checkIns.filter((ci) => ci.date === today);
  const todayCompletions = completions.filter((c) =>
    todayCheckIns.some((ci) => ci.id === c.check_in_id)
  );

  // Figure out which session to use for quick-complete
  // Use current session if available, otherwise use session 1 (for early birds)
  const quickSession = currentSession || 1;

  // Build today's task status list
  const todayTaskStatuses: TodayTaskStatus[] = tasks.map((task) => {
    const taskCompletions = todayCompletions.filter(
      (c) => c.task_id === task.id && c.completed
    );
    const completedCount = taskCompletions.length;
    const requiredCount = task.frequency === 'daily' ? 1 : 3;
    return {
      task,
      completedCount: Math.min(completedCount, requiredCount),
      requiredCount,
      done: completedCount >= requiredCount,
    };
  });

  const tasksCompleted = todayTaskStatuses.filter((t) => t.done).length;

  // Quick-complete handler
  const handleQuickToggle = async (task: Task, currentlyDone: boolean, completedCount: number, requiredCount: number) => {
    setTogglingTask(task.id);

    // Determine what to do:
    // If it's a daily task: toggle on/off
    // If per_session: mark the next uncompleted session dot
    const shouldComplete = !currentlyDone;

    // For per_session tasks already partially done, always mark the next one
    // For daily tasks or fully completing, just toggle
    if (task.frequency === 'per_session' && completedCount > 0 && completedCount < requiredCount) {
      // Find which session doesn't have this task completed
      const sessionsWithCompletion = todayCheckIns
        .filter((ci) => todayCompletions.some((c) => c.check_in_id === ci.id && c.task_id === task.id && c.completed))
        .map((ci) => ci.session_number);

      // Find next session without completion
      let targetSession = quickSession;
      for (let s = 1; s <= 3; s++) {
        if (!sessionsWithCompletion.includes(s)) {
          targetSession = s;
          break;
        }
      }

      const result = await quickComplete(today, targetSession, task.id, true, tasks.map((t) => t.id));
      if (result.success) await loadData();
    } else {
      const result = await quickComplete(today, quickSession, task.id, shouldComplete, tasks.map((t) => t.id));
      if (result.success) await loadData();
    }

    setTogglingTask(null);
  };

  // Session statuses
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

  // First-time user with no tasks
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
            Set up the habits you want to track. You can choose whether each task needs to be done once a day or at every check-in.
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

      {/* TODAY'S TASKS - tappable checkmarks */}
      <div className="rounded-2xl bg-surface p-4">
        <div className="mb-3 flex items-center justify-between">
          <h2 className="text-sm font-bold text-foreground">
            Today&apos;s Tasks
          </h2>
          <span className="rounded-full bg-surface-light px-2.5 py-0.5 text-xs font-semibold text-muted">
            {tasksCompleted}/{tasks.length} done
          </span>
        </div>

        <div className="space-y-2">
          {todayTaskStatuses.map(({ task, completedCount, requiredCount, done }) => {
            const isToggling = togglingTask === task.id;
            return (
              <button
                key={task.id}
                onClick={() => handleQuickToggle(task, done, completedCount, requiredCount)}
                disabled={isToggling || (task.frequency === 'per_session' && done)}
                className={`flex w-full items-center gap-3 rounded-xl px-3 py-3 text-left transition-all active:scale-[0.98] ${
                  done ? 'bg-success/10' : 'bg-surface-light hover:bg-surface-light/70'
                } disabled:active:scale-100`}
              >
                <span className="text-lg">{task.emoji}</span>
                <div className="flex-1 min-w-0">
                  <p className={`text-sm font-medium ${done ? 'text-success' : 'text-foreground'}`}>
                    {task.name}
                  </p>
                  <div className="flex items-center gap-1.5 mt-0.5">
                    {task.frequency === 'daily' ? (
                      <span className="text-[10px] text-muted flex items-center gap-0.5">
                        <RotateCw size={8} />
                        Once daily
                      </span>
                    ) : (
                      <span className="text-[10px] text-muted flex items-center gap-0.5">
                        <Repeat size={8} />
                        {completedCount}/{requiredCount} check-ins
                      </span>
                    )}
                  </div>
                </div>
                {/* Tappable completion indicator */}
                <div className="flex items-center gap-1 shrink-0">
                  {isToggling ? (
                    <div className="h-6 w-6 animate-spin rounded-full border-2 border-accent border-t-transparent" />
                  ) : requiredCount === 1 ? (
                    <div className={`flex h-7 w-7 items-center justify-center rounded-full transition-all ${
                      done ? 'bg-success' : 'border-2 border-muted/40 hover:border-accent'
                    }`}>
                      {done && <Check size={16} className="text-white" strokeWidth={3} />}
                    </div>
                  ) : (
                    <div className="flex gap-1.5">
                      {Array.from({ length: requiredCount }).map((_, i) => (
                        <div
                          key={i}
                          className={`h-3 w-3 rounded-full transition-all ${
                            i < completedCount ? 'bg-success' : 'border-2 border-muted/30'
                          }`}
                        />
                      ))}
                    </div>
                  )}
                </div>
              </button>
            );
          })}
        </div>
      </div>

      {/* Today's Sessions */}
      <div className="space-y-2">
        <h2 className="text-sm font-semibold text-muted">Check-in Sessions</h2>
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
                expanded={expandedSession === session.sessionNumber}
                onClick={() => handleSessionClick(session)}
              />
              {expandedSession === session.sessionNumber && session.status === 'completed' && (
                <div className="mt-1 space-y-1.5 rounded-xl bg-surface/50 p-3 fade-in-up">
                  {tasks.map((t) => {
                    const taskDone = session.completions?.some(
                      (c) => c.task_id === t.id && c.completed
                    );
                    return (
                      <div
                        key={t.id}
                        className={`flex items-center gap-3 rounded-lg px-3 py-2 text-sm ${
                          taskDone ? 'text-foreground' : 'text-muted line-through'
                        }`}
                      >
                        <span>{t.emoji}</span>
                        <span className="flex-1">{t.name}</span>
                        {taskDone ? (
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

      {/* Today's Progress + Live Clock */}
      <div className="flex items-center justify-around rounded-2xl bg-surface p-5">
        <ProgressRing percentage={stats.overall.today} size={90} strokeWidth={7} label="today" />
        <div className="h-12 w-px bg-surface-light" />
        <DayClock timezone={timezone} />
      </div>

      {/* Quick Stats */}
      <div className="grid grid-cols-4 gap-2">
        <StatCard label="Today" value={`${stats.overall.today}%`} />
        <StatCard label="Week" value={`${stats.overall.week}%`} />
        <StatCard label="Streak" value={stats.overall.currentStreak} />
        <StatCard label="All Time" value={`${stats.overall.allTime}%`} />
      </div>

      {/* Motivational Banner */}
      <MotivationalBanner percentage={stats.overall.today} />

      <div className="h-4" />
    </div>
  );
}
