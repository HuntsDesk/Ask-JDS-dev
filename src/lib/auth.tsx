import { createContext, useContext, useEffect, useState } from 'react';
import { supabase } from './supabase';
import type { AuthContextType, User } from '@/types';
import { useToast } from '@/hooks/use-toast';

const AuthContext = createContext<AuthContextType | null>(null);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [initialized, setInitialized] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    let mounted = true;
    let retryTimeout: NodeJS.Timeout;
    let retryCount = 0;
    const MAX_RETRIES = 3;

    async function initializeAuth(attempt = 0) {
      try {
        const { data: { session }, error } = await supabase.auth.getSession();
        
        if (error) {
          throw error;
        }
        
        if (session?.user && mounted) {
          const isAdmin = session.user.user_metadata?.is_admin || false;
          setUser({
            id: session.user.id,
            email: session.user.email!,
            isAdmin
          });

          // If we recovered from an error, show success message
          if (attempt > 0) {
            toast({
              title: 'Reconnected',
              description: 'Your session has been restored.',
            });
          }
        }

        if (mounted) {
          setInitialized(true);
        }
      } catch (error) {
        console.error('Session initialization error:', error);
        await logError(error, 'Auth Initialization');

        // Retry logic for initialization
        if (attempt < MAX_RETRIES && mounted) {
          const delay = Math.min(1000 * Math.pow(2, attempt), 10000);
          retryTimeout = setTimeout(() => initializeAuth(attempt + 1), delay);
          
          toast({
            title: 'Connection Error',
            description: 'Attempting to reconnect...',
            variant: 'destructive',
          });
        } else if (mounted) {
          toast({
            title: 'Connection Failed',
            description: 'Please refresh the page to try again.',
            variant: 'destructive',
          });
        }
      } finally {
        if (mounted) {
          setLoading(false);
        }
      }
    }

    // Start initial auth check
    initializeAuth();

    // Set up auth state change listener
    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
      console.log('Auth state change:', event);
      
      if (!mounted) return;

      try {
        if (event === 'SIGNED_IN' && session) {
          const isAdmin = session.user.user_metadata?.is_admin || false;
          setUser({
            id: session.user.id,
            email: session.user.email!,
            isAdmin
          });
          window.location.href = '/';
          
          toast({
            title: 'Welcome back!',
            description: `Signed in as ${session.user.email}`,
          });
        } else if (event === 'SIGNED_OUT') {
          setUser(null);
          window.location.href = '/auth';
          
          toast({
            title: 'Signed out',
            description: 'You have been successfully signed out.',
          });
        } else if (event === 'TOKEN_REFRESHED') {
          console.log('Session token refreshed');
        }
      } catch (error) {
        console.error('Auth state change error:', error);
        await logError(error, 'Auth State Change');
        
        toast({
          title: 'Error',
          description: 'There was a problem with your session.',
          variant: 'destructive',
        });
      }
    });

    // Cleanup function
    return () => {
      mounted = false;
      if (retryTimeout) {
        clearTimeout(retryTimeout);
      }
      subscription.unsubscribe();
    };
  }, [toast]);

  async function signUp(email: string, password: string) {
    try {
      const { data, error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          data: {
            is_admin: false // Default to non-admin
          }
        }
      });

      if (error) throw error;
      return data;
    } catch (error) {
      console.error('Sign up error:', error);
      await logError(error, 'Auth Sign Up');
      throw error;
    }
  }

  async function signIn(email: string, password: string) {
    try {
      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password
      });

      if (error) throw error;
      return data;
    } catch (error) {
      console.error('Sign in error:', error);
      await logError(error, 'Auth Sign In');
      throw error;
    }
  }

  async function signOut() {
    try {
      const { error } = await supabase.auth.signOut();
      if (error) throw error;
    } catch (error) {
      console.error('Sign out error:', error);
      await logError(error, 'Auth Sign Out');
      throw error;
    }
  }

  // Don't render children until auth is initialized
  if (!initialized) {
    return null;
  }

  return (
    <AuthContext.Provider value={{ user, loading, signIn, signUp, signOut }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}