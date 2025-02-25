import React, { createContext, useContext, useEffect, useState } from 'react';
import { supabase } from './supabase';
import type { AuthContextType, User } from '@/types';
import { LoadingSpinner } from '@/components/LoadingSpinner';

const AuthContext = createContext<AuthContextType | null>(null);

function AuthProviderComponent({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Get initial session
    supabase.auth.getSession().then(({ data: { session }, error }) => {
      if (error) {
        console.error('Auth session error:', error);
        return;
      }

      if (session?.user) {
        const isAdmin = session.user.user_metadata?.is_admin || false;
        setUser({
          id: session.user.id,
          email: session.user.email!,
          isAdmin
        });
      }
      setLoading(false);
    });

    // Set up auth state change subscription
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      if (session?.user) {
        const isAdmin = session.user.user_metadata?.is_admin || false;
        setUser({
          id: session.user.id,
          email: session.user.email!,
          isAdmin
        });
      } else {
        setUser(null);
      }
      setLoading(false);
    });

    return () => {
      subscription.unsubscribe();
    };
  }, []);

  if (loading) {
    return <LoadingSpinner fullScreen />;
  }

  const value = {
    user,
    loading,
    signIn: (email: string, password: string) => 
      supabase.auth.signInWithPassword({ email, password }),
    signUp: (email: string, password: string) =>
      supabase.auth.signUp({ email, password }),
    signOut: () => supabase.auth.signOut()
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
}

export const AuthProvider = React.memo(AuthProviderComponent);

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}