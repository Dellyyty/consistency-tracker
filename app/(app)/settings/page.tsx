'use client';

import { useEffect, useState, useCallback } from 'react';
import { useAuth } from '@/lib/hooks/useAuth';
import { useTasks } from '@/lib/hooks/useTasks';
import { supabase } from '@/lib/supabase/client';
import { TASK_EMOJIS } from '@/lib/constants';
import { Plus, X, GripVertical, Clock, User, Globe, LogOut } from 'lucide-react';
import { Task } from '@/lib/types';

export default function SettingsPage() {
  const { user, logout, refreshUser } = useAuth();
  const { tasks, fetchTasks, addTask, removeTask, reorderTasks } = useTasks(user?.id);
  const [newTaskName, setNewTaskName] = useState('');
  const [newTaskEmoji, setNewTaskEmoji] = useState('✅');
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);
  const [displayName, setDisplayName] = useState(user?.display_name || '');
  const [timezone, setTimezone] = useState(user?.timezone || '');
  const [checkInTimes, setCheckInTimes] = useState<string[]>(
    (user?.check_in_times as string[]) || ['07:00', '12:00', '20:00']
  );
  const [saving, setSaving] = useState(false);

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
    await addTask(newTaskName.trim(), newTaskEmoji);
    setNewTaskName('');
    setNewTaskEmoji('✅');
  };

  const handleSaveProfile = async () => {
    if (!user) return;
    setSaving(true);
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
      <h1 className="text-xl font-bold text-foreground">Settings</h1>

      {/* Tasks */}
      <section className="space-y-3">
        <h2 className="flex items-center gap-2 text-sm font-semibold text-muted">
          <span>Your Tasks</span>
          <span className="text-xs text-muted">({tasks.length})</span>
        </h2>

        {tasks.map((task, i) => (
          <div
            key={task.id}
            className="flex items-center gap-2 rounded-xl bg-surface p-3"
          >
            <button
              onClick={() => moveTask(i, 'up')}
              disabled={i === 0}
              className="text-muted disabled:opacity-20"
            >
              <GripVertical size={16} />
            </button>
            <span className="text-xl">{task.emoji}</span>
            <span className="flex-1 text-sm font-medium text-foreground">{task.name}</span>
            <button
              onClick={() => removeTask(task.id)}
              className="rounded-lg p-1.5 text-muted hover:bg-danger/20 hover:text-danger"
            >
              <X size={16} />
            </button>
          </div>
        ))}

        {/* Add Task */}
        <div className="space-y-2 rounded-xl bg-surface p-4">
          <div className="flex gap-2">
            <button
              onClick={() => setShowEmojiPicker(!showEmojiPicker)}
              className="flex h-10 w-10 items-center justify-center rounded-lg bg-surface-light text-xl"
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
              className="flex h-10 w-10 items-center justify-center rounded-lg bg-accent text-white disabled:opacity-40"
            >
              <Plus size={18} />
            </button>
          </div>

          {showEmojiPicker && (
            <div className="flex flex-wrap gap-2 pt-2">
              {TASK_EMOJIS.map((emoji) => (
                <button
                  key={emoji}
                  onClick={() => {
                    setNewTaskEmoji(emoji);
                    setShowEmojiPicker(false);
                  }}
                  className={`flex h-9 w-9 items-center justify-center rounded-lg text-lg ${
                    newTaskEmoji === emoji ? 'bg-accent/30 ring-1 ring-accent' : 'bg-surface-light'
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
        className="flex w-full items-center justify-center rounded-xl bg-accent py-3 text-sm font-bold text-white transition-all hover:bg-accent-light disabled:opacity-50"
      >
        {saving ? 'Saving...' : 'Save Settings'}
      </button>

      {/* Logout */}
      <button
        onClick={logout}
        className="flex w-full items-center justify-center gap-2 rounded-xl border border-danger/30 py-3 text-sm font-medium text-danger transition-all hover:bg-danger/10"
      >
        <LogOut size={16} />
        Log Out
      </button>
    </div>
  );
}
