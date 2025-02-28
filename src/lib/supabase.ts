import { createClient } from '@supabase/supabase-js';
import type { Database } from '@/types/supabase';

// Create a global key for the Supabase client
const GLOBAL_SUPABASE_KEY = '__SUPABASE_CLIENT__';

// Define a global type for the window object
declare global {
  interface Window {
    [GLOBAL_SUPABASE_KEY]: ReturnType<typeof createClient<Database>>;
    supabaseClient: ReturnType<typeof createClient<Database>>;
  }
}

// Check if we already have a client in the global scope
if (typeof window !== 'undefined') {
  console.log('Checking for existing Supabase client in global scope');
  if (!(GLOBAL_SUPABASE_KEY in window)) {
    console.log('No existing Supabase client found in global scope');
  } else {
    console.log('Found existing Supabase client in global scope');
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

// Function to get or create the Supabase client
function getSupabaseClient() {
  // Check if we already have a client in the global scope
  if (typeof window !== 'undefined' && GLOBAL_SUPABASE_KEY in window) {
    console.log('Using existing Supabase client from global scope');
    return window[GLOBAL_SUPABASE_KEY];
  }

  // Create a new client
  console.log('Creating new Supabase client instance');
  const instance = createClient<Database>(
    import.meta.env.VITE_SUPABASE_URL,
    import.meta.env.VITE_SUPABASE_ANON_KEY,
    {
      auth: {
        persistSession: true,
        storageKey: 'ask-jds-auth-storage',
        storage: typeof window !== 'undefined' ? window.localStorage : undefined,
        autoRefreshToken: true,
        detectSessionInUrl: false
      },
      global: {
        fetch: customFetch
      },
      db: {
        schema: 'public'
      }
    }
  );

  // Store the client in the global scope
  if (typeof window !== 'undefined') {
    window[GLOBAL_SUPABASE_KEY] = instance;
    
    // Also keep the old reference for backward compatibility
    window.supabaseClient = instance;
  }

  return instance;
}

// Custom fetch function with timeout
function customFetch(input: RequestInfo | URL, init?: RequestInit): Promise<Response> {
  const controller = new AbortController();
  const startTime = Date.now();
  const requestId = Math.random().toString(36).substring(2, 9);
  
  // Extract URL for logging
  const url = typeof input === 'string' 
    ? new URL(input, window.location.origin).pathname
    : input instanceof URL 
      ? input.pathname
      : 'Request';
  
  console.log(`[${requestId}] Starting Supabase request: ${url}`);
  
  // Check network status
  if (typeof navigator !== 'undefined' && !navigator.onLine) {
    console.warn(`[${requestId}] Network appears to be offline. This may cause the request to fail.`);
  }
  
  const timeoutId = setTimeout(() => {
    controller.abort();
    const duration = Date.now() - startTime;
    
    console.warn(`[${requestId}] Supabase fetch request timed out after 15 seconds: ${url} (${duration}ms)`);
    
    // Log additional information about the request
    if (typeof input === 'string') {
      const urlObj = new URL(input, window.location.origin);
      console.warn(`[${requestId}] Timed out request details: Path: ${urlObj.pathname}, Search: ${urlObj.search}`);
    }
    
    // Check network status
    if (typeof navigator !== 'undefined' && !navigator.onLine) {
      console.warn(`[${requestId}] Network appears to be offline. This may be causing the timeout.`);
    }
    
    // Log performance metrics if available
    if (typeof performance !== 'undefined' && performance.memory) {
      console.log(`[${requestId}] Performance metrics:`, {
        memory: performance.memory,
        navigation: performance.navigation,
        timing: performance.timing
      });
    }
  }, 15000); // 15 second timeout for all Supabase requests
  
  const fetchPromise = fetch(input, {
    ...init,
    signal: controller.signal
  });
  
  return fetchPromise
    .then(response => {
      const duration = Date.now() - startTime;
      console.log(`[${requestId}] Completed Supabase request: ${url} (${duration}ms) - Status: ${response.status}`);
      return response;
    })
    .catch(error => {
      const duration = Date.now() - startTime;
      console.error(`[${requestId}] Supabase request failed: ${url} (${duration}ms)`, error);
      
      // If this is an abort error from our timeout, provide a clearer message
      if (error.name === 'AbortError') {
        throw new Error(`Request to ${url} timed out after 15 seconds`);
      }
      
      throw error;
    })
    .finally(() => {
      clearTimeout(timeoutId);
    });
}

// Export the singleton client
export const supabase = getSupabaseClient();

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