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
 * Check if the browser is online
 */
export function isOnline(): boolean {
  return typeof navigator !== 'undefined' ? navigator.onLine : true;
} 