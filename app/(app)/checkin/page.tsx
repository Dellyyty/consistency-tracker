'use client';

import { useEffect, useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/lib/hooks/useAuth';
import { useCheckIn } from '@/lib/hooks/useCheckIn';
import { useTasks } from '@/lib/hooks/useTasks';
import TaskCheckbox from '@/components/TaskCheckbox';
import { getUserToday, getCurrentSessionNumber, getSessionLabel, getNextSessionTime, formatTime12h, getCurrentTimeHHMM } from '@/lib/dates';
import { CheckIn, Completion, Task } from '@/lib/types';
import { CheckCircle2, Clock, ArrowLeft, PartyPopper, Sparkles } from 'lucide-react';

export default function CheckInPage() {
  const { user } = useAuth();
  const router = useRouter();
  const { fetchCheckIns, submitCheckIn, loading: submitting } = useCheckIn(user?.id);
  const { tasks, fetchTasks } = useTasks(user?.id);
  const [todayCheckIns, setTodayCheckIns] = useState<CheckIn[]>([]);
  const [todayCompletions, setTodayCompletions] = useState<Completion[]>([]);
  const [checked, setChecked] = useState<Record<string, boolean>>({});
  const [submitted, setSubmitted] = useState(false);
  const [loaded, setLoaded] = useState(false);

  const timezone = user?.timezone || 'America/New_York';
  const today = getUserToday(timezone);
  const checkInTimes = (user?.check_in_times || ['07:00', '12:00', '20:00']) as string[];
  const currentSession = getCurrentSessionNumber(checkInTimes, timezone);
  const currentTime = getCurrentTimeHHMM(timezone);

  const loadData = useCallback(async () => {
    if (!user) return;
    await fetchTasks();
    const { checkIns, completions } = await fetchCheckIns(today, today);
    setTodayCheckIns(checkIns);
    setTodayCompletions(completions);
    setLoaded(true);
  }, [user, fetchTasks, fetchCheckIns, today]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const alreadyCheckedIn = currentSession
    ? todayCheckIns.some((ci) => ci.session_number === currentSession)
    : false;

  const existingCheckIn = currentSession
    ? todayCheckIns.find((ci) => ci.session_number === currentSession)
    : null;

  const existingCompletions = existingCheckIn
    ? todayCompletions.filter((c) => c.check_in_id === existingCheckIn.id)
    : [];

  const sortedTimes = [...checkInTimes].sort();
  const allSessionsDone = sortedTimes.every((_, i) =>
    todayCheckIns.some((ci) => ci.session_number === i + 1)
  );

  // Filter tasks for this session:
  // - per_session tasks always show
  // - daily tasks only show if NOT already completed in a previous session today
  const visibleTasks = tasks.filter((task) => {
    if (task.frequency === 'per_session') return true;
    // daily: check if already completed in any earlier session
    const alreadyDone = todayCompletions.some(
      (c) => c.task_id === task.id && c.completed
    );
    return !alreadyDone;
  });

  // All tasks shown in check-in (visible + already-done daily tasks shown as disabled)
  const dailyAlreadyDone = tasks.filter((task) => {
    if (task.frequency !== 'daily') return false;
    return todayCompletions.some((c) => c.task_id === task.id && c.completed);
  });

  const handleSubmit = async () => {
    if (!currentSession) return;

    // Submit completions for ALL tasks (visible ones get user selection, already-done daily tasks get false)
    const taskCompletions = tasks.map((t) => {
      // If daily task already done in prior session, don't re-submit
      if (dailyAlreadyDone.some((d) => d.id === t.id)) {
        return { taskId: t.id, completed: false };
      }
      return { taskId: t.id, completed: checked[t.id] || false };
    });

    const result = await submitCheckIn(today, currentSession, taskCompletions);
    if (result.success) {
      setSubmitted(true);
    }
  };

  const toggleAll = () => {
    const allChecked = visibleTasks.every((t) => checked[t.id]);
    const newState: Record<string, boolean> = {};
    visibleTasks.forEach((t) => {
      newState[t.id] = !allChecked;
    });
    setChecked(newState);
  };

  if (!loaded) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-accent border-t-transparent" />
      </div>
    );
  }

  // All sessions completed for the day
  if (allSessionsDone && loaded) {
    const totalTasks = tasks.reduce((sum, t) => sum + (t.frequency === 'daily' ? 1 : 3), 0);
    const totalCompleted = tasks.reduce((sum, t) => {
      const count = todayCompletions.filter((c) => c.task_id === t.id && c.completed).length;
      return sum + Math.min(count, t.frequency === 'daily' ? 1 : 3);
    }, 0);
    const pct = totalTasks > 0 ? Math.round((totalCompleted / totalTasks) * 100) : 0;

    return (
      <div className="mx-auto max-w-md px-4 pt-6">
        <div className="flex flex-col items-center gap-4 rounded-2xl bg-surface p-8 text-center fade-in-up">
          <PartyPopper size={56} className="text-warning" />
          <h2 className="text-xl font-bold text-foreground">All Done for Today!</h2>
          <p className="text-3xl font-black text-accent-light">{pct}%</p>
          <p className="text-sm text-muted">
            {totalCompleted}/{totalTasks} tasks completed today
          </p>

          <div className="mt-4 w-full space-y-3">
            {sortedTimes.map((time, i) => {
              const sessionNum = i + 1;
              const ci = todayCheckIns.find((c) => c.session_number === sessionNum);
              const comps = ci ? todayCompletions.filter((c) => c.check_in_id === ci.id) : [];
              const done = comps.filter((c) => c.completed).length;
              return (
                <div key={sessionNum} className="flex items-center justify-between rounded-lg bg-surface-light px-4 py-2.5">
                  <span className="text-sm font-medium text-foreground">{getSessionLabel(sessionNum)}</span>
                  <span className="text-sm text-muted">{done} tasks done</span>
                </div>
              );
            })}
          </div>
        </div>

        <button
          onClick={() => router.push('/dashboard')}
          className="mt-6 flex w-full items-center justify-center gap-2 rounded-xl bg-accent py-3.5 text-sm font-bold text-white transition-all hover:bg-accent-light active:scale-[0.98]"
        >
          Back to Dashboard
        </button>
      </div>
    );
  }

  // Before first check-in time
  if (!currentSession) {
    const nextTime = getNextSessionTime(checkInTimes, timezone);
    return (
      <div className="mx-auto flex max-w-md flex-col items-center justify-center px-4 pt-20">
        <Clock size={64} className="mb-4 text-muted" />
        <h2 className="text-xl font-bold text-foreground">Not yet!</h2>
        <p className="mt-2 text-center text-sm text-muted">
          {nextTime
            ? `Your first check-in is at ${formatTime12h(nextTime)}`
            : 'No more check-ins today'}
        </p>
        <button
          onClick={() => router.push('/dashboard')}
          className="mt-6 flex items-center gap-2 rounded-xl bg-surface px-6 py-3 text-sm font-medium text-foreground transition-all hover:bg-surface-light"
        >
          <ArrowLeft size={16} />
          Back to Dashboard
        </button>
      </div>
    );
  }

  // Just submitted
  if (submitted) {
    const completedTasks = visibleTasks.filter((t) => checked[t.id]);
    const nextTime = getNextSessionTime(checkInTimes, timezone);
    const sessionsLeft = sortedTimes.filter((_, i) =>
      !todayCheckIns.some((ci) => ci.session_number === i + 1) && i + 1 !== currentSession
    ).length;

    return (
      <div className="mx-auto max-w-md px-4 pt-6 fade-in-up">
        <div className="flex flex-col items-center gap-4 rounded-2xl bg-surface p-6">
          <Sparkles size={48} className="text-success" />
          <h2 className="text-xl font-bold text-foreground">
            {getSessionLabel(currentSession)} Done!
          </h2>
          <p className="text-sm text-muted">
            {completedTasks.length}/{visibleTasks.length} tasks completed
          </p>

          <div className="mt-2 w-full space-y-2">
            {visibleTasks.map((t) => (
              <TaskCheckbox
                key={t.id}
                emoji={t.emoji}
                name={t.name}
                checked={!!checked[t.id]}
                onChange={() => {}}
                disabled
              />
            ))}
            {dailyAlreadyDone.length > 0 && (
              <p className="pt-1 text-center text-[10px] text-muted">
                {dailyAlreadyDone.length} daily task{dailyAlreadyDone.length > 1 ? 's' : ''} already done earlier
              </p>
            )}
          </div>

          {sessionsLeft > 0 && nextTime && (
            <p className="mt-2 text-xs text-muted">
              Next check-in at {formatTime12h(nextTime)} ({sessionsLeft} session{sessionsLeft > 1 ? 's' : ''} left)
            </p>
          )}
        </div>

        <button
          onClick={() => router.push('/dashboard')}
          className="mt-6 flex w-full items-center justify-center gap-2 rounded-xl bg-accent py-3.5 text-sm font-bold text-white transition-all hover:bg-accent-light active:scale-[0.98]"
        >
          Continue to Dashboard
        </button>
      </div>
    );
  }

  // Already checked in this session
  if (alreadyCheckedIn) {
    const completedTasks = tasks.filter((t) =>
      existingCompletions.some((c) => c.task_id === t.id && c.completed)
    );
    const nextTime = getNextSessionTime(checkInTimes, timezone);

    return (
      <div className="mx-auto max-w-md px-4 pt-6">
        <div className="flex flex-col items-center gap-4 rounded-2xl bg-surface p-6">
          <CheckCircle2 size={48} className="text-success" />
          <h2 className="text-xl font-bold text-foreground">
            {getSessionLabel(currentSession)} Already Done
          </h2>
          <p className="text-sm text-muted">
            {completedTasks.length}/{tasks.length} tasks completed
          </p>

          <div className="mt-2 w-full space-y-2">
            {tasks.map((t) => {
              const done = completedTasks.some((ct) => ct.id === t.id);
              return (
                <TaskCheckbox
                  key={t.id}
                  emoji={t.emoji}
                  name={t.name}
                  checked={done}
                  onChange={() => {}}
                  disabled
                />
              );
            })}
          </div>

          {nextTime && (
            <p className="mt-2 text-xs text-muted">
              Next check-in at {formatTime12h(nextTime)}
            </p>
          )}
        </div>

        <button
          onClick={() => router.push('/dashboard')}
          className="mt-6 flex w-full items-center justify-center gap-2 rounded-xl bg-accent py-3.5 text-sm font-bold text-white transition-all hover:bg-accent-light active:scale-[0.98]"
        >
          Back to Dashboard
        </button>
      </div>
    );
  }

  // Active check-in form
  const checkedCount = visibleTasks.filter((t) => checked[t.id]).length;

  return (
    <div className="mx-auto max-w-md px-4 pt-6">
      {/* Header */}
      <div className="mb-6 flex items-start justify-between">
        <div>
          <button
            onClick={() => router.push('/dashboard')}
            className="mb-2 flex items-center gap-1 text-xs text-muted transition-colors hover:text-foreground"
          >
            <ArrowLeft size={14} />
            Dashboard
          </button>
          <h1 className="text-xl font-bold text-foreground">
            {getSessionLabel(currentSession)} Check-in
          </h1>
          <p className="text-sm text-muted">
            Tap each task you completed
          </p>
        </div>
        {visibleTasks.length > 0 && (
          <button
            onClick={toggleAll}
            className="mt-6 rounded-lg bg-surface px-3 py-1.5 text-xs font-medium text-accent-light transition-colors hover:bg-surface-light"
          >
            {visibleTasks.every((t) => checked[t.id]) ? 'Clear all' : 'Select all'}
          </button>
        )}
      </div>

      {tasks.length === 0 ? (
        <div className="flex flex-col items-center gap-4 rounded-2xl bg-surface p-8">
          <p className="text-sm text-muted">No tasks set up yet.</p>
          <button
            onClick={() => router.push('/settings')}
            className="rounded-xl bg-accent px-6 py-3 text-sm font-semibold text-white transition-all hover:bg-accent-light"
          >
            Add Tasks in Settings
          </button>
        </div>
      ) : (
        <>
          {/* Daily tasks already done */}
          {dailyAlreadyDone.length > 0 && (
            <div className="mb-4 rounded-xl bg-success/10 p-3">
              <p className="mb-2 text-xs font-medium text-success">Already done today</p>
              {dailyAlreadyDone.map((t) => (
                <div key={t.id} className="flex items-center gap-2 py-1 text-sm text-success/70">
                  <CheckCircle2 size={14} />
                  <span>{t.emoji} {t.name}</span>
                </div>
              ))}
            </div>
          )}

          {/* Visible tasks to check */}
          {visibleTasks.length > 0 ? (
            <div className="space-y-2">
              {visibleTasks.map((t) => (
                <TaskCheckbox
                  key={t.id}
                  emoji={t.emoji}
                  name={t.name}
                  checked={checked[t.id] || false}
                  onChange={(val) => setChecked((prev) => ({ ...prev, [t.id]: val }))}
                />
              ))}
            </div>
          ) : (
            <div className="rounded-xl bg-surface p-6 text-center">
              <p className="text-sm text-muted">All daily tasks already completed!</p>
              <p className="mt-1 text-xs text-muted">Nothing left for this session.</p>
            </div>
          )}

          <button
            onClick={handleSubmit}
            disabled={submitting}
            className="mt-6 flex w-full items-center justify-center gap-2 rounded-xl bg-accent py-4 text-base font-bold text-white transition-all hover:bg-accent-light active:scale-[0.98] disabled:opacity-50"
          >
            {submitting ? (
              <div className="h-5 w-5 animate-spin rounded-full border-2 border-white border-t-transparent" />
            ) : (
              <>
                <CheckCircle2 size={20} />
                Submit Check-in ({checkedCount}/{visibleTasks.length})
              </>
            )}
          </button>

          <p className="mt-3 text-center text-xs text-muted">
            It&apos;s okay to submit with incomplete tasks — honesty is the goal
          </p>
        </>
      )}
    </div>
  );
}
