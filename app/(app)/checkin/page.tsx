'use client';

import { useEffect, useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/lib/hooks/useAuth';
import { useCheckIn } from '@/lib/hooks/useCheckIn';
import { useTasks } from '@/lib/hooks/useTasks';
import TaskCheckbox from '@/components/TaskCheckbox';
import { getUserToday, getCurrentSessionNumber, getSessionLabel, getNextSessionTime, formatTime12h } from '@/lib/dates';
import { CheckIn, Completion } from '@/lib/types';
import { CheckCircle2, Clock, ArrowLeft } from 'lucide-react';

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

  // Check if current session already done
  const alreadyCheckedIn = currentSession
    ? todayCheckIns.some((ci) => ci.session_number === currentSession)
    : false;

  const existingCheckIn = currentSession
    ? todayCheckIns.find((ci) => ci.session_number === currentSession)
    : null;

  const existingCompletions = existingCheckIn
    ? todayCompletions.filter((c) => c.check_in_id === existingCheckIn.id)
    : [];

  const handleSubmit = async () => {
    if (!currentSession) return;

    const taskCompletions = tasks.map((t) => ({
      taskId: t.id,
      completed: checked[t.id] || false,
    }));

    const result = await submitCheckIn(today, currentSession, taskCompletions);
    if (result.success) {
      setSubmitted(true);
    }
  };

  const toggleAll = () => {
    const allChecked = tasks.every((t) => checked[t.id]);
    const newState: Record<string, boolean> = {};
    tasks.forEach((t) => {
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

  // No current session (before first check-in time)
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
          className="mt-6 flex items-center gap-2 text-sm text-accent-light"
        >
          <ArrowLeft size={16} />
          Back to dashboard
        </button>
      </div>
    );
  }

  // Already submitted (either before page load or just now)
  if (alreadyCheckedIn || submitted) {
    const completedTasks = submitted
      ? tasks.filter((t) => checked[t.id])
      : tasks.filter((t) => existingCompletions.some((c) => c.task_id === t.id && c.completed));

    return (
      <div className="mx-auto max-w-md px-4 pt-6">
        <div className="flex flex-col items-center gap-4 rounded-2xl bg-surface p-6">
          <CheckCircle2 size={56} className="text-success" />
          <h2 className="text-xl font-bold text-foreground">
            {getSessionLabel(currentSession)} Check-in Done!
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
        </div>

        <button
          onClick={() => router.push('/dashboard')}
          className="mt-6 flex w-full items-center justify-center gap-2 text-sm text-accent-light"
        >
          <ArrowLeft size={16} />
          Back to dashboard
        </button>
      </div>
    );
  }

  // Active check-in
  const checkedCount = Object.values(checked).filter(Boolean).length;

  return (
    <div className="mx-auto max-w-md px-4 pt-6">
      <div className="mb-6">
        <h1 className="text-xl font-bold text-foreground">
          {getSessionLabel(currentSession)} Check-in
        </h1>
        <p className="text-sm text-muted">
          What did you accomplish? Tap to mark completed.
        </p>
      </div>

      {tasks.length === 0 ? (
        <div className="flex flex-col items-center gap-4 rounded-2xl bg-surface p-8">
          <p className="text-sm text-muted">No tasks set up yet.</p>
          <button
            onClick={() => router.push('/settings')}
            className="rounded-xl bg-accent px-6 py-3 text-sm font-semibold text-white"
          >
            Add Tasks
          </button>
        </div>
      ) : (
        <>
          {/* Toggle all */}
          <button
            onClick={toggleAll}
            className="mb-3 text-xs text-accent-light hover:underline"
          >
            {tasks.every((t) => checked[t.id]) ? 'Uncheck all' : 'Check all'}
          </button>

          <div className="space-y-2">
            {tasks.map((t) => (
              <TaskCheckbox
                key={t.id}
                emoji={t.emoji}
                name={t.name}
                checked={checked[t.id] || false}
                onChange={(val) => setChecked((prev) => ({ ...prev, [t.id]: val }))}
              />
            ))}
          </div>

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
                Submit ({checkedCount}/{tasks.length})
              </>
            )}
          </button>
        </>
      )}
    </div>
  );
}
