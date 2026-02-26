'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/lib/hooks/useAuth';
import { useTasks } from '@/lib/hooks/useTasks';
import { supabase } from '@/lib/supabase/client';
import { TASK_EMOJIS } from '@/lib/constants';
import { TaskFrequency } from '@/lib/types';
import { Plus, X, ArrowUp, ArrowDown, Clock, User, Globe, LogOut, Check, ArrowLeft, Trash2, Repeat, RotateCw } from 'lucide-react';

export default function SettingsPage() {
  const { user, logout, refreshUser } = useAuth();
  const router = useRouter();
  const { tasks, fetchTasks, addTask, updateTask, removeTask, reorderTasks } = useTasks(user?.id);
  const [newTaskName, setNewTaskName] = useState('');
  const [newTaskEmoji, setNewTaskEmoji] = useState('✅');
  const [newTaskFrequency, setNewTaskFrequency] = useState<TaskFrequency>('per_session');
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);
  const [displayName, setDisplayName] = useState(user?.display_name || '');
  const [timezone, setTimezone] = useState(user?.timezone || '');
  const [checkInTimes, setCheckInTimes] = useState<string[]>(
    (user?.check_in_times as string[]) || ['07:00', '12:00', '20:00']
  );
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [confirmRemove, setConfirmRemove] = useState<string | null>(null);

  useEffect(() => {
    if (user) {
      fetchTasks();
      setDisplayName(user.display_name);
      setTimezone(user.timezone);
      setCheckInTimes((user.check_in_times as string[]) || ['07:00', '12:00', '20:00']);
    }
  }, [user, fetchTasks]);

  const handleAddTask = async () => {
    if (!newTaskName.trim()) return;
    await addTask(newTaskName.trim(), newTaskEmoji, newTaskFrequency);
    setNewTaskName('');
    setNewTaskEmoji('✅');
    setNewTaskFrequency('per_session');
    setShowEmojiPicker(false);
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

  const toggleFrequency = async (taskId: string, current: TaskFrequency) => {
    const next = current === 'daily' ? 'per_session' : 'daily';
    await updateTask(taskId, { frequency: next });
  };

  const handleSaveProfile = async () => {
    if (!user) return;
    setSaving(true);
    setSaved(false);
    await supabase
      .from('users')
      .update({
        display_name: displayName,
        timezone,
        check_in_times: checkInTimes,
      })
      .eq('id', user.id);
    await refreshUser();
    setSaving(false);
    setSaved(true);
    setTimeout(() => setSaved(false), 2500);
  };

  const handleTimeChange = (index: number, value: string) => {
    const newTimes = [...checkInTimes];
    newTimes[index] = value;
    setCheckInTimes(newTimes);
  };

  const moveTask = (index: number, direction: 'up' | 'down') => {
    const newTasks = [...tasks];
    const swapIndex = direction === 'up' ? index - 1 : index + 1;
    if (swapIndex < 0 || swapIndex >= newTasks.length) return;
    [newTasks[index], newTasks[swapIndex]] = [newTasks[swapIndex], newTasks[index]];
    reorderTasks(newTasks);
  };

  const commonTimezones = [
    'America/New_York',
    'America/Chicago',
    'America/Denver',
    'America/Los_Angeles',
    'America/Phoenix',
    'America/Anchorage',
    'Pacific/Honolulu',
    'Europe/London',
    'Europe/Paris',
    'Asia/Tokyo',
    'Asia/Shanghai',
    'Australia/Sydney',
  ];

  return (
    <div className="mx-auto max-w-md space-y-6 px-4 pt-6">
      {/* Header */}
      <div>
        <button
          onClick={() => router.push('/dashboard')}
          className="mb-2 flex items-center gap-1 text-xs text-muted transition-colors hover:text-foreground"
        >
          <ArrowLeft size={14} />
          Dashboard
        </button>
        <h1 className="text-xl font-bold text-foreground">Settings</h1>
      </div>

      {/* Tasks */}
      <section className="space-y-3">
        <h2 className="flex items-center gap-2 text-sm font-semibold text-muted">
          <span>Your Tasks</span>
          <span className="rounded-full bg-surface-light px-2 py-0.5 text-xs">{tasks.length}</span>
        </h2>

        {tasks.length === 0 && (
          <div className="rounded-xl border border-dashed border-surface-light bg-surface/50 p-6 text-center">
            <p className="text-sm text-muted">No tasks yet. Add your first one below!</p>
            <p className="mt-1 text-xs text-muted">These are the habits you&apos;ll track at each check-in.</p>
          </div>
        )}

        {tasks.map((task, i) => (
          <div
            key={task.id}
            className="rounded-xl bg-surface p-3"
          >
            <div className="flex items-center gap-2">
              {/* Reorder */}
              <div className="flex flex-col gap-0.5">
                <button
                  onClick={() => moveTask(i, 'up')}
                  disabled={i === 0}
                  className="rounded p-0.5 text-muted transition-colors hover:text-foreground disabled:opacity-20"
                >
                  <ArrowUp size={12} />
                </button>
                <button
                  onClick={() => moveTask(i, 'down')}
                  disabled={i === tasks.length - 1}
                  className="rounded p-0.5 text-muted transition-colors hover:text-foreground disabled:opacity-20"
                >
                  <ArrowDown size={12} />
                </button>
              </div>
              <span className="text-xl">{task.emoji}</span>
              <div className="flex-1 min-w-0">
                <span className="text-sm font-medium text-foreground">{task.name}</span>
              </div>
              <button
                onClick={() => handleRemoveTask(task.id)}
                className={`rounded-lg px-2 py-1.5 text-xs font-medium transition-all ${
                  confirmRemove === task.id
                    ? 'bg-danger text-white'
                    : 'text-muted hover:bg-danger/20 hover:text-danger'
                }`}
              >
                {confirmRemove === task.id ? (
                  <span className="flex items-center gap-1">
                    <Trash2 size={12} />
                    Confirm
                  </span>
                ) : (
                  <X size={16} />
                )}
              </button>
            </div>
            {/* Frequency toggle */}
            <div className="mt-2 ml-8 flex gap-2">
              <button
                onClick={() => toggleFrequency(task.id, task.frequency)}
                className={`flex items-center gap-1 rounded-lg px-2.5 py-1 text-[11px] font-medium transition-all ${
                  task.frequency === 'per_session'
                    ? 'bg-accent/20 text-accent-light'
                    : 'bg-surface-light text-muted hover:text-foreground'
                }`}
              >
                <Repeat size={10} />
                Every check-in
              </button>
              <button
                onClick={() => toggleFrequency(task.id, task.frequency)}
                className={`flex items-center gap-1 rounded-lg px-2.5 py-1 text-[11px] font-medium transition-all ${
                  task.frequency === 'daily'
                    ? 'bg-accent/20 text-accent-light'
                    : 'bg-surface-light text-muted hover:text-foreground'
                }`}
              >
                <RotateCw size={10} />
                Once daily
              </button>
            </div>
          </div>
        ))}

        {/* Add Task */}
        <div className="space-y-3 rounded-xl bg-surface p-4">
          <div className="flex gap-2">
            <button
              onClick={() => setShowEmojiPicker(!showEmojiPicker)}
              className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-surface-light text-xl transition-colors hover:bg-surface-light/80"
            >
              {newTaskEmoji}
            </button>
            <input
              type="text"
              value={newTaskName}
              onChange={(e) => setNewTaskName(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleAddTask()}
              placeholder="New task name..."
              className="flex-1 rounded-lg bg-surface-light px-3 py-2 text-sm text-foreground placeholder:text-muted focus:outline-none focus:ring-1 focus:ring-accent"
              maxLength={40}
            />
            <button
              onClick={handleAddTask}
              disabled={!newTaskName.trim()}
              className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-accent text-white transition-all hover:bg-accent-light active:scale-95 disabled:opacity-40"
            >
              <Plus size={18} />
            </button>
          </div>

          {/* Frequency selector for new task */}
          <div className="flex gap-2">
            <button
              onClick={() => setNewTaskFrequency('per_session')}
              className={`flex flex-1 items-center justify-center gap-1.5 rounded-lg py-2 text-xs font-medium transition-all ${
                newTaskFrequency === 'per_session'
                  ? 'bg-accent/20 text-accent-light ring-1 ring-accent/30'
                  : 'bg-surface-light text-muted'
              }`}
            >
              <Repeat size={12} />
              Every check-in
            </button>
            <button
              onClick={() => setNewTaskFrequency('daily')}
              className={`flex flex-1 items-center justify-center gap-1.5 rounded-lg py-2 text-xs font-medium transition-all ${
                newTaskFrequency === 'daily'
                  ? 'bg-accent/20 text-accent-light ring-1 ring-accent/30'
                  : 'bg-surface-light text-muted'
              }`}
            >
              <RotateCw size={12} />
              Once daily
            </button>
          </div>

          {showEmojiPicker && (
            <div className="flex flex-wrap gap-2 border-t border-surface-light pt-3">
              {TASK_EMOJIS.map((emoji) => (
                <button
                  key={emoji}
                  onClick={() => {
                    setNewTaskEmoji(emoji);
                    setShowEmojiPicker(false);
                  }}
                  className={`flex h-9 w-9 items-center justify-center rounded-lg text-lg transition-all ${
                    newTaskEmoji === emoji ? 'bg-accent/30 ring-1 ring-accent' : 'bg-surface-light hover:bg-surface-light/80'
                  }`}
                >
                  {emoji}
                </button>
              ))}
            </div>
          )}
        </div>
      </section>

      {/* Check-in Times */}
      <section className="space-y-3">
        <h2 className="flex items-center gap-2 text-sm font-semibold text-muted">
          <Clock size={14} />
          Check-in Times
        </h2>
        <div className="space-y-2 rounded-xl bg-surface p-4">
          {['Morning', 'Midday', 'Evening'].map((label, i) => (
            <div key={label} className="flex items-center justify-between">
              <span className="text-sm text-foreground">{label}</span>
              <input
                type="time"
                value={checkInTimes[i] || ''}
                onChange={(e) => handleTimeChange(i, e.target.value)}
                className="rounded-lg bg-surface-light px-3 py-1.5 text-sm text-foreground focus:outline-none focus:ring-1 focus:ring-accent [color-scheme:dark]"
              />
            </div>
          ))}
        </div>
      </section>

      {/* Profile */}
      <section className="space-y-3">
        <h2 className="flex items-center gap-2 text-sm font-semibold text-muted">
          <User size={14} />
          Profile
        </h2>
        <div className="space-y-3 rounded-xl bg-surface p-4">
          <div>
            <label className="mb-1 block text-xs text-muted">Display Name</label>
            <input
              type="text"
              value={displayName}
              onChange={(e) => setDisplayName(e.target.value)}
              className="w-full rounded-lg bg-surface-light px-3 py-2 text-sm text-foreground focus:outline-none focus:ring-1 focus:ring-accent"
              maxLength={20}
            />
          </div>
          <div>
            <label className="mb-1 flex items-center gap-1 text-xs text-muted">
              <Globe size={12} />
              Timezone
            </label>
            <select
              value={timezone}
              onChange={(e) => setTimezone(e.target.value)}
              className="w-full rounded-lg bg-surface-light px-3 py-2 text-sm text-foreground focus:outline-none focus:ring-1 focus:ring-accent [color-scheme:dark]"
            >
              {commonTimezones.map((tz) => (
                <option key={tz} value={tz}>
                  {tz.replace(/_/g, ' ')}
                </option>
              ))}
            </select>
          </div>
        </div>
      </section>

      {/* Save */}
      <button
        onClick={handleSaveProfile}
        disabled={saving}
        className={`flex w-full items-center justify-center gap-2 rounded-xl py-3 text-sm font-bold transition-all ${
          saved
            ? 'bg-success text-white'
            : 'bg-accent text-white hover:bg-accent-light'
        } disabled:opacity-50`}
      >
        {saving ? (
          <>
            <div className="h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent" />
            Saving...
          </>
        ) : saved ? (
          <>
            <Check size={18} />
            Saved!
          </>
        ) : (
          'Save Settings'
        )}
      </button>

      {/* Logout */}
      <button
        onClick={logout}
        className="flex w-full items-center justify-center gap-2 rounded-xl border border-danger/30 py-3 text-sm font-medium text-danger transition-all hover:bg-danger/10"
      >
        <LogOut size={16} />
        Log Out
      </button>

      <div className="h-4" />
    </div>
  );
}
