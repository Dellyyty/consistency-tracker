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
import { CheckIn, Completion, Task, TaskFrequency, TodayTaskStatus } from '@/lib/types';
import { Plus, Check, Repeat, RotateCw, ChevronRight, Circle, CheckCircle2, Clock, AlertCircle, CalendarDays, X, Trash2, Pencil, Settings } from 'lucide-react';

export default function DashboardPage() {
  const { user } = useAuth();
  const router = useRouter();
  const { fetchCheckIns, quickComplete } = useCheckIn(user?.id);
  const { tasks, fetchTasks, addTask, removeTask, updateTask } = useTasks(user?.id);
  const [checkIns, setCheckIns] = useState<CheckIn[]>([]);
  const [completions, setCompletions] = useState<Completion[]>([]);
  const [allTasks, setAllTasks] = useState<Task[]>([]);
  const [loaded, setLoaded] = useState(false);
  const [togglingTask, setTogglingTask] = useState<string | null>(null);
  const mountRef = useRef(0);

  // Add task form state
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

  const reloadCompletions = async () => {
    const { checkIns: ci, completions: comp } = await fetchCheckIns(startDate);
    setCheckIns(ci);
    setCompletions(comp);
  };

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
    if (editMode) return;
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
      if (result.success) await reloadCompletions();
    } else {
      const result = await quickComplete(today, quickSession, task.id, shouldComplete, tasks.map((t) => t.id));
      if (result.success) await reloadCompletions();
    }

    setTogglingTask(null);
  };

  // Add task handler
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

  // Remove task handler
  const handleRemoveTask = async (taskId: string) => {
    if (confirmRemove === taskId) {
      await removeTask(taskId);
      setConfirmRemove(null);
    } else {
      setConfirmRemove(taskId);
      setTimeout(() => setConfirmRemove((prev) => (prev === taskId ? null : prev)), 3000);
    }
  };

  // Toggle frequency
  const handleToggleFreq = async (taskId: string, current: TaskFrequency) => {
    await updateTask(taskId, { frequency: current === 'daily' ? 'per_session' : 'daily' });
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

  // First-time user with no tasks — show inline add form
  if (tasks.length === 0 && !showAddTask) {
    return (
      <div className="mx-auto max-w-md px-4 pt-6 pb-24">
        <div className="mb-5 flex items-center justify-between">
          <div>
            <h1 className="text-xl font-bold text-foreground">
              Welcome, {user?.display_name}!
            </h1>
            <p className="text-xs text-muted">Let&apos;s get you set up.</p>
          </div>
          <StreakFlame streak={0} />
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
          <h2 className="text-lg font-bold text-foreground">Add your first task</h2>
          <p className="text-center text-sm text-muted">
            What habits do you want to track? Add them right here.
          </p>
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

      {/* Today's Tasks — with inline management */}
      <div className="mb-4">
        <div className="mb-2.5 flex items-center justify-between">
          <h2 className="text-xs font-semibold uppercase tracking-wider text-muted">
            Today&apos;s Tasks
          </h2>
          <div className="flex items-center gap-2">
            {tasks.length > 0 && (
              <button
                onClick={() => { setEditMode(!editMode); setConfirmRemove(null); }}
                className={`flex items-center gap-1 rounded-lg px-2 py-1 text-[11px] font-medium transition-all ${
                  editMode ? 'bg-accent/20 text-accent-light' : 'text-muted hover:text-foreground'
                }`}
              >
                <Pencil size={10} />
                {editMode ? 'Done' : 'Edit'}
              </button>
            )}
          </div>
        </div>

        <div className="space-y-2">
          {todayTaskStatuses.map(({ task, completedCount, requiredCount, done }) => {
            const isToggling = togglingTask === task.id;
            const isConfirmingRemove = confirmRemove === task.id;

            return (
              <div key={task.id} className="stagger-item">
                <button
                  onClick={() => !editMode && handleQuickToggle(task, done, completedCount, requiredCount)}
                  disabled={editMode || isToggling || (task.frequency === 'per_session' && done)}
                  className={`flex w-full items-center gap-3 rounded-xl px-4 py-3.5 text-left transition-all ${
                    editMode ? 'cursor-default' : 'active:scale-[0.98]'
                  } ${
                    done
                      ? 'bg-success/10 border border-success/20'
                      : 'bg-surface border border-transparent hover:border-accent/20'
                  } disabled:active:scale-100`}
                >
                  {/* Checkmark / spinner / emoji */}
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

                  {/* Edit mode: frequency toggle + delete */}
                  {editMode ? (
                    <div className="flex items-center gap-2 shrink-0">
                      <button
                        onClick={(e) => { e.stopPropagation(); handleToggleFreq(task.id, task.frequency); }}
                        className="rounded-lg bg-surface-light px-2 py-1 text-[10px] font-medium text-muted transition-all hover:text-foreground"
                      >
                        {task.frequency === 'daily' ? '1x' : '3x'}
                      </button>
                      <button
                        onClick={(e) => { e.stopPropagation(); handleRemoveTask(task.id); }}
                        className={`rounded-lg p-1.5 transition-all ${
                          isConfirmingRemove
                            ? 'bg-danger text-white'
                            : 'text-muted hover:bg-danger/20 hover:text-danger'
                        }`}
                      >
                        <Trash2 size={14} />
                      </button>
                    </div>
                  ) : (
                    /* Progress dots for per_session */
                    requiredCount > 1 ? (
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
                    ) : null
                  )}
                </button>
              </div>
            );
          })}

          {/* Add Task Button / Inline Form */}
          {showAddTask ? (
            <div className="fade-in-up rounded-xl bg-surface border border-accent/20 p-4 space-y-3">
              {/* Name + emoji row */}
              <div className="flex gap-2">
                <button
                  onClick={() => setShowEmojis(!showEmojis)}
                  className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-surface-light text-xl transition-colors hover:bg-surface-light/80"
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
                  className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg text-muted hover:text-foreground transition-colors"
                >
                  <X size={18} />
                </button>
              </div>

              {/* Emoji picker */}
              {showEmojis && (
                <div className="flex flex-wrap gap-2 border-t border-surface-light pt-3">
                  {TASK_EMOJIS.map((emoji) => (
                    <button
                      key={emoji}
                      onClick={() => { setNewEmoji(emoji); setShowEmojis(false); }}
                      className={`flex h-9 w-9 items-center justify-center rounded-lg text-lg transition-all ${
                        newEmoji === emoji ? 'bg-accent/30 ring-1 ring-accent' : 'bg-surface-light hover:bg-surface-light/80'
                      }`}
                    >
                      {emoji}
                    </button>
                  ))}
                </div>
              )}

              {/* Frequency toggle */}
              <div className="flex gap-2">
                <button
                  onClick={() => setNewFreq('per_session')}
                  className={`flex flex-1 items-center justify-center gap-1.5 rounded-lg py-2 text-xs font-medium transition-all ${
                    newFreq === 'per_session'
                      ? 'bg-accent/20 text-accent-light ring-1 ring-accent/30'
                      : 'bg-surface-light text-muted'
                  }`}
                >
                  <Repeat size={12} />
                  Every check-in
                </button>
                <button
                  onClick={() => setNewFreq('daily')}
                  className={`flex flex-1 items-center justify-center gap-1.5 rounded-lg py-2 text-xs font-medium transition-all ${
                    newFreq === 'daily'
                      ? 'bg-accent/20 text-accent-light ring-1 ring-accent/30'
                      : 'bg-surface-light text-muted'
                  }`}
                >
                  <RotateCw size={12} />
                  Once daily
                </button>
              </div>

              {/* Save button */}
              <button
                onClick={handleAddTask}
                disabled={!newName.trim() || addingTask}
                className="flex w-full items-center justify-center gap-2 rounded-xl bg-accent py-3 text-sm font-bold text-white transition-all hover:bg-accent-light active:scale-[0.98] disabled:opacity-40"
              >
                {addingTask ? (
                  <div className="h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent" />
                ) : (
                  <>
                    <Plus size={16} />
                    Add Task
                  </>
                )}
              </button>
            </div>
          ) : (
            <button
              onClick={() => setShowAddTask(true)}
              className="flex w-full items-center justify-center gap-2 rounded-xl border border-dashed border-surface-light py-3 text-sm font-medium text-muted transition-all hover:border-accent/30 hover:text-accent-light active:scale-[0.98]"
            >
              <Plus size={16} />
              Add task
            </button>
          )}
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
                          ? 'bg-danger/5 border border-danger/10 p-3 cursor-pointer active:scale-[0.98]'
                          : 'bg-surface/30 p-3'
                      }`}
                      onClick={
                        isAvailable ? () => router.push('/checkin') :
                        isMissed ? () => router.push(`/checkin?session=${session.sessionNumber}`) :
                        undefined
                      }
                    >
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
                          <div className="flex items-center gap-1 rounded-lg bg-danger/20 px-2.5 py-1.5">
                            <span className="text-[11px] font-bold text-danger">Late check-in</span>
                            <ChevronRight size={12} className="text-danger" />
                          </div>
                        )}
                        {isUpcoming && (
                          <span className="text-[11px] text-muted flex items-center gap-1">
                            <Clock size={10} />
                            {formatTime12h(session.time)}
                          </span>
                        )}
                      </div>

                      {/* Completed session — tasks inline */}
                      {isCompleted && tasks.length > 0 && (
                        <div className="mt-2.5 space-y-1 border-t border-surface-light/50 pt-2">
                          {tasks.map((t) => {
                            const taskDone = session.completions?.some(
                              (c) => c.task_id === t.id && c.completed
                            );
                            return (
                              <div key={t.id} className="flex items-center gap-2 py-0.5">
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

                      {/* Missed session — show missed per_session tasks */}
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
