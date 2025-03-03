// Auth utility functions that can be imported by other modules

/**
 * Add a timeout to any promise with retry capability and improved error handling
 */
export function withTimeout<T>(
  promiseFactory: () => Promise<T>, 
  timeoutMs: number, 
  errorMessage: string, 
  retries = 0
): Promise<T> {
  console.log(`Setting timeout of ${timeoutMs}ms for operation: ${errorMessage}`);
  
  // Keep track of cancellations
  let isCancelled = false;
  let timeoutId: NodeJS.Timeout | null = null;
  
  const attempt = (attemptNumber: number): Promise<T> => {
    if (isCancelled) {
      return Promise.reject(new Error('Operation cancelled'));
    }
    
    if (attemptNumber > 0) {
      console.log(`Retry attempt ${attemptNumber} for: ${errorMessage}`);
    }
    
    // Create fresh promise for this attempt
    const timeoutPromise = new Promise<never>((_, reject) => {
      timeoutId = setTimeout(() => {
        console.error(`Operation timed out after ${timeoutMs}ms: ${errorMessage}`);
        reject(new Error(errorMessage));
      }, timeoutMs);
    });
    
    return Promise.race([
      promiseFactory().then(result => {
        // Clear timeout on success
        if (timeoutId) clearTimeout(timeoutId);
        return result;
      }),
      timeoutPromise
    ]).catch(error => {
      // Clear timeout on error
      if (timeoutId) clearTimeout(timeoutId);
      
      // Check network status if we have an error
      if (typeof navigator !== 'undefined' && !navigator.onLine) {
        console.warn('Network appears to be offline during operation');
      }
      
      // If we have retries left and this was a timeout error or network error
      if (retries > 0 && (error.message === errorMessage || error.name === 'TypeError')) {
        console.log(`Retrying after error (${retries} retries left): ${error.message}`);
        retries--;
        
        // Exponential backoff
        const delayMs = Math.min(1000 * Math.pow(1.5, attemptNumber), 5000);
        return new Promise(resolve => setTimeout(resolve, delayMs))
          .then(() => attempt(attemptNumber + 1));
      }
      
      throw error;
    });
  };
  
  const promise = attempt(0);
  
  // Add a cancel method to the promise
  (promise as any).cancel = () => {
    isCancelled = true;
    if (timeoutId) clearTimeout(timeoutId);
  };
  
  return promise;
}

/**
 * Check if the browser is online
 */
export function isOnline(): boolean {
  return typeof navigator !== 'undefined' ? navigator.onLine : true;
}

/**
 * Fetch with retry capability for critical endpoints
 */
export async function fetchWithRetry(
  url: string,
  options: RequestInit = {},
  retries = 3,
  backoff = 300
): Promise<Response> {
  try {
    const response = await fetch(url, options);
    if (response.ok) return response;
    
    // Only retry on 5xx server errors or specific cases
    if (response.status >= 500 || response.status === 429) {
      throw new Error(`HTTP error ${response.status}`);
    }
    
    return response;
  } catch (err) {
    if (retries === 0) throw err;
    
    console.log(`Retrying fetch to ${url}, ${retries} retries left`);
    await new Promise(resolve => setTimeout(resolve, backoff));
    return fetchWithRetry(url, options, retries - 1, backoff * 2);
  }
} 