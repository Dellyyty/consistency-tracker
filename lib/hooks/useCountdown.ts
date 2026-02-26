'use client';

import { useState, useEffect } from 'react';
import { getDaysUntilSummer, getDaysSinceStart } from '@/lib/dates';
import { SUMMER_DATE } from '@/lib/constants';

export function useCountdown(startDate: string, timezone: string) {
  const [daysLeft, setDaysLeft] = useState(getDaysUntilSummer(SUMMER_DATE, timezone));
  const [daysSinceStart, setDaysSinceStart] = useState(getDaysSinceStart(startDate, timezone));

  useEffect(() => {
    const interval = setInterval(() => {
      setDaysLeft(getDaysUntilSummer(SUMMER_DATE, timezone));
      setDaysSinceStart(getDaysSinceStart(startDate, timezone));
    }, 60000); // Update every minute

    return () => clearInterval(interval);
  }, [startDate, timezone]);

  const totalDays = daysLeft + daysSinceStart;
  const progress = totalDays > 0 ? Math.round((daysSinceStart / totalDays) * 100) : 0;

  return { daysLeft, daysSinceStart, totalDays, progress };
}
