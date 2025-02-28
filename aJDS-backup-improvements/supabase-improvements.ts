import { createClient } from '@supabase/supabase-js';

// Create a singleton instance to prevent multiple GoTrueClient instances
let supabaseInstance: ReturnType<typeof createClient> | null = null;
let connectionFailures = 0;
let lastSuccessfulConnection = 0;

// Function to create a new client with retry logic
function createSupabaseClient() {
  if (supabaseInstance) {
    console.log('Returning existing Supabase instance');
    return supabaseInstance;
  }
  
  console.log('Creating new Supabase instance');
  
  try {
    // Add custom fetch with timeout and logging
    const customFetch = (url: RequestInfo | URL, options?: RequestInit) => {
      const startTime = Date.now();
      console.log('Supabase fetch request:', url.toString());
      
      // Create a timeout promise
      const timeoutPromise = new Promise((_, reject) => {
        setTimeout(() => {
          reject(new Error(`Fetch timeout for ${url.toString()}`));
        }, 10000); // 10 second timeout
      });
      
      // Create the actual fetch promise
      const fetchPromise = fetch(url, options).then(response => {
        const endTime = Date.now();
        console.log(`Supabase fetch completed in ${endTime - startTime}ms:`, url.toString());
        
        // Update last successful connection time
        if (response.ok) {
          lastSuccessfulConnection = Date.now();
          connectionFailures = 0;
        }
        
        return response;
      }).catch(error => {
        console.error(`Supabase fetch error for ${url.toString()}:`, error);
        connectionFailures++;
        throw error;
      });
      
      // Race the fetch against the timeout
      return Promise.race([fetchPromise, timeoutPromise]);
    };
    
    // Create the client with custom fetch
    supabaseInstance = createClient(supabaseUrl, supabaseAnonKey, {
      auth: {
        persistSession: true,
        autoRefreshToken: true,
        detectSessionInUrl: true,
        flowType: 'implicit',
      },
      global: {
        fetch: customFetch as typeof fetch
      }
    });
    
    return supabaseInstance;
  } catch (error) {
    console.error('Failed to create Supabase client:', error);
    connectionFailures++;
    
    // Create a minimal client that won't break the app
    try {
      supabaseInstance = createClient(supabaseUrl, supabaseAnonKey, {
        auth: {
          persistSession: true,
          autoRefreshToken: true,
        }
      });
      return supabaseInstance;
    } catch (fallbackError) {
      console.error('Failed to create fallback Supabase client:', fallbackError);
      throw error; // Re-throw the original error
    }
  }
}

// Helper function to check if we're having connection issues
export function hasConnectionIssues(): boolean {
  return connectionFailures > 2 || 
    (lastSuccessfulConnection > 0 && Date.now() - lastSuccessfulConnection > 30000);
}

// Helper function to log errors to the database
export async function logError(error: unknown, context: string): Promise<void> {
  try {
    // Only log errors if we have a valid user session to avoid auth errors
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) {
      console.warn('Not logging error because no user session is available:', context);
      return;
    }
    
    const errorMessage = error instanceof Error ? error.message : String(error);
    const errorStack = error instanceof Error ? error.stack : undefined;
    
    await supabase.from('error_logs').insert({
      user_id: session.user.id,
      error_message: errorMessage,
      error_stack: errorStack,
      context,
      created_at: new Date().toISOString()
    });
  } catch (logError) {
    // Don't throw here, just log to console
    console.error('Failed to log error to database:', logError);
    console.error('Original error:', error);
    console.error('Context:', context);
  }
} 