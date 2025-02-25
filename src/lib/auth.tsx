import React, { createContext, useContext, useEffect, useState } from 'react';
import { supabase } from './supabase';
import type { AuthContextType, User } from '@/types';
import { LoadingSpinner } from '@/components/LoadingSpinner';

export const AuthContext = createContext<AuthContextType | null>(null);

// Helper function to check admin status securely
async function checkAdminStatus(userId: string): Promise<boolean> {
  try {
    // First try to use the secure RPC function without parameters (checks current user)
    const { data: currentUserIsAdmin, error: currentUserError } = await supabase.rpc('is_admin');
    
    if (!currentUserError && currentUserIsAdmin !== null) {
      console.log('Admin status from RPC (current user):', currentUserIsAdmin);
      return currentUserIsAdmin;
    }
    
    // If that fails, try with the user_id parameter
    const { data: specificUserIsAdmin, error: specificUserError } = await supabase.rpc('is_admin', { user_id: userId });
    
    if (!specificUserError && specificUserIsAdmin !== null) {
      console.log('Admin status from RPC (specific user):', specificUserIsAdmin);
      return specificUserIsAdmin;
    }
    
    // If both RPC calls fail, log the errors and fall back to checking metadata
    if (currentUserError) {
      console.error('Error checking admin status with RPC (current user):', currentUserError);
    }
    
    if (specificUserError) {
      console.error('Error checking admin status with RPC (specific user):', specificUserError);
    }
    
    // Fall back to checking the user's metadata directly
    const { data: userData, error: userError } = await supabase.auth.getUser();
    
    if (!userError && userData?.user) {
      const isAdmin = userData.user.user_metadata?.is_admin === true;
      console.log('Admin status from user metadata:', isAdmin);
      return isAdmin;
    }
    
    if (userError) {
      console.error('Error fetching user data:', userError);
    }
    
    return false;
  } catch (err) {
    console.error('Failed to check admin status:', err);
    return false;
  }
}

function AuthProviderComponent({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Get initial session
    supabase.auth.getSession().then(async ({ data: { session }, error }) => {
      if (error) {
        console.error('Auth session error:', error);
        return;
      }

      if (session?.user) {
        // Check admin status securely
        const isAdmin = await checkAdminStatus(session.user.id);
        
        setUser({
          id: session.user.id,
          email: session.user.email!,
          isAdmin,
          last_sign_in_at: session.user.last_sign_in_at,
          user_metadata: session.user.user_metadata
        });
      }
      setLoading(false);
    });

    // Set up auth state change subscription
    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (_event, session) => {
      if (session?.user) {
        // Check admin status securely
        const isAdmin = await checkAdminStatus(session.user.id);
        
        setUser({
          id: session.user.id,
          email: session.user.email!,
          isAdmin,
          last_sign_in_at: session.user.last_sign_in_at,
          user_metadata: session.user.user_metadata
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

  const value: AuthContextType = {
    user,
    loading,
    signIn: async (email: string, password: string) => {
      const { error } = await supabase.auth.signInWithPassword({ email, password });
      return { error };
    },
    signUp: async (email: string, password: string) => {
      const { error } = await supabase.auth.signUp({ email, password });
      return { error };
    },
    signOut: async () => {
      const { error } = await supabase.auth.signOut();
      
      // Redirect to homepage after sign out
      if (!error) {
        window.location.href = '/';
      }
      
      return { error };
    }
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
};