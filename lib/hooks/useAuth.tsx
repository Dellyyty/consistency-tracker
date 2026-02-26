'use client';

import { createContext, useContext, useState, useEffect, useCallback, ReactNode } from 'react';
import { supabase } from '@/lib/supabase/client';
import { hashPin, generateSalt } from '@/lib/auth';
import { User } from '@/lib/types';
import { DEFAULT_CHECK_IN_TIMES } from '@/lib/constants';

interface AuthContextType {
  user: User | null;
  loading: boolean;
  login: (pin: string) => Promise<{ success: boolean; error?: string }>;
  signup: (pin: string, displayName: string) => Promise<{ success: boolean; error?: string }>;
  logout: () => void;
  refreshUser: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  const fetchUser = useCallback(async (userId: string) => {
    const { data, error } = await supabase
      .from('users')
      .select('*')
      .eq('id', userId)
      .single();

    if (error || !data) {
      localStorage.removeItem('consistency_user_id');
      setUser(null);
      return;
    }
    setUser(data as User);
  }, []);

  const refreshUser = useCallback(async () => {
    const userId = localStorage.getItem('consistency_user_id');
    if (userId) {
      await fetchUser(userId);
    }
  }, [fetchUser]);

  useEffect(() => {
    const userId = localStorage.getItem('consistency_user_id');
    if (userId) {
      fetchUser(userId).finally(() => setLoading(false));
    } else {
      setLoading(false);
    }
  }, [fetchUser]);

  const login = async (pin: string): Promise<{ success: boolean; error?: string }> => {
    // Fetch all users and try to match PIN
    const { data: users, error } = await supabase.from('users').select('*');
    if (error) return { success: false, error: 'Failed to connect to database' };

    for (const u of users || []) {
      const hash = await hashPin(pin, u.pin_salt);
      if (hash === u.pin_hash) {
        localStorage.setItem('consistency_user_id', u.id);
        setUser(u as User);
        return { success: true };
      }
    }

    return { success: false, error: 'Invalid PIN' };
  };

  const signup = async (
    pin: string,
    displayName: string
  ): Promise<{ success: boolean; error?: string }> => {
    const salt = generateSalt();
    const pinHash = await hashPin(pin, salt);
    const timezone = Intl.DateTimeFormat().resolvedOptions().timeZone;

    const { data, error } = await supabase
      .from('users')
      .insert({
        pin_hash: pinHash,
        pin_salt: salt,
        display_name: displayName,
        timezone,
        check_in_times: DEFAULT_CHECK_IN_TIMES,
        start_date: new Date().toISOString().split('T')[0],
      })
      .select()
      .single();

    if (error) return { success: false, error: 'Failed to create account' };

    localStorage.setItem('consistency_user_id', data.id);
    setUser(data as User);
    return { success: true };
  };

  const logout = () => {
    localStorage.removeItem('consistency_user_id');
    setUser(null);
  };

  return (
    <AuthContext.Provider value={{ user, loading, login, signup, logout, refreshUser }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) throw new Error('useAuth must be used within AuthProvider');
  return context;
}
