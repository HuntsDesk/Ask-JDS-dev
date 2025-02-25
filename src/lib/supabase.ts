import { createClient } from '@supabase/supabase-js';
import type { Database } from '@/types/supabase';

// Extend Window interface to include our custom property
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

// Rate limiting configuration
const RATE_LIMIT_WINDOW = 60000; // 1 minute
const MAX_REQUESTS_PER_WINDOW = 60; // 60 requests per minute

class RateLimiter {
  private requests: number[] = [];

  isRateLimited(): boolean {
    const now = Date.now();
    this.requests = this.requests.filter(timestamp => now - timestamp < RATE_LIMIT_WINDOW);
    
    if (this.requests.length >= MAX_REQUESTS_PER_WINDOW) {
      return true;
    }
    
    this.requests.push(now);
    return false;
  }

  getTimeUntilReset(): number {
    if (this.requests.length === 0) return 0;
    const oldestRequest = this.requests[0];
    return Math.max(0, RATE_LIMIT_WINDOW - (Date.now() - oldestRequest));
  }
}

const rateLimiter = new RateLimiter();

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

    // Check rate limit
    if (rateLimiter.isRateLimited()) {
      const resetTime = rateLimiter.getTimeUntilReset();
      console.warn(`Rate limit exceeded for error logging. Try again in ${resetTime}ms`);
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

// Test Supabase connection
async function testSupabaseConnection(retries = 3): Promise<boolean> {
  for (let i = 0; i < retries; i++) {
    try {
      const { error } = await supabase.from('threads').select('count').limit(1);
      if (!error) {
        return true;
      }
      await new Promise(resolve => setTimeout(resolve, 1000));
    } catch (err) {
      // Silent fail
    }
  }
  return false;
}

// Initialize connection test silently
testSupabaseConnection();

// Error types for better error handling
export class SupabaseError extends Error {
  constructor(message: string, public code?: string) {
    super(message);
    this.name = 'SupabaseError';
  }
}

export class AuthError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'AuthError';
  }
}

export class RateLimitError extends Error {
  constructor(message: string, public resetTime: number) {
    super(message);
    this.name = 'RateLimitError';
  }
}

export async function handleAuthStateChange() {
  const { error: authError } = await supabase.auth.getSession();
  if (authError) {
    console.error('Auth state change error:', authError);
    return;
  }
}

// Input validation helpers
export const validateInput = {
  message: (content: string): boolean => {
    return content.length > 0 && content.length <= 10000;
  },
  threadTitle: (title: string): boolean => {
    return title.length > 0 && title.length <= 100;
  },
  userId: (id: string): boolean => {
    return /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/.test(id);
  }
};