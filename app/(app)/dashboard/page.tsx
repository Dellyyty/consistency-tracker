'use client';

import { useEffect, useState, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/lib/hooks/useAuth';
import { useCheckIn } from '@/lib/hooks/useCheckIn';
import { useTasks } from '@/lib/hooks/useTasks';
import { useCountdown } from '@/lib/hooks/useCountdown';
import { useStats } from '@/lib/hooks/useStats';
import StreakFlame from '@/components/StreakFlame';
import ProgressRing from '@/components/ProgressRing';
import DayClock from '@/components/DayClock';
import { getUserToday, getCurrentSessionNumber, getSessionLabel, getCurrentTimeHHMM, formatTime12h } from '@/lib/dates';
import { CheckIn, Completion, Task, TodayTaskStatus } from '@/lib/types';
import { Plus, Check, Repeat, RotateCw, ChevronRight, Circle, CheckCircle2, Clock, AlertCircle, CalendarDays } from 'lucide-react';

export default function DashboardPage() {
  const { user } = useAuth();
  const router = useRouter();
  const { fetchCheckIns, quickComplete } = useCheckIn(user?.id);
  const { tasks, fetchTasks } = useTasks(user?.id);
  const [checkIns, setCheckIns] = useState<CheckIn[]>([]);
  const [completions, setCompletions] = useState<Completion[]>([]);
  const [allTasks, setAllTasks] = useState<Task[]>([]);
  const [loaded, setLoaded] = useState(false);
  const [togglingTask, setTogglingTask] = useState<string | null>(null);
  const mountRef = useRef(0);

  const timezone = user?.timezone || 'America/New_York';
  const startDate = user?.start_date || getUserToday(timezone);
  const { daysLeft, progress } = useCountdown(startDate, timezone);

  // Always fetch fresh data on mount/navigation
  useEffect(() => {
    if (!user) return;
    mountRef.current += 1;
    const currentMount = mountRef.current;

    const load = async () => {
      const [activeTasks, allTaskList] = await Promise.all([
        fetchTasks(false),
        fetchTasks(true),
      ]);
      if (mountRef.current !== currentMount) return;
      setAllTasks(allTaskList);

      const { checkIns: ci, completions: comp } = await fetchCheckIns(startDate);
      if (mountRef.current !== currentMount) return;
      setCheckIns(ci);
      setCompletions(comp);
      setLoaded(true);
    };

    load();
  }, [user?.id]); // eslint-disable-line react-hooks/exhaustive-deps

  const stats = useStats(checkIns, completions, tasks, allTasks, startDate, timezone);

  const today = getUserToday(timezone);
  const checkInTimes = (user?.check_in_times || ['07:00', '12:00', '20:00']) as string[];
  const currentSession = getCurrentSessionNumber(checkInTimes, timezone);
  const currentTime = getCurrentTimeHHMM(timezone);

  const todayCheckIns = checkIns.filter((ci) => ci.date === today);
  const todayCompletions = completions.filter((c) =>
    todayCheckIns.some((ci) => ci.id === c.check_in_id)
  );

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
  const allTasksDone = tasksCompleted === tasks.length && tasks.length > 0;

  // Quick-complete handler
  const handleQuickToggle = async (task: Task, currentlyDone: boolean, completedCount: number, requiredCount: number) => {
    setTogglingTask(task.id);

    const shouldComplete = !currentlyDone;

    if (task.frequency === 'per_session' && completedCount > 0 && completedCount < requiredCount) {
      const sessionsWithCompletion = todayCheckIns
        .filter((ci) => todayCompletions.some((c) => c.check_in_id === ci.id && c.task_id === task.id && c.completed))
        .map((ci) => ci.session_number);

      let targetSession = quickSession;
      for (let s = 1; s <= 3; s++) {
        if (!sessionsWithCompletion.includes(s)) {
          targetSession = s;
          break;
        }
      }

      const result = await quickComplete(today, targetSession, task.id, true, tasks.map((t) => t.id));
      if (result.success) {
        const { checkIns: ci, completions: comp } = await fetchCheckIns(startDate);
        setCheckIns(ci);
        setCompletions(comp);
      }
    } else {
      const result = await quickComplete(today, quickSession, task.id, shouldComplete, tasks.map((t) => t.id));
      if (result.success) {
        const { checkIns: ci, completions: comp } = await fetchCheckIns(startDate);
        setCheckIns(ci);
        setCompletions(comp);
      }
    }

    setTogglingTask(null);
  };

  // Build session timeline
  const sessions = [...checkInTimes]
    .sort()
    .map((time, i) => {
      const sessionNum = i + 1;
      const existingCheckIn = todayCheckIns.find((ci) => ci.session_number === sessionNum);

      let status: 'completed' | 'available' | 'upcoming' | 'missed';
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

        <div className="rounded-2xl bg-surface p-6 text-center">
          <div className="mx-auto mb-3 flex h-16 w-16 items-center justify-center rounded-full bg-accent/20">
            <CalendarDays size={28} className="text-accent-light" />
          </div>
          <p className="mb-1 text-4xl font-black tabular-nums text-foreground">{daysLeft}</p>
          <p className="mb-4 text-xs text-muted">days until summer</p>
          <div className="h-2 w-full overflow-hidden rounded-full bg-surface-light">
            <div
              className="animate-grow h-full rounded-full bg-gradient-to-r from-accent to-accent-light"
              style={{ width: `${progress}%` }}
            />
          </div>
        </div>

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

  return (
    <div className="mx-auto max-w-md px-4 pt-6 pb-24">
      {/* Header */}
      <div className="mb-5 flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-foreground">
            Hey, {user?.display_name} 👋
          </h1>
          <p className="text-xs text-muted">Let&apos;s make today count.</p>
        </div>
        <StreakFlame streak={stats.overall.currentStreak} />
      </div>

      {/* Hero: Today's Progress */}
      <div className="mb-4 flex items-center gap-5 rounded-2xl bg-surface p-5">
        <ProgressRing percentage={stats.overall.today} size={90} strokeWidth={7} label="today" />
        <div className="flex-1">
          <p className="text-2xl font-black text-foreground">
            {tasksCompleted}<span className="text-base font-normal text-muted">/{tasks.length}</span>
          </p>
          <p className="text-xs text-muted">tasks done today</p>
          <div className="mt-2 h-1.5 w-full overflow-hidden rounded-full bg-surface-light">
            <div
              className="h-full rounded-full bg-gradient-to-r from-accent to-success transition-all duration-500"
              style={{ width: `${tasks.length > 0 ? (tasksCompleted / tasks.length) * 100 : 0}%` }}
            />
          </div>
          {allTasksDone && (
            <p className="mt-1.5 text-xs font-semibold text-success">All done! Great work!</p>
          )}
        </div>
      </div>

      {/* Today's Tasks — Quick Complete */}
      <div className="mb-4">
        <h2 className="mb-2.5 text-xs font-semibold uppercase tracking-wider text-muted">
          Today&apos;s Tasks
        </h2>
        <div className="space-y-2">
          {todayTaskStatuses.map(({ task, completedCount, requiredCount, done }, index) => {
            const isToggling = togglingTask === task.id;
            return (
              <button
                key={task.id}
                onClick={() => handleQuickToggle(task, done, completedCount, requiredCount)}
                disabled={isToggling || (task.frequency === 'per_session' && done)}
                className={`stagger-item flex w-full items-center gap-3 rounded-xl px-4 py-3.5 text-left transition-all active:scale-[0.98] ${
                  done
                    ? 'bg-success/10 border border-success/20'
                    : 'bg-surface border border-transparent hover:border-accent/20'
                } disabled:active:scale-100`}
              >
                {/* Checkmark / spinner */}
                <div className="shrink-0">
                  {isToggling ? (
                    <div className="h-7 w-7 animate-spin rounded-full border-2 border-accent border-t-transparent" />
                  ) : done ? (
                    <div className="check-pop flex h-7 w-7 items-center justify-center rounded-full bg-success">
                      <Check size={16} className="text-white" strokeWidth={3} />
                    </div>
                  ) : (
                    <div className="flex h-7 w-7 items-center justify-center rounded-full border-2 border-muted/30">
                      <span className="text-sm">{task.emoji}</span>
                    </div>
                  )}
                </div>

                {/* Task info */}
                <div className="flex-1 min-w-0">
                  <p className={`text-sm font-medium ${done ? 'text-success line-through decoration-success/30' : 'text-foreground'}`}>
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
                        {completedCount}/{requiredCount} sessions
                      </span>
                    )}
                  </div>
                </div>

                {/* Progress dots for per_session */}
                {requiredCount > 1 && (
                  <div className="flex gap-1.5 shrink-0">
                    {Array.from({ length: requiredCount }).map((_, i) => (
                      <div
                        key={i}
                        className={`h-2.5 w-2.5 rounded-full transition-all ${
                          i < completedCount ? 'bg-success scale-110' : 'bg-surface-light'
                        }`}
                      />
                    ))}
                  </div>
                )}
              </button>
            );
          })}
        </div>
      </div>

      {/* Your Day — Session Timeline */}
      <div className="mb-4">
        <h2 className="mb-2.5 text-xs font-semibold uppercase tracking-wider text-muted">
          Your Day
        </h2>
        <div className="space-y-0">
          {sessions.map((session, i) => {
            const completedCount = session.completions?.filter((c) => c.completed).length || 0;
            const isCompleted = session.status === 'completed';
            const isAvailable = session.status === 'available';
            const isMissed = session.status === 'missed';
            const isUpcoming = session.status === 'upcoming';

            return (
              <div key={session.sessionNumber} className="stagger-item">
                {/* Timeline connector */}
                <div className="flex">
                  {/* Timeline dot + line */}
                  <div className="flex flex-col items-center mr-3 pt-1">
                    {isCompleted ? (
                      <div className="h-5 w-5 rounded-full bg-success flex items-center justify-center shrink-0">
                        <Check size={12} className="text-white" strokeWidth={3} />
                      </div>
                    ) : isAvailable ? (
                      <div className="h-5 w-5 rounded-full bg-accent pulse-glow shrink-0" />
                    ) : isMissed ? (
                      <div className="h-5 w-5 rounded-full bg-danger/60 flex items-center justify-center shrink-0">
                        <AlertCircle size={12} className="text-white" />
                      </div>
                    ) : (
                      <div className="h-5 w-5 rounded-full border-2 border-surface-light shrink-0" />
                    )}
                    {i < sessions.length - 1 && (
                      <div className={`w-0.5 flex-1 min-h-4 ${
                        isCompleted ? 'bg-success/30' : 'bg-surface-light'
                      }`} />
                    )}
                  </div>

                  {/* Session card */}
                  <div className="flex-1 pb-3">
                    <div
                      className={`rounded-xl transition-all ${
                        isAvailable
                          ? 'bg-accent/10 border border-accent/30 p-3.5 cursor-pointer active:scale-[0.98]'
                          : isCompleted
                          ? 'bg-surface/60 p-3'
                          : isMissed
                          ? 'bg-danger/5 p-3'
                          : 'bg-surface/30 p-3'
                      }`}
                      onClick={isAvailable ? () => router.push('/checkin') : undefined}
                    >
                      {/* Session header */}
                      <div className="flex items-center justify-between">
                        <div>
                          <p className={`text-sm font-semibold ${
                            isCompleted ? 'text-success' : isAvailable ? 'text-accent-light' : isMissed ? 'text-danger/70' : 'text-muted'
                          }`}>
                            {session.label}
                          </p>
                          <p className="text-[11px] text-muted">{formatTime12h(session.time)}</p>
                        </div>
                        {isCompleted && (
                          <span className="text-xs text-success font-medium">
                            {completedCount}/{tasks.length}
                          </span>
                        )}
                        {isAvailable && (
                          <div className="flex items-center gap-1 rounded-lg bg-accent px-3 py-1.5">
                            <span className="text-xs font-bold text-white">Check in</span>
                            <ChevronRight size={14} className="text-white" />
                          </div>
                        )}
                        {isMissed && (
                          <span className="text-[11px] text-danger/50 font-medium">Missed</span>
                        )}
                        {isUpcoming && (
                          <span className="text-[11px] text-muted flex items-center gap-1">
                            <Clock size={10} />
                            {formatTime12h(session.time)}
                          </span>
                        )}
                      </div>

                      {/* Completed session — show tasks inline */}
                      {isCompleted && tasks.length > 0 && (
                        <div className="mt-2.5 space-y-1 border-t border-surface-light/50 pt-2">
                          {tasks.map((t) => {
                            const taskDone = session.completions?.some(
                              (c) => c.task_id === t.id && c.completed
                            );
                            return (
                              <div
                                key={t.id}
                                className="flex items-center gap-2 py-0.5"
                              >
                                {taskDone ? (
                                  <CheckCircle2 size={14} className="text-success shrink-0" />
                                ) : (
                                  <Circle size={14} className="text-muted/30 shrink-0" />
                                )}
                                <span className={`text-xs ${taskDone ? 'text-foreground/70' : 'text-muted/40 line-through'}`}>
                                  {t.emoji} {t.name}
                                </span>
                              </div>
                            );
                          })}
                        </div>
                      )}

                      {/* Missed session — show what was missed */}
                      {isMissed && tasks.filter(t => t.frequency === 'per_session').length > 0 && (
                        <div className="mt-2 space-y-0.5">
                          {tasks.filter(t => t.frequency === 'per_session').map((t) => (
                            <div key={t.id} className="flex items-center gap-2 py-0.5">
                              <Circle size={12} className="text-danger/20 shrink-0" />
                              <span className="text-[11px] text-danger/30 line-through">
                                {t.emoji} {t.name}
                              </span>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Countdown + Clock row */}
      <div className="mb-4 flex items-center gap-3">
        <div className="flex-1 rounded-xl bg-surface p-4 text-center">
          <p className="text-2xl font-black tabular-nums text-foreground">{daysLeft}</p>
          <p className="text-[10px] font-medium uppercase tracking-wider text-muted">days left</p>
          <div className="mt-2 h-1 w-full overflow-hidden rounded-full bg-surface-light">
            <div
              className="animate-grow h-full rounded-full bg-gradient-to-r from-accent to-accent-light"
              style={{ width: `${progress}%` }}
            />
          </div>
        </div>
        <div className="flex-1 rounded-xl bg-surface p-4">
          <DayClock timezone={timezone} />
        </div>
      </div>

      {/* Quick Stats */}
      <div className="mb-4 grid grid-cols-4 gap-2">
        {[
          { label: 'Today', value: `${stats.overall.today}%` },
          { label: 'Week', value: `${stats.overall.week}%` },
          { label: 'Streak', value: String(stats.overall.currentStreak) },
          { label: 'All Time', value: `${stats.overall.allTime}%` },
        ].map((stat) => (
          <div key={stat.label} className="rounded-xl bg-surface p-3 text-center">
            <p className="text-lg font-bold text-foreground">{stat.value}</p>
            <p className="text-[10px] text-muted">{stat.label}</p>
          </div>
        ))}
      </div>

      {/* Motivational quote */}
      {stats.overall.today > 0 && (
        <div className="rounded-xl bg-surface/50 p-4 text-center">
          <p className="text-sm italic text-muted">
            {stats.overall.today === 100
              ? '"Perfect day. You\'re unstoppable."'
              : stats.overall.today >= 75
              ? '"Great progress. Keep that momentum!"'
              : stats.overall.today >= 50
              ? '"You\'re halfway there. Push through!"'
              : '"Every step counts. Keep going."'}
          </p>
        </div>
      )}
    </div>
  );
}
