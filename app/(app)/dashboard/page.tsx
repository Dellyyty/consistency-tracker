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
import { TASK_EMOJIS } from '@/lib/constants';
import { getUserToday, getCurrentSessionNumber, getSessionLabel, getCurrentTimeHHMM, formatTime12h } from '@/lib/dates';
import { CheckIn, Completion, Task, TaskFrequency } from '@/lib/types';
import { Plus, Check, Repeat, RotateCw, CalendarDays, X, Trash2, Pencil } from 'lucide-react';

export default function DashboardPage() {
  const { user } = useAuth();
  const router = useRouter();
  const { fetchCheckIns, quickComplete } = useCheckIn(user?.id);
  const { tasks, fetchTasks, addTask, removeTask, updateTask } = useTasks(user?.id);
  const [checkIns, setCheckIns] = useState<CheckIn[]>([]);
  const [completions, setCompletions] = useState<Completion[]>([]);
  const [allTasks, setAllTasks] = useState<Task[]>([]);
  const [loaded, setLoaded] = useState(false);
  // Track which bubble is toggling: "taskId-sessionNum"
  const [togglingBubble, setTogglingBubble] = useState<string | null>(null);
  const mountRef = useRef(0);

  // Add task form
  const [showAddTask, setShowAddTask] = useState(false);
  const [newName, setNewName] = useState('');
  const [newEmoji, setNewEmoji] = useState('💪');
  const [newFreq, setNewFreq] = useState<TaskFrequency>('per_session');
  const [showEmojis, setShowEmojis] = useState(false);
  const [addingTask, setAddingTask] = useState(false);

  // Edit mode
  const [editMode, setEditMode] = useState(false);
  const [confirmRemove, setConfirmRemove] = useState<string | null>(null);

  const timezone = user?.timezone || 'America/New_York';
  const startDate = user?.start_date || getUserToday(timezone);
  const { daysLeft, progress } = useCountdown(startDate, timezone);

  useEffect(() => {
    if (!user) return;
    mountRef.current += 1;
    const currentMount = mountRef.current;
    const load = async () => {
      const [, allTaskList] = await Promise.all([fetchTasks(false), fetchTasks(true)]);
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

  const reloadData = async () => {
    const { checkIns: ci, completions: comp } = await fetchCheckIns(startDate);
    setCheckIns(ci);
    setCompletions(comp);
  };

  const stats = useStats(checkIns, completions, tasks, allTasks, startDate, timezone);
  const today = getUserToday(timezone);
  const checkInTimes = (user?.check_in_times || ['07:00', '12:00', '20:00']) as string[];
  const sortedTimes = [...checkInTimes].sort();
  const currentSession = getCurrentSessionNumber(checkInTimes, timezone);
  const currentTime = getCurrentTimeHHMM(timezone);

  const todayCheckIns = checkIns.filter((ci) => ci.date === today);
  const todayCompletions = completions.filter((c) =>
    todayCheckIns.some((ci) => ci.id === c.check_in_id)
  );

  // Session info for column headers
  const sessionCols = sortedTimes.map((time, i) => {
    const num = i + 1;
    const ci = todayCheckIns.find((c) => c.session_number === num);
    const isPast = currentTime > time && currentSession !== num;
    const isCurrent = currentSession === num;
    const isFuture = currentTime < time && !isCurrent;
    return { num, time, label: ['AM', 'MID', 'PM'][i] || `S${num}`, ci, isPast, isCurrent, isFuture };
  });

  // For each task + session: is it done?
  const getTaskSessionDone = (taskId: string, sessionNum: number): boolean => {
    const ci = todayCheckIns.find((c) => c.session_number === sessionNum);
    if (!ci) return false;
    return todayCompletions.some((c) => c.check_in_id === ci.id && c.task_id === taskId && c.completed);
  };

  // For daily tasks: is it done in ANY session?
  const isDailyTaskDone = (taskId: string): boolean => {
    return todayCompletions.some((c) => c.task_id === taskId && c.completed);
  };

  // Which session was the daily task completed in?
  const dailyTaskCompletedSession = (taskId: string): number | null => {
    for (const ci of todayCheckIns) {
      if (todayCompletions.some((c) => c.check_in_id === ci.id && c.task_id === taskId && c.completed)) {
        return ci.session_number;
      }
    }
    return null;
  };

  // Tap a bubble: toggle task for a specific session
  const handleBubbleTap = async (task: Task, sessionNum: number) => {
    if (editMode) return;
    const key = `${task.id}-${sessionNum}`;
    setTogglingBubble(key);

    const currentlyDone = task.frequency === 'daily'
      ? isDailyTaskDone(task.id)
      : getTaskSessionDone(task.id, sessionNum);

    const result = await quickComplete(today, sessionNum, task.id, !currentlyDone, tasks.map((t) => t.id));
    if (result.success) await reloadData();
    setTogglingBubble(null);
  };

  // Count completed tasks today
  const getTaskCompletedCount = (task: Task): number => {
    if (task.frequency === 'daily') return isDailyTaskDone(task.id) ? 1 : 0;
    return sessionCols.filter((s) => getTaskSessionDone(task.id, s.num)).length;
  };
  const getTaskRequired = (task: Task): number => task.frequency === 'daily' ? 1 : 3;
  const tasksFullyDone = tasks.filter((t) => getTaskCompletedCount(t) >= getTaskRequired(t)).length;
  const allDone = tasksFullyDone === tasks.length && tasks.length > 0;

  // Add task
  const handleAddTask = async () => {
    if (!newName.trim() || addingTask) return;
    setAddingTask(true);
    const result = await addTask(newName.trim(), newEmoji, newFreq);
    setAddingTask(false);
    if (result) {
      setNewName('');
      setNewEmoji('💪');
      setNewFreq('per_session');
      setShowEmojis(false);
      setShowAddTask(false);
    }
  };

  const handleRemoveTask = async (taskId: string) => {
    if (confirmRemove === taskId) {
      await removeTask(taskId);
      setConfirmRemove(null);
    } else {
      setConfirmRemove(taskId);
      setTimeout(() => setConfirmRemove((prev) => (prev === taskId ? null : prev)), 3000);
    }
  };

  const handleToggleFreq = async (taskId: string, current: TaskFrequency) => {
    await updateTask(taskId, { frequency: current === 'daily' ? 'per_session' : 'daily' });
  };

  if (!loaded) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-accent border-t-transparent" />
      </div>
    );
  }

  // Empty state
  if (tasks.length === 0 && !showAddTask) {
    return (
      <div className="mx-auto max-w-md px-4 pt-6 pb-24">
        <div className="mb-5 flex items-center justify-between">
          <div>
            <h1 className="text-xl font-bold text-foreground">Welcome, {user?.display_name}!</h1>
            <p className="text-xs text-muted">Let&apos;s get you set up.</p>
          </div>
        </div>
        <div className="rounded-2xl bg-surface p-6 text-center">
          <div className="mx-auto mb-3 flex h-16 w-16 items-center justify-center rounded-full bg-accent/20">
            <CalendarDays size={28} className="text-accent-light" />
          </div>
          <p className="mb-1 text-4xl font-black tabular-nums text-foreground">{daysLeft}</p>
          <p className="mb-4 text-xs text-muted">days until summer</p>
        </div>
        <div className="mt-6 flex flex-col items-center gap-4 rounded-2xl border border-dashed border-surface-light bg-surface p-8">
          <Plus size={40} className="text-muted" />
          <h2 className="text-lg font-bold text-foreground">Add your first task</h2>
          <p className="text-center text-sm text-muted">What habits do you want to track?</p>
          <button
            onClick={() => setShowAddTask(true)}
            className="mt-2 rounded-xl bg-accent px-8 py-3 text-sm font-bold text-white transition-all hover:bg-accent-light active:scale-[0.98]"
          >
            Add Task
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
          <h1 className="text-xl font-bold text-foreground">Hey, {user?.display_name} 👋</h1>
          <p className="text-xs text-muted">Let&apos;s make today count.</p>
        </div>
        <StreakFlame streak={stats.overall.currentStreak} />
      </div>

      {/* Hero */}
      <div className="mb-4 flex items-center gap-5 rounded-2xl bg-surface p-5">
        <ProgressRing percentage={stats.overall.today} size={90} strokeWidth={7} label="today" />
        <div className="flex-1">
          <p className="text-2xl font-black text-foreground">
            {tasksFullyDone}<span className="text-base font-normal text-muted">/{tasks.length}</span>
          </p>
          <p className="text-xs text-muted">tasks done today</p>
          <div className="mt-2 h-1.5 w-full overflow-hidden rounded-full bg-surface-light">
            <div
              className="h-full rounded-full bg-gradient-to-r from-accent to-success transition-all duration-500"
              style={{ width: `${tasks.length > 0 ? (tasksFullyDone / tasks.length) * 100 : 0}%` }}
            />
          </div>
          {allDone && <p className="mt-1.5 text-xs font-semibold text-success">All done!</p>}
        </div>
      </div>

      {/* === THE CHECKLIST === */}
      <div className="mb-4 rounded-2xl bg-surface overflow-hidden">
        {/* Header row with session columns */}
        <div className="flex items-center px-4 py-2.5 border-b border-surface-light/50">
          <div className="flex-1">
            <div className="flex items-center justify-between">
              <h2 className="text-xs font-semibold uppercase tracking-wider text-muted">Tasks</h2>
              {tasks.length > 0 && (
                <button
                  onClick={() => { setEditMode(!editMode); setConfirmRemove(null); }}
                  className={`flex items-center gap-1 rounded-lg px-2 py-0.5 text-[11px] font-medium transition-all ${
                    editMode ? 'bg-accent/20 text-accent-light' : 'text-muted hover:text-foreground'
                  }`}
                >
                  <Pencil size={9} />
                  {editMode ? 'Done' : 'Edit'}
                </button>
              )}
            </div>
          </div>
          {!editMode && (
            <div className="flex gap-1 ml-3">
              {sessionCols.map((s) => (
                <div
                  key={s.num}
                  className={`w-10 text-center text-[9px] font-bold uppercase tracking-wider ${
                    s.isCurrent ? 'text-accent-light' : s.isPast ? 'text-muted' : 'text-muted/40'
                  }`}
                >
                  {s.label}
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Task rows */}
        {tasks.map((task, idx) => {
          const isDaily = task.frequency === 'daily';
          const dailyDone = isDailyTaskDone(task.id);
          const dailySession = dailyTaskCompletedSession(task.id);
          const totalDone = getTaskCompletedCount(task);
          const totalReq = getTaskRequired(task);
          const fullyDone = totalDone >= totalReq;

          return (
            <div
              key={task.id}
              className={`flex items-center px-4 py-3 transition-colors ${
                idx < tasks.length - 1 ? 'border-b border-surface-light/30' : ''
              } ${fullyDone ? 'bg-success/5' : ''}`}
            >
              {/* Task info */}
              <div className="flex flex-1 items-center gap-3 min-w-0">
                <span className="text-lg shrink-0">{task.emoji}</span>
                <div className="min-w-0">
                  <p className={`text-sm font-medium truncate ${fullyDone ? 'text-success' : 'text-foreground'}`}>
                    {task.name}
                  </p>
                  <p className="text-[10px] text-muted flex items-center gap-0.5">
                    {isDaily ? <><RotateCw size={8} /> 1x daily</> : <><Repeat size={8} /> {totalDone}/{totalReq}</>}
                  </p>
                </div>
              </div>

              {/* Edit mode controls */}
              {editMode ? (
                <div className="flex items-center gap-2 shrink-0 ml-2">
                  <button
                    onClick={() => handleToggleFreq(task.id, task.frequency)}
                    className="rounded-lg bg-surface-light px-2.5 py-1 text-[10px] font-medium text-muted transition-all hover:text-foreground"
                  >
                    {isDaily ? '1x/day' : '3x/day'}
                  </button>
                  <button
                    onClick={() => handleRemoveTask(task.id)}
                    className={`rounded-lg p-1.5 transition-all ${
                      confirmRemove === task.id ? 'bg-danger text-white' : 'text-muted hover:bg-danger/20 hover:text-danger'
                    }`}
                  >
                    <Trash2 size={14} />
                  </button>
                </div>
              ) : (
                /* Session bubbles */
                <div className="flex gap-1 ml-3 shrink-0">
                  {isDaily ? (
                    /* Daily task: one wide bubble spanning the sessions area */
                    <button
                      onClick={() => handleBubbleTap(task, dailySession || currentSession || 1)}
                      disabled={togglingBubble === `${task.id}-${dailySession || currentSession || 1}`}
                      className="flex items-center justify-center"
                      style={{ width: `${sessionCols.length * 40 + (sessionCols.length - 1) * 4}px` }}
                    >
                      {togglingBubble?.startsWith(`${task.id}-`) ? (
                        <div className="h-8 w-8 animate-spin rounded-full border-2 border-accent border-t-transparent" />
                      ) : dailyDone ? (
                        <div className="check-pop flex h-8 w-8 items-center justify-center rounded-full bg-success">
                          <Check size={18} className="text-white" strokeWidth={3} />
                        </div>
                      ) : (
                        <div className="flex h-8 w-8 items-center justify-center rounded-full border-[2.5px] border-muted/25 transition-all hover:border-accent/50 active:scale-90" />
                      )}
                    </button>
                  ) : (
                    /* Per-session task: one bubble per session */
                    sessionCols.map((s) => {
                      const done = getTaskSessionDone(task.id, s.num);
                      const bubbleKey = `${task.id}-${s.num}`;
                      const isToggling = togglingBubble === bubbleKey;
                      const canTap = s.isPast || s.isCurrent; // can tap past (late) or current

                      return (
                        <button
                          key={s.num}
                          onClick={() => canTap && handleBubbleTap(task, s.num)}
                          disabled={isToggling || (!canTap && !done)}
                          className="flex w-10 items-center justify-center"
                        >
                          {isToggling ? (
                            <div className="h-7 w-7 animate-spin rounded-full border-2 border-accent border-t-transparent" />
                          ) : done ? (
                            <div className="check-pop flex h-7 w-7 items-center justify-center rounded-full bg-success">
                              <Check size={14} className="text-white" strokeWidth={3} />
                            </div>
                          ) : canTap ? (
                            <div className={`flex h-7 w-7 items-center justify-center rounded-full border-[2.5px] transition-all active:scale-90 ${
                              s.isCurrent ? 'border-accent/40 hover:border-accent' : 'border-muted/25 hover:border-accent/40'
                            }`} />
                          ) : (
                            <div className="h-7 w-7 rounded-full border-[2px] border-surface-light/50" />
                          )}
                        </button>
                      );
                    })
                  )}
                </div>
              )}
            </div>
          );
        })}

        {/* Add Task row */}
        {showAddTask ? (
          <div className="border-t border-surface-light/30 p-4 space-y-3">
            <div className="flex gap-2">
              <button
                onClick={() => setShowEmojis(!showEmojis)}
                className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-surface-light text-xl"
              >
                {newEmoji}
              </button>
              <input
                type="text"
                value={newName}
                onChange={(e) => setNewName(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleAddTask()}
                placeholder="Task name..."
                autoFocus
                className="flex-1 rounded-lg bg-surface-light px-3 py-2 text-sm text-foreground placeholder:text-muted focus:outline-none focus:ring-1 focus:ring-accent"
                maxLength={40}
              />
              <button
                onClick={() => { setShowAddTask(false); setNewName(''); setShowEmojis(false); }}
                className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg text-muted hover:text-foreground"
              >
                <X size={18} />
              </button>
            </div>
            {showEmojis && (
              <div className="flex flex-wrap gap-2">
                {TASK_EMOJIS.map((emoji) => (
                  <button
                    key={emoji}
                    onClick={() => { setNewEmoji(emoji); setShowEmojis(false); }}
                    className={`flex h-9 w-9 items-center justify-center rounded-lg text-lg transition-all ${
                      newEmoji === emoji ? 'bg-accent/30 ring-1 ring-accent' : 'bg-surface-light'
                    }`}
                  >
                    {emoji}
                  </button>
                ))}
              </div>
            )}
            <div className="flex gap-2">
              <button
                onClick={() => setNewFreq('per_session')}
                className={`flex flex-1 items-center justify-center gap-1.5 rounded-lg py-2 text-xs font-medium transition-all ${
                  newFreq === 'per_session' ? 'bg-accent/20 text-accent-light ring-1 ring-accent/30' : 'bg-surface-light text-muted'
                }`}
              >
                <Repeat size={12} /> Every check-in
              </button>
              <button
                onClick={() => setNewFreq('daily')}
                className={`flex flex-1 items-center justify-center gap-1.5 rounded-lg py-2 text-xs font-medium transition-all ${
                  newFreq === 'daily' ? 'bg-accent/20 text-accent-light ring-1 ring-accent/30' : 'bg-surface-light text-muted'
                }`}
              >
                <RotateCw size={12} /> Once daily
              </button>
            </div>
            <button
              onClick={handleAddTask}
              disabled={!newName.trim() || addingTask}
              className="flex w-full items-center justify-center gap-2 rounded-xl bg-accent py-3 text-sm font-bold text-white transition-all hover:bg-accent-light active:scale-[0.98] disabled:opacity-40"
            >
              {addingTask ? (
                <div className="h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent" />
              ) : (
                <><Plus size={16} /> Add Task</>
              )}
            </button>
          </div>
        ) : (
          <button
            onClick={() => setShowAddTask(true)}
            className="flex w-full items-center justify-center gap-2 border-t border-surface-light/30 py-3 text-sm font-medium text-muted transition-all hover:text-accent-light"
          >
            <Plus size={16} /> Add task
          </button>
        )}
      </div>

      {/* Countdown + Clock */}
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
        ].map((s) => (
          <div key={s.label} className="rounded-xl bg-surface p-3 text-center">
            <p className="text-lg font-bold text-foreground">{s.value}</p>
            <p className="text-[10px] text-muted">{s.label}</p>
          </div>
        ))}
      </div>

      {/* Motivational */}
      {stats.overall.today > 0 && (
        <div className="rounded-xl bg-surface/50 p-4 text-center">
          <p className="text-sm italic text-muted">
            {stats.overall.today === 100 ? '"Perfect day. You\'re unstoppable."'
              : stats.overall.today >= 75 ? '"Great progress. Keep that momentum!"'
              : stats.overall.today >= 50 ? '"Halfway there. Push through!"'
              : '"Every step counts. Keep going."'}
          </p>
        </div>
      )}
    </div>
  );
}
