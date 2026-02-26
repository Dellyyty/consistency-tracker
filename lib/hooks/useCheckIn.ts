'use client';

import { useState, useCallback } from 'react';
import { supabase } from '@/lib/supabase/client';
import { CheckIn, Completion, Task } from '@/lib/types';

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

      // Fetch completions for these check-ins
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
        // Insert check-in
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

        // Insert completions
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

  return { fetchCheckIns, submitCheckIn, loading };
}
