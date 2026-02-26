'use client';

import { useState, useEffect } from 'react';
import { getUserNow } from '@/lib/dates';

interface DayClockProps {
  timezone: string;
}

export default function DayClock({ timezone }: DayClockProps) {
  const [timeLeft, setTimeLeft] = useState({ hours: 0, minutes: 0, seconds: 0 });

  useEffect(() => {
    function update() {
      const now = getUserNow(timezone);
      const h = 23 - now.getHours();
      const m = 59 - now.getMinutes();
      const s = 59 - now.getSeconds();
      setTimeLeft({ hours: h, minutes: m, seconds: s });
    }

    update();
    const interval = setInterval(update, 1000);
    return () => clearInterval(interval);
  }, [timezone]);

  const pad = (n: number) => n.toString().padStart(2, '0');

  return (
    <div className="flex flex-col items-center">
      <div className="flex items-baseline gap-0.5 font-mono tabular-nums">
        <span className="text-xl font-bold text-foreground">{pad(timeLeft.hours)}</span>
        <span className="text-sm text-muted animate-pulse">:</span>
        <span className="text-xl font-bold text-foreground">{pad(timeLeft.minutes)}</span>
        <span className="text-sm text-muted animate-pulse">:</span>
        <span className="text-xl font-bold text-accent-light">{pad(timeLeft.seconds)}</span>
      </div>
      <span className="mt-0.5 text-[10px] font-medium uppercase tracking-wider text-muted">left today</span>
    </div>
  );
}
