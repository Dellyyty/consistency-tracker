'use client';

import { Check } from 'lucide-react';

interface TaskCheckboxProps {
  emoji: string;
  name: string;
  checked: boolean;
  onChange: (checked: boolean) => void;
  disabled?: boolean;
}

export default function TaskCheckbox({
  emoji,
  name,
  checked,
  onChange,
  disabled,
}: TaskCheckboxProps) {
  return (
    <button
      onClick={() => !disabled && onChange(!checked)}
      disabled={disabled}
      className={`flex w-full items-center gap-4 rounded-xl border p-4 transition-all active:scale-[0.98] ${
        checked
          ? 'border-success/30 bg-success/10'
          : 'border-surface-light bg-surface hover:bg-surface-light'
      } ${disabled ? 'opacity-60' : ''}`}
    >
      <span className="text-2xl">{emoji}</span>
      <span className="flex-1 text-left text-base font-medium text-foreground">
        {name}
      </span>
      <div
        className={`flex h-7 w-7 items-center justify-center rounded-lg border-2 transition-all ${
          checked
            ? 'border-success bg-success'
            : 'border-muted bg-transparent'
        }`}
      >
        {checked && <Check size={16} className="text-white" strokeWidth={3} />}
      </div>
    </button>
  );
}
