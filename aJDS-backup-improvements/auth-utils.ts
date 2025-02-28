// Auth utility functions that can be imported by other modules

/**
 * Add a timeout to any promise
 */
export function withTimeout<T>(promise: Promise<T>, timeoutMs: number, errorMessage: string): Promise<T> {
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

/**
 * Get a value from localStorage safely
 */
export function getLocalStorageItem<T>(key: string): T | null {
  try {
    const item = localStorage.getItem(key);
    return item ? JSON.parse(item) : null;
  } catch (err) {
    console.error(`Error getting item from localStorage: ${key}`, err);
    return null;
  }
}

/**
 * Set a value in localStorage safely
 */
export function setLocalStorageItem(key: string, value: any): boolean {
  try {
    localStorage.setItem(key, JSON.stringify(value));
    return true;
  } catch (err) {
    console.error(`Error setting item in localStorage: ${key}`, err);
    return false;
  }
}

/**
 * Find a Supabase auth token in localStorage
 */
export function findSupabaseToken(userId?: string): string | null {
  try {
    const keys = Object.keys(localStorage);
    const tokenKey = userId 
      ? keys.find(key => key.startsWith('supabase.auth.token') && key.includes(userId))
      : keys.find(key => key.startsWith('supabase.auth.token'));
    
    return tokenKey || null;
  } catch (err) {
    console.error('Error finding Supabase token in localStorage', err);
    return null;
  }
}

/**
 * Check if the browser is online
 */
export function isOnline(): boolean {
  return typeof navigator !== 'undefined' ? navigator.onLine : true;
}

/**
 * Parse JWT token to get payload
 */
export function parseJwt(token: string): any {
  try {
    const base64Url = token.split('.')[1];
    const base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/');
    const jsonPayload = decodeURIComponent(
      atob(base64)
        .split('')
        .map(c => '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2))
        .join('')
    );
    return JSON.parse(jsonPayload);
  } catch (err) {
    console.error('Error parsing JWT token', err);
    return null;
  }
} 