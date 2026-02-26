'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/lib/hooks/useAuth';
import PinPad from '@/components/PinPad';
import { Flame } from 'lucide-react';

export default function Home() {
  const { user, loading, login, signup } = useAuth();
  const router = useRouter();
  const [mode, setMode] = useState<'login' | 'create'>('login');
  const [name, setName] = useState('');
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (!loading && user) {
      router.replace('/dashboard');
    }
  }, [user, loading, router]);

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-accent border-t-transparent" />
      </div>
    );
  }

  if (user) return null;

  const handleSubmit = async (pin: string) => {
    setError('');
    setSubmitting(true);
    try {
      if (mode === 'login') {
        const result = await login(pin);
        if (!result.success) {
          setError(result.error || 'Invalid PIN');
        }
      } else {
        if (!name.trim()) {
          setError('Enter your name first');
          return;
        }
        const result = await signup(pin, name.trim());
        if (!result.success) {
          setError(result.error || 'Signup failed');
        }
      }
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="flex min-h-screen flex-col items-center justify-center px-6">
      <div className="mb-8 flex flex-col items-center gap-2">
        <Flame size={48} className="text-accent-light" />
        <h1 className="text-2xl font-black tracking-tight text-foreground">
          Consistency Tracker
        </h1>
        <p className="text-sm text-muted">
          {mode === 'login' ? 'Enter your 4-digit PIN' : 'Set up your account'}
        </p>
      </div>

      {mode === 'create' && (
        <div className="mb-6 w-full max-w-[240px]">
          <label className="mb-1.5 block text-center text-xs font-medium text-muted">
            What should we call you?
          </label>
          <input
            type="text"
            placeholder="Your name"
            value={name}
            onChange={(e) => { setName(e.target.value); setError(''); }}
            className="w-full rounded-xl border border-surface-light bg-surface px-4 py-3 text-center text-foreground placeholder:text-muted focus:border-accent focus:outline-none"
            maxLength={20}
            autoFocus
          />
          {name.trim() && (
            <p className="mt-2 text-center text-xs text-muted">Now choose a 4-digit PIN</p>
          )}
        </div>
      )}

      <PinPad onSubmit={handleSubmit} loading={submitting} error={error} />

      <button
        onClick={() => {
          setMode(mode === 'login' ? 'create' : 'login');
          setError('');
          setName('');
        }}
        className="mt-8 text-sm text-muted transition-colors hover:text-accent-light"
      >
        {mode === 'login' ? 'Create new account' : 'Already have an account? Log in'}
      </button>
    </div>
  );
}
