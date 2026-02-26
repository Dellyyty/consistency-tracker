'use client';

import { useState, useCallback } from 'react';
import { supabase } from '@/lib/supabase/client';
import { CheckIn, Completion } from '@/lib/types';

export function useCheckIn(userId: string | undefined) {
  const [loading, setLoading] = useState(false);

  const fetchCheckIns = useCallback(
    async (startDate?: string, endDate?: string) => {
      if (!userId) return { checkIns: [], completions: [] };

      let query = supabase.from('check_ins').select('*').eq('user_id', userId);

      if (startDate) query = query.gte('date', startDate);
      if (endDate) query = query.lte('date', endDate);

      const { data: checkIns, error: ciError } = await query;
      if (ciError) return { checkIns: [], completions: [] };

      const ciIds = (checkIns || []).map((ci: CheckIn) => ci.id);
      let completions: Completion[] = [];

      if (ciIds.length > 0) {
        const { data } = await supabase
          .from('completions')
          .select('*')
          .in('check_in_id', ciIds);
        completions = (data || []) as Completion[];
      }

      return { checkIns: (checkIns || []) as CheckIn[], completions };
    },
    [userId]
  );

  const submitCheckIn = useCallback(
    async (
      date: string,
      sessionNumber: number,
      taskCompletions: { taskId: string; completed: boolean }[]
    ) => {
      if (!userId) return { success: false, error: 'Not authenticated' };

      setLoading(true);
      try {
        const { data: checkIn, error: ciError } = await supabase
          .from('check_ins')
          .insert({
            user_id: userId,
            date,
            session_number: sessionNumber,
          })
          .select()
          .single();

        if (ciError) {
          if (ciError.code === '23505') {
            return { success: false, error: 'Already checked in for this session' };
          }
          return { success: false, error: 'Failed to submit check-in' };
        }

        const completionRows = taskCompletions.map((tc) => ({
          check_in_id: checkIn.id,
          task_id: tc.taskId,
          completed: tc.completed,
        }));

        const { error: compError } = await supabase
          .from('completions')
          .insert(completionRows);

        if (compError) {
          return { success: false, error: 'Failed to save task completions' };
        }

        return { success: true };
      } finally {
        setLoading(false);
      }
    },
    [userId]
  );

  // Quick-complete a single task from the dashboard.
  // Finds or creates a check-in for the given session, then upserts a completion.
  const quickComplete = useCallback(
    async (
      date: string,
      sessionNumber: number,
      taskId: string,
      completed: boolean,
      allTaskIds: string[]
    ): Promise<{ success: boolean }> => {
      if (!userId) return { success: false };

      try {
        // Try to find existing check-in for this session
        const { data: existing } = await supabase
          .from('check_ins')
          .select('id')
          .eq('user_id', userId)
          .eq('date', date)
          .eq('session_number', sessionNumber)
          .single();

        let checkInId: string;

        if (existing) {
          checkInId = existing.id;
        } else {
          // Create check-in and completions for all tasks (default uncompleted)
          const { data: newCi, error: ciErr } = await supabase
            .from('check_ins')
            .insert({ user_id: userId, date, session_number: sessionNumber })
            .select()
            .single();

          if (ciErr || !newCi) return { success: false };
          checkInId = newCi.id;

          // Create blank completions for all tasks
          const blankCompletions = allTaskIds.map((tid) => ({
            check_in_id: checkInId,
            task_id: tid,
            completed: tid === taskId ? completed : false,
          }));

          await supabase.from('completions').insert(blankCompletions);
          return { success: true };
        }

        // Check-in exists: check if completion exists for this task
        const { data: existingComp } = await supabase
          .from('completions')
          .select('id')
          .eq('check_in_id', checkInId)
          .eq('task_id', taskId)
          .single();

        if (existingComp) {
          // Update existing completion
          await supabase
            .from('completions')
            .update({ completed })
            .eq('id', existingComp.id);
        } else {
          // Insert new completion
          await supabase
            .from('completions')
            .insert({ check_in_id: checkInId, task_id: taskId, completed });
        }

        return { success: true };
      } catch {
        return { success: false };
      }
    },
    [userId]
  );

  return { fetchCheckIns, submitCheckIn, quickComplete, loading };
}
