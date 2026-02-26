'use client';

import { CheckCircle2, Clock, AlertCircle, Circle } from 'lucide-react';
import { formatTime12h } from '@/lib/dates';

interface CheckInCardProps {
  sessionNumber: number;
  label: string;
  time: string;
  status: 'completed' | 'available' | 'upcoming' | 'missed';
  completedCount?: number;
  totalCount?: number;
  onClick?: () => void;
}

export default function CheckInCard({
  sessionNumber,
  label,
  time,
  status,
  completedCount = 0,
  totalCount = 0,
  onClick,
}: CheckInCardProps) {
  const statusConfig = {
    completed: {
      icon: CheckCircle2,
      color: 'text-success',
      bg: 'bg-success/10 border-success/20',
      text: `${completedCount}/${totalCount} tasks`,
    },
    available: {
      icon: Circle,
      color: 'text-accent-light',
      bg: 'bg-accent/10 border-accent/30 pulse-glow cursor-pointer',
      text: 'Check in now',
    },
    upcoming: {
      icon: Clock,
      color: 'text-muted',
      bg: 'bg-surface border-surface-light',
      text: `at ${formatTime12h(time)}`,
    },
    missed: {
      icon: AlertCircle,
      color: 'text-danger',
      bg: 'bg-danger/10 border-danger/20',
      text: 'Missed',
    },
  };

  const config = statusConfig[status];
  const Icon = config.icon;

  return (
    <button
      onClick={status === 'available' ? onClick : undefined}
      disabled={status !== 'available'}
      className={`flex w-full items-center gap-4 rounded-xl border p-4 transition-all ${config.bg} ${
        status === 'available' ? 'active:scale-[0.98]' : ''
      }`}
    >
      <Icon size={28} className={config.color} />
      <div className="flex flex-1 flex-col items-start">
        <span className="text-sm font-semibold text-foreground">
          {label}
        </span>
        <span className={`text-xs ${config.color}`}>{config.text}</span>
      </div>
      <span className="text-xs text-muted">{formatTime12h(time)}</span>
    </button>
  );
}
