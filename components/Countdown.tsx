'use client';

interface CountdownProps {
  daysLeft: number;
  progress: number;
}

export default function Countdown({ daysLeft, progress }: CountdownProps) {
  return (
    <div className="flex flex-col items-center gap-3 rounded-2xl bg-surface p-6">
      <span className="text-xs font-medium uppercase tracking-widest text-muted">
        Days until summer
      </span>
      <div className="flex items-baseline gap-1">
        <span className="text-6xl font-black tabular-nums text-foreground">
          {daysLeft}
        </span>
        <span className="text-lg text-muted">days</span>
      </div>
      {/* Progress bar */}
      <div className="h-2 w-full overflow-hidden rounded-full bg-surface-light">
        <div
          className="animate-grow h-full rounded-full bg-gradient-to-r from-accent to-accent-light"
          style={{ width: `${progress}%` }}
        />
      </div>
      <span className="text-xs text-muted">{progress}% of the journey complete</span>
    </div>
  );
}
