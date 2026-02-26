'use client';

import { CheckCircle2, Clock, AlertCircle, Circle, ChevronDown } from 'lucide-react';
import { formatTime12h } from '@/lib/dates';

interface CheckInCardProps {
  sessionNumber: number;
  label: string;
  time: string;
  status: 'completed' | 'available' | 'upcoming' | 'missed';
  completedCount?: number;
  totalCount?: number;
  expanded?: boolean;
  onClick?: () => void;
}

export default function CheckInCard({
  sessionNumber,
  label,
  time,
  status,
  completedCount = 0,
  totalCount = 0,
  expanded = false,
  onClick,
}: CheckInCardProps) {
  const statusConfig = {
    completed: {
      icon: CheckCircle2,
      color: 'text-success',
      bg: 'bg-success/10 border-success/20 cursor-pointer',
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
  const isClickable = status === 'available' || status === 'completed';

  return (
    <button
      onClick={isClickable ? onClick : undefined}
      disabled={!isClickable}
      className={`flex w-full items-center gap-4 rounded-xl border p-4 transition-all ${config.bg} ${
        isClickable ? 'active:scale-[0.98]' : ''
      }`}
    >
      <Icon size={28} className={config.color} />
      <div className="flex flex-1 flex-col items-start">
        <span className="text-sm font-semibold text-foreground">
          {label}
        </span>
        <span className={`text-xs ${config.color}`}>{config.text}</span>
      </div>
      <div className="flex items-center gap-2">
        <span className="text-xs text-muted">{formatTime12h(time)}</span>
        {status === 'completed' && (
          <ChevronDown
            size={16}
            className={`text-muted transition-transform duration-200 ${expanded ? 'rotate-180' : ''}`}
          />
        )}
      </div>
    </button>
  );
}
