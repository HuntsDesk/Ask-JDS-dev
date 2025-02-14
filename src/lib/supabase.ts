import { createClient } from '@supabase/supabase-js';
import type { Database } from '@/types/supabase';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error('Missing required environment variables: VITE_SUPABASE_URL and/or VITE_SUPABASE_ANON_KEY');
}

export const supabase = createClient<Database>(supabaseUrl, supabaseAnonKey, {
  auth: {
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: true,
    storage: localStorage,
    flowType: 'pkce'
  },
  db: {
    schema: 'public'
  },
  global: {
    headers: {
      'x-application-name': 'jds-app'
    }
  }
});

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

// Test connection with retry logic and health check
export async function testSupabaseConnection(retryCount = 0): Promise<boolean> {
  try {
    // Check auth service first
    const { data: authData, error: authError } = await supabase.auth.getSession();
    if (authError) {
      console.error('Supabase auth error:', authError);
      throw authError;
    }

    // Then check database connection
    const { data, error } = await supabase
      .from('threads')
      .select('count')
      .limit(1);
    
    if (error) {
      console.error('Supabase database error:', error);
      throw error;
    }

    console.log('Supabase connection successful');
    return true;
  } catch (error) {
    console.error('Supabase connection error:', error);
    
    // Retry up to 3 times with exponential backoff
    if (retryCount < 3) {
      const delay = Math.pow(2, retryCount) * 1000;
      console.log(`Retrying connection in ${delay}ms...`);
      await new Promise(resolve => setTimeout(resolve, delay));
      return testSupabaseConnection(retryCount + 1);
    }
    
    return false;
  }
}

// Initialize connection test
testSupabaseConnection()
  .then(isConnected => {
    if (isConnected) {
      console.log('Successfully connected to Supabase');
    } else {
      console.error('Failed to connect to Supabase after retries');
    }
  });

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