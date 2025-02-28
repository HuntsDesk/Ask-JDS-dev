import React, { createContext, useContext, useEffect, useState, useRef } from 'react';
import { supabase } from './supabase';
import type { AuthContextType, User } from '@/types';
import { withTimeout } from './auth-utils';

// Create a global key for the auth instance
const GLOBAL_AUTH_KEY = '__AUTH_INSTANCE__';

export const AuthContext = createContext<AuthContextType | null>(null);

// Get the global auth instance if it exists
function getGlobalAuthInstance() {
  if (typeof window !== 'undefined' && GLOBAL_AUTH_KEY in window) {
    return (window as any)[GLOBAL_AUTH_KEY];
  }
  return null;
}

// Set the global auth instance
function setGlobalAuthInstance(instance: any) {
  if (typeof window !== 'undefined') {
    (window as any)[GLOBAL_AUTH_KEY] = instance;
  }
}

// Create a singleton instance of the auth provider state
let authInstance = getGlobalAuthInstance() || {
  user: null,
  loading: false,
  authInitialized: false
};

function AuthProviderComponent({ children }: { children: React.ReactNode }) {
  // Use the singleton instance if it exists
  const [user, setUser] = useState<User | null>(authInstance.user || null);
  const [loading, setLoading] = useState(authInstance.loading !== undefined ? authInstance.loading : false);
  const [error, setError] = useState<Error | null>(null);
  const [authInitialized, setAuthInitialized] = useState(authInstance.authInitialized || false);
  const authStateChangeHandled = useRef(false);
  const authSubscriptionRef = useRef<{ unsubscribe: () => void } | null>(null);
  const initializingRef = useRef(false);

  useEffect(() => {
    console.log('Auth provider initializing...', 
      { 
        existingUser: authInstance.user?.email, 
        isInitialized: authInstance.authInitialized 
      }
    );
    
    let isMounted = true;
    
    // Safety timeout to prevent getting stuck in loading state
    const safetyTimeoutId = setTimeout(() => {
      if (isMounted) {
        console.warn('Auth initialization safety timeout triggered after 16 seconds');
        
        // Force set initialized state regardless of loading state
        setAuthInitialized(true);
        
        // Only set loading to false if it's still true
        if (loading) {
          setLoading(false);
        }
        
        // Update singleton
        authInstance.loading = false;
        authInstance.authInitialized = true;
        setGlobalAuthInstance(authInstance);
        
        // Force check session one more time
        supabase.auth.getSession().then(({ data, error }) => {
          if (error) {
            console.error('Forced session check error:', error);
            return;
          }
          
          if (data?.session?.user) {
            console.log('Forced session check found user:', data.session.user.email);
            const userData = {
              id: data.session.user.id,
              email: data.session.user.email!,
              isAdmin: false, // Always false in user app
              last_sign_in_at: data.session.user.last_sign_in_at,
              user_metadata: data.session.user.user_metadata
            };
            
            if (isMounted) {
              setUser(userData);
              
              // Update singleton
              authInstance.user = userData;
              setGlobalAuthInstance(authInstance);
            }
          }
        });
      }
    }, 16000); // 16 second timeout (longer than our getSession timeout + retries)
    
    const initializeAuth = async () => {
      // Prevent multiple initializations
      if (initializingRef.current) {
        console.log('Auth initialization already in progress, skipping');
        return;
      }
      
      // If we already have a user in the singleton, use that
      if (authInstance.authInitialized && authInstance.user) {
        console.log('Using existing authenticated user from singleton:', authInstance.user.email);
        setUser(authInstance.user);
        setLoading(false);
        setAuthInitialized(true);
        return;
      }
      
      initializingRef.current = true;
      setLoading(true);
      
      try {
        console.log('Starting auth initialization...');
        
        // Check network status first
        if (typeof navigator !== 'undefined' && !navigator.onLine) {
          console.warn('Network appears to be offline. This may cause auth initialization to fail.');
        }
        
        // Log browser and environment information for debugging
        console.log('Browser info:', {
          userAgent: navigator.userAgent,
          platform: navigator.platform,
          vendor: navigator.vendor
        });
        
        console.log('Getting auth session...');
        
        // Increase timeout to 15 seconds and add retry logic
        const maxRetries = 2;
        let retryCount = 0;
        let sessionResult = null;
        
        while (retryCount <= maxRetries && !sessionResult) {
          try {
            if (retryCount > 0) {
              console.log(`Retrying auth session fetch (attempt ${retryCount} of ${maxRetries})...`);
            }
            
            // Use a direct approach first without timeout to see if that works
            if (retryCount === maxRetries) {
              console.log('Final attempt: trying direct Supabase call without timeout wrapper');
              sessionResult = await supabase.auth.getSession();
            } else {
              // Use withTimeout with a longer timeout (15 seconds)
              sessionResult = await withTimeout(
                supabase.auth.getSession(),
                15000, // 15 second timeout
                `Auth session fetch timed out (attempt ${retryCount + 1})`
              );
            }
            
            console.log('Auth session fetch completed successfully');
          } catch (timeoutError) {
            console.warn(`Auth session fetch attempt ${retryCount + 1} timed out:`, timeoutError);
            
            // Log additional diagnostic information
            console.log('Diagnostic info for timeout:', {
              retryCount,
              timestamp: new Date().toISOString(),
              online: typeof navigator !== 'undefined' ? navigator.onLine : 'unknown'
            });
            
            retryCount++;
            
            // If we've exhausted all retries, we'll continue and set authInitialized to true
            // This allows the app to function even if auth is having issues
            if (retryCount > maxRetries) {
              console.error('All auth session fetch attempts failed. Continuing without session.');
              // Don't throw, just continue with null session
              sessionResult = { data: { session: null }, error: timeoutError };
            }
            
            // Short delay before retry
            await new Promise(resolve => setTimeout(resolve, 500));
          }
        }
        
        if (!sessionResult) {
          throw new Error('Failed to fetch auth session after multiple attempts');
        }
        
        const { data: { session }, error: sessionError } = sessionResult;
          
        if (sessionError) {
          console.error('Auth session error:', sessionError);
          if (isMounted) {
            setError(sessionError);
            setLoading(false);
            setAuthInitialized(true);
            
            // Update singleton
            authInstance.loading = false;
            authInstance.authInitialized = true;
            setGlobalAuthInstance(authInstance);
          }
          initializingRef.current = false;
          return;
        }

        if (session?.user) {
          console.log('User found in session:', session.user.email);
          
          // Create user object with isAdmin always set to false
          const userData = {
            id: session.user.id,
            email: session.user.email!,
            isAdmin: false, // Always false in user app
            last_sign_in_at: session.user.last_sign_in_at,
            user_metadata: session.user.user_metadata
          };
          
          if (isMounted) {
            setUser(userData);
            setLoading(false);
            setAuthInitialized(true);
            authStateChangeHandled.current = true;
            
            // Update singleton
            authInstance.user = userData;
            authInstance.loading = false;
            authInstance.authInitialized = true;
            setGlobalAuthInstance(authInstance);
            
            console.log('Auth initialization complete with user:', userData.email);
          }
        } else {
          console.log('No user found in session');
          if (isMounted) {
            setUser(null);
            setLoading(false);
            setAuthInitialized(true);
            
            // Update singleton
            authInstance.user = null;
            authInstance.loading = false;
            authInstance.authInitialized = true;
            setGlobalAuthInstance(authInstance);
            
            console.log('Auth initialization complete with no user');
          }
        }
        
        initializingRef.current = false;
      } catch (err) {
        console.error('Auth initialization error:', err);
        if (isMounted) {
          setError(err instanceof Error ? err : new Error(String(err)));
          setLoading(false);
          setAuthInitialized(true);
          
          // Update singleton
          authInstance.loading = false;
          authInstance.authInitialized = true;
          setGlobalAuthInstance(authInstance);
        }
        
        initializingRef.current = false;
      } finally {
        // Ensure authInitialized is set to true even if there's an error
        if (isMounted && !authInitialized) {
          console.log('Setting authInitialized to true in finally block');
          setAuthInitialized(true);
          
          // Update singleton
          authInstance.authInitialized = true;
          setGlobalAuthInstance(authInstance);
        }
      }
    };

    // Only set up auth state change subscription if it doesn't exist yet
    if (!authSubscriptionRef.current) {
      console.log('Setting up auth state change listener...');
      const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
        console.log('Auth state changed:', event);
        
        if (session?.user) {
          console.log('User in auth state change:', session.user.email);
          
          // Create user object with isAdmin always set to false
          const userData = {
            id: session.user.id,
            email: session.user.email!,
            isAdmin: false, // Always false in user app
            last_sign_in_at: session.user.last_sign_in_at,
            user_metadata: session.user.user_metadata
          };
          
          if (isMounted) {
            setUser(userData);
            setLoading(false);
            setAuthInitialized(true);
            authStateChangeHandled.current = true;
            
            // Update singleton
            authInstance.user = userData;
            authInstance.loading = false;
            authInstance.authInitialized = true;
            setGlobalAuthInstance(authInstance);
            
            console.log('Auth state change complete with user:', userData.email);
          }
        } else {
          console.log('No user in auth state change');
          if (isMounted) {
            setUser(null);
            setLoading(false);
            setAuthInitialized(true);
            
            // Update singleton
            authInstance.user = null;
            authInstance.loading = false;
            authInstance.authInitialized = true;
            setGlobalAuthInstance(authInstance);
            
            console.log('Auth state change complete with no user');
          }
        }
      });
      
      authSubscriptionRef.current = subscription;
      console.log('Auth state change listener set up');
    }

    // Initialize auth only if not already initialized
    if (!authInstance.authInitialized) {
      initializeAuth();
    } else {
      console.log('Auth already initialized, using cached state');
      setLoading(false);
    }

    return () => {
      console.log('Auth provider cleanup');
      isMounted = false;
      clearTimeout(safetyTimeoutId);
      
      // Don't unsubscribe from auth state changes to maintain the subscription across component remounts
      // if (authSubscriptionRef.current) {
      //   authSubscriptionRef.current.unsubscribe();
      //   authSubscriptionRef.current = null;
      // }
    };
  }, []);

  // Create the auth context value
  const value: AuthContextType = {
    user,
    loading,
    authInitialized,
    signIn: async (email: string, password: string) => {
      try {
        console.log('Auth provider: signIn called for', email);
        setLoading(true);
        authStateChangeHandled.current = false;
        
        // Update singleton
        authInstance.loading = true;
        setGlobalAuthInstance(authInstance);
        
        const { data, error } = await supabase.auth.signInWithPassword({ email, password });
        
        if (error) {
          console.error('Sign in error from Supabase:', error);
          setLoading(false);
          
          // Update singleton
          authInstance.loading = false;
          setGlobalAuthInstance(authInstance);
          
          return { error };
        }
        
        console.log('Sign in successful for:', data.user?.email);
        
        // Create a user object if sign-in successful
        if (data.user) {
          console.log('Setting user immediately after sign in');
          
          // Create user without admin status
          const userData: User = {
            id: data.user.id,
            email: data.user.email!,
            isAdmin: false, // Always false in user app
            last_sign_in_at: data.user.last_sign_in_at,
            user_metadata: data.user.user_metadata
          };
          
          // Set the user right away
          setUser(userData);
          setAuthInitialized(true);
          setLoading(false);
          
          // Update singleton
          authInstance.user = userData;
          authInstance.loading = false;
          authInstance.authInitialized = true;
          setGlobalAuthInstance(authInstance);
          
          console.log('User state updated immediately after sign in:', userData);
        } else {
          setLoading(false);
        }
        
        return { error: null };
      } catch (err) {
        console.error('Sign in error:', err);
        setLoading(false);
        setAuthInitialized(true);
        
        // Update singleton
        authInstance.loading = false;
        authInstance.authInitialized = true;
        setGlobalAuthInstance(authInstance);
        
        return { error: err as Error };
      }
    },
    signUp: async (email: string, password: string) => {
      try {
        setLoading(true);
        
        // Update singleton
        authInstance.loading = true;
        setGlobalAuthInstance(authInstance);
        
        const { error } = await supabase.auth.signUp({ email, password });
        
        setLoading(false);
        
        // Update singleton
        authInstance.loading = false;
        setGlobalAuthInstance(authInstance);
        
        return { error };
      } catch (err) {
        console.error('Sign up error:', err);
        setLoading(false);
        
        // Update singleton
        authInstance.loading = false;
        setGlobalAuthInstance(authInstance);
        
        return { error: err instanceof Error ? err : new Error(String(err)) };
      }
    },
    signOut: async () => {
      try {
        console.log('Auth provider: signOut called');
        setLoading(true);
        
        // Update singleton
        authInstance.loading = true;
        setGlobalAuthInstance(authInstance);
        
        // Clear user state first to prevent flashing of protected content
        setUser(null);
        setAuthInitialized(true);
        
        // Update singleton before sign out
        authInstance.user = null;
        authInstance.loading = true;
        authInstance.authInitialized = true;
        setGlobalAuthInstance(authInstance);
        
        const { error } = await supabase.auth.signOut();
        
        if (error) {
          console.error('Sign out error:', error);
          setLoading(false);
          
          // Update singleton
          authInstance.loading = false;
          setGlobalAuthInstance(authInstance);
          
          return { error };
        }
        
        console.log('Sign out successful');
        
        // Update loading state
        setLoading(false);
        
        // Update singleton after sign out
        authInstance.loading = false;
        setGlobalAuthInstance(authInstance);
        
        // Use window.location.href for a full page reload to clear any stale state
        // Redirect to homepage instead of sign-in page
        window.location.href = '/';
        
        return { error: null };
      } catch (err) {
        console.error('Sign out error:', err);
        setLoading(false);
        
        // Update singleton
        authInstance.loading = false;
        setGlobalAuthInstance(authInstance);
        
        return { error: err instanceof Error ? err : new Error(String(err)) };
      }
    }
  };

  // Always render children, don't block with a loading spinner
  return (
    <AuthContext.Provider value={value}>
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

export function AuthProvider({ children }: { children: React.ReactNode }) {
  return <AuthProviderComponent>{children}</AuthProviderComponent>;
}