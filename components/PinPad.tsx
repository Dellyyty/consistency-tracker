'use client';

import { useState } from 'react';
import { Delete } from 'lucide-react';

interface PinPadProps {
  onSubmit: (pin: string) => void;
  loading?: boolean;
  error?: string;
  minLength?: number;
}

export default function PinPad({ onSubmit, loading, error, minLength = 4 }: PinPadProps) {
  const [pin, setPin] = useState('');

  const handlePress = (digit: string) => {
    if (pin.length < 8) {
      const newPin = pin + digit;
      setPin(newPin);
    }
  };

  const handleDelete = () => {
    setPin((prev) => prev.slice(0, -1));
  };

  const handleSubmit = () => {
    if (pin.length >= minLength) {
      onSubmit(pin);
    }
  };

  return (
    <div className="flex flex-col items-center gap-6">
      {/* PIN dots */}
      <div className="flex gap-3">
        {Array.from({ length: 8 }).map((_, i) => (
          <div
            key={i}
            className={`h-3.5 w-3.5 rounded-full transition-all ${
              i < pin.length
                ? 'scale-110 bg-accent-light'
                : 'bg-surface-light'
            }`}
          />
        ))}
      </div>

      {error && (
        <p className="text-sm text-danger">{error}</p>
      )}

      {/* Keypad */}
      <div className="grid grid-cols-3 gap-3">
        {['1', '2', '3', '4', '5', '6', '7', '8', '9'].map((digit) => (
          <button
            key={digit}
            onClick={() => handlePress(digit)}
            disabled={loading}
            className="flex h-16 w-16 items-center justify-center rounded-2xl bg-surface text-xl font-semibold text-foreground transition-all hover:bg-surface-light active:scale-95"
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
          className="flex h-16 w-16 items-center justify-center rounded-2xl bg-surface text-xl font-semibold text-foreground transition-all hover:bg-surface-light active:scale-95"
        >
          0
        </button>
        <button
          onClick={handleSubmit}
          disabled={loading || pin.length < minLength}
          className="flex h-16 w-16 items-center justify-center rounded-2xl bg-accent text-sm font-bold text-white transition-all hover:bg-accent-light active:scale-95 disabled:opacity-40"
        >
          {loading ? (
            <div className="h-5 w-5 animate-spin rounded-full border-2 border-white border-t-transparent" />
          ) : (
            'GO'
          )}
        </button>
      </div>
    </div>
  );
}
