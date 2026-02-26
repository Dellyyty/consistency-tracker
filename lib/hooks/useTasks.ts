'use client';

import { useState, useCallback } from 'react';
import { supabase } from '@/lib/supabase/client';
import { Task } from '@/lib/types';

export function useTasks(userId: string | undefined) {
  const [tasks, setTasks] = useState<Task[]>([]);
  const [loading, setLoading] = useState(false);

  const fetchTasks = useCallback(
    async (includeRemoved = false) => {
      if (!userId) return [];

      let query = supabase
        .from('tasks')
        .select('*')
        .eq('user_id', userId)
        .order('sort_order', { ascending: true });

      if (!includeRemoved) {
        query = query.is('removed_at', null);
      }

      const { data } = await query;
      const result = (data || []) as Task[];
      setTasks(result);
      return result;
    },
    [userId]
  );

  const addTask = useCallback(
    async (name: string, emoji: string) => {
      if (!userId) return null;

      setLoading(true);
      try {
        const maxOrder = tasks.length > 0 ? Math.max(...tasks.map((t) => t.sort_order)) : -1;

        const { data, error } = await supabase
          .from('tasks')
          .insert({
            user_id: userId,
            name,
            emoji,
            sort_order: maxOrder + 1,
          })
          .select()
          .single();

        if (error) return null;

        const newTask = data as Task;
        setTasks((prev) => [...prev, newTask]);
        return newTask;
      } finally {
        setLoading(false);
      }
    },
    [userId, tasks]
  );

  const removeTask = useCallback(
    async (taskId: string) => {
      setLoading(true);
      try {
        const { error } = await supabase
          .from('tasks')
          .update({ removed_at: new Date().toISOString() })
          .eq('id', taskId);

        if (!error) {
          setTasks((prev) => prev.filter((t) => t.id !== taskId));
        }
      } finally {
        setLoading(false);
      }
    },
    []
  );

  const reorderTasks = useCallback(
    async (reorderedTasks: Task[]) => {
      setTasks(reorderedTasks);

      const updates = reorderedTasks.map((t, i) =>
        supabase.from('tasks').update({ sort_order: i }).eq('id', t.id)
      );

      await Promise.all(updates);
    },
    []
  );

  return { tasks, fetchTasks, addTask, removeTask, reorderTasks, loading };
}
