import { createClient } from '@supabase/supabase-js';
import type { Database } from '@/types/supabase';

declare global {
  interface Window {
    supabaseClient: typeof supabase;
  }
}

// Debug log
console.log('Initializing Supabase client with:', {
  url: import.meta.env.VITE_SUPABASE_URL,
  hasAnonKey: !!import.meta.env.VITE_SUPABASE_ANON_KEY,
  storage: typeof window !== 'undefined' ? 'localStorage available' : 'no localStorage'
});

if (!import.meta.env.VITE_SUPABASE_URL || !import.meta.env.VITE_SUPABASE_ANON_KEY) {
  throw new Error('Missing Supabase environment variables');
}

let supabaseInstance: ReturnType<typeof createClient<Database>> | null = null;

export const supabase = supabaseInstance || createClient<Database>(
  import.meta.env.VITE_SUPABASE_URL,
  import.meta.env.VITE_SUPABASE_ANON_KEY,
  {
    auth: {
      persistSession: true,
      storageKey: 'app-auth',
      storage: window.localStorage,
      autoRefreshToken: true,
      detectSessionInUrl: false
    }
  }
);

if (!supabaseInstance) {
  supabaseInstance = supabase;
}

// Make client available for debugging
if (typeof window !== 'undefined') {
  window.supabaseClient = supabase;
}

// Enhanced error logging with context
export async function logError(
  error: Error | unknown,
  context: string
) {
  const errorMessage = error instanceof Error ? error.message : String(error);
  const stackTrace = error instanceof Error ? error.stack : undefined;
  
  try {
    // First check if user is authenticated
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      console.error('User not authenticated, skipping error logging');
      return;
    }

    const { error: insertError } = await supabase
      .from('error_logs')
      .insert([{
        message: context ? `${context}: ${errorMessage}` : errorMessage,
        stack_trace: stackTrace,
        investigated: false,
        user_id: user.id
      }]);

    if (insertError) {
      console.error('Failed to log error:', insertError);
    }
  } catch (logError) {
    console.error('Failed to log error:', logError);
  }
}