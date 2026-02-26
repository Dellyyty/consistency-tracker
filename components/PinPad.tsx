'use client';

import { useState, useEffect } from 'react';
import { Delete } from 'lucide-react';

interface PinPadProps {
  onSubmit: (pin: string) => void;
  loading?: boolean;
  error?: string;
}

export default function PinPad({ onSubmit, loading, error }: PinPadProps) {
  const [pin, setPin] = useState('');

  // Reset PIN when error changes (failed attempt)
  useEffect(() => {
    if (error) {
      setPin('');
    }
  }, [error]);

  const handlePress = (digit: string) => {
    if (loading || pin.length >= 4) return;
    const newPin = pin + digit;
    setPin(newPin);
    if (newPin.length === 4) {
      onSubmit(newPin);
    }
  };

  const handleDelete = () => {
    if (loading) return;
    setPin((prev) => prev.slice(0, -1));
  };

  return (
    <div className="flex flex-col items-center gap-6">
      {/* PIN dots */}
      <div className="flex gap-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <div
            key={i}
            className={`h-4 w-4 rounded-full transition-all duration-200 ${
              i < pin.length
                ? 'scale-110 bg-accent-light'
                : 'bg-surface-light'
            } ${error && pin.length === 0 ? 'animate-pulse bg-danger/40' : ''}`}
          />
        ))}
      </div>

      {error && (
        <p className="text-sm font-medium text-danger">{error}</p>
      )}

      {/* Keypad */}
      <div className="grid grid-cols-3 gap-3">
        {['1', '2', '3', '4', '5', '6', '7', '8', '9'].map((digit) => (
          <button
            key={digit}
            onClick={() => handlePress(digit)}
            disabled={loading}
            className="flex h-16 w-16 items-center justify-center rounded-2xl bg-surface text-xl font-semibold text-foreground transition-all hover:bg-surface-light active:scale-95 disabled:opacity-50"
          >
            {digit}
          </button>
        ))}
        <button
          onClick={handleDelete}
          disabled={loading || pin.length === 0}
          className="flex h-16 w-16 items-center justify-center rounded-2xl text-muted transition-all hover:bg-surface active:scale-95 disabled:opacity-30"
        >
          <Delete size={22} />
        </button>
        <button
          onClick={() => handlePress('0')}
          disabled={loading}
          className="flex h-16 w-16 items-center justify-center rounded-2xl bg-surface text-xl font-semibold text-foreground transition-all hover:bg-surface-light active:scale-95 disabled:opacity-50"
        >
          0
        </button>
        <div className="flex h-16 w-16 items-center justify-center">
          {loading && (
            <div className="h-5 w-5 animate-spin rounded-full border-2 border-accent border-t-transparent" />
          )}
        </div>
      </div>
    </div>
  );
}
