// Key improvements from auth.tsx

// 1. Timeout handling for promises
function withTimeout<T>(promise: Promise<T>, timeoutMs: number, errorMessage: string): Promise<T> {
  console.log(`Setting timeout of ${timeoutMs}ms for operation: ${errorMessage}`);
  return Promise.race([
    promise,
    new Promise<T>((_, reject) => {
      setTimeout(() => {
        console.error(`Operation timed out after ${timeoutMs}ms: ${errorMessage}`);
        reject(new Error(errorMessage));
      }, timeoutMs);
    })
  ]);
}

// 2. Improved admin status checking
async function checkAdminStatus(userId: string): Promise<boolean> {
  try {
    console.log('Checking admin status for user:', userId);
    
    // First, try to use the session data directly (fastest method)
    try {
      const { data: sessionData, error: sessionError } = await supabase.auth.getSession();
      
      if (!sessionError && sessionData?.session?.user) {
        const isAdmin = sessionData.session.user.user_metadata?.is_admin === true;
        if (isAdmin !== undefined) {
          console.log('Admin status from session metadata:', isAdmin);
          return isAdmin;
        }
      }
    } catch (err) {
      console.log('Could not get admin status from session, trying user data');
    }
    
    // Then try to get user data with a timeout
    try {
      const { data: userData, error: userError } = await withTimeout(
        supabase.auth.getUser(),
        8000, // Increased timeout
        'Get user metadata timed out'
      );
      
      if (!userError && userData?.user) {
        const isAdmin = userData.user.user_metadata?.is_admin === true;
        console.log('Admin status from user metadata:', isAdmin);
        return isAdmin;
      }
    } catch (err) {
      console.error('Failed to get user metadata:', err);
    }
    
    // Last resort: check if we have a cached user in localStorage
    if (typeof window !== 'undefined') {
      try {
        const supabaseKey = Object.keys(localStorage).find(key => 
          key.startsWith('supabase.auth.token') && key.includes(userId)
        );
        
        if (supabaseKey) {
          const storedData = JSON.parse(localStorage.getItem(supabaseKey) || '{}');
          if (storedData?.user?.user_metadata?.is_admin === true) {
            console.log('Admin status from localStorage:', true);
            return true;
          }
        }
      } catch (e) {
        console.error('Error checking localStorage for admin status:', e);
      }
    }
    
    // If we get here, default to non-admin
    console.log('Defaulting to non-admin status');
    return false;
  } catch (err) {
    console.error('Failed to check admin status:', err);
    return false;
  }
}

// 3. Fallback mode for offline or connection issues
const enterFallbackMode = () => {
  console.log('Entering fallback mode due to Supabase connection issues');
  setFallbackMode(true);
  setLoading(false);
  setError(new Error('Unable to connect to authentication service. Limited functionality available.'));
};

// 4. Session retrieval with localStorage caching
const getSessionWithFallback = async () => {
  // Try to get session from localStorage first for faster initialization
  let sessionFromStorage = null;
  
  if (typeof window !== 'undefined') {
    try {
      // Look for Supabase session in localStorage
      const supabaseKey = Object.keys(localStorage).find(key => 
        key.startsWith('supabase.auth.token')
      );
      
      if (supabaseKey) {
        const storedData = JSON.parse(localStorage.getItem(supabaseKey) || '{}');
        if (storedData?.currentSession) {
          console.log('Found session in localStorage, using it for initial render');
          sessionFromStorage = storedData.currentSession;
        }
      }
    } catch (e) {
      console.error('Error checking localStorage for session:', e);
    }
  }
  
  // If we have a session in localStorage, use it immediately
  if (sessionFromStorage) {
    return { data: { session: sessionFromStorage }, error: null };
  }
  
  // Otherwise, fetch from API with timeout
  try {
    return await withTimeout(
      supabase.auth.getSession(),
      8000, // Increased timeout
      'Get session timed out'
    );
  } catch (err) {
    console.error('Session fetch error:', err);
    throw err;
  }
}; 