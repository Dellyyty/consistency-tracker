'use client';

import { Flame } from 'lucide-react';

interface StreakFlameProps {
  streak: number;
  size?: number;
}

export default function StreakFlame({ streak, size = 24 }: StreakFlameProps) {
  const getColor = () => {
    if (streak >= 30) return '#ef4444'; // Red hot
    if (streak >= 14) return '#f97316'; // Orange
    if (streak >= 7) return '#eab308'; // Yellow
    if (streak >= 3) return '#a855f7'; // Purple
    return '#71717a'; // Muted
  };

  return (
    <div className={`inline-flex items-center gap-1 ${streak > 0 ? 'flame-flicker' : ''}`}>
      <Flame size={size} color={getColor()} fill={streak > 0 ? getColor() : 'none'} />
      <span className="text-lg font-bold" style={{ color: getColor() }}>
        {streak}
      </span>
    </div>
  );
}
