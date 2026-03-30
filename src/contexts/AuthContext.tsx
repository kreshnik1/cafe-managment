import React, { createContext, useContext, useEffect, useState } from 'react';
import { Session, User } from '@supabase/supabase-js';
import { supabase } from '../services/supabase';
import { Cafe } from '../types';
import { getCafeByOwner } from '../services/cafes';

interface AuthContextValue {
  session: Session | null;
  user: User | null;
  cafe: Cafe | null;
  setCafe: (cafe: Cafe) => void;
  loading: boolean;
}

const AuthContext = createContext<AuthContextValue>({
  session: null,
  user: null,
  cafe: null,
  setCafe: () => {},
  loading: true,
});

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [session, setSession] = useState<Session | null>(null);
  const [cafe, setCafe] = useState<Cafe | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Load existing session on mount
    supabase.auth.getSession().then(({ data }) => {
      setSession(data.session);
      if (data.session?.user) {
        loadCafe(data.session.user.id);
      } else {
        setLoading(false);
      }
    });

    // Listen for auth state changes
    const { data: listener } = supabase.auth.onAuthStateChange((_event, newSession) => {
      setSession(newSession);
      if (newSession?.user) {
        loadCafe(newSession.user.id);
      } else {
        setCafe(null);
        setLoading(false);
      }
    });

    return () => listener.subscription.unsubscribe();
  }, []);

  async function loadCafe(userId: string) {
    try {
      const found = await getCafeByOwner(userId);
      setCafe(found);
    } catch {
      // ignore; user will create cafe on Dashboard
    } finally {
      setLoading(false);
    }
  }

  return (
    <AuthContext.Provider
      value={{ session, user: session?.user ?? null, cafe, setCafe, loading }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  return useContext(AuthContext);
}
