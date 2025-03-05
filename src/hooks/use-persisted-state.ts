import { useState, useEffect } from 'react';

// Storage key prefix
const STORAGE_PREFIX = 'ask-jds-persistent-';

/**
 * A hook that persists state to localStorage
 * 
 * @param key The key to use for storage
 * @param defaultValue The default value if nothing exists in storage
 * @returns A tuple like useState with the persisted value and a setter
 */
export function usePersistedState<T>(key: string, defaultValue: T): [T, (value: T | ((val: T) => T)) => void] {
  // Ensure consistent key format with prefix
  const storageKey = `${STORAGE_PREFIX}${key}`;
  
  // Initialize state with persisted value or default
  const [value, setValue] = useState<T>(() => {
    if (typeof window === 'undefined') {
      return defaultValue;
    }
    
    try {
      // Get stored value if it exists
      const stored = localStorage.getItem(storageKey);
      return stored ? JSON.parse(stored) : defaultValue;
    } catch (error) {
      console.error(`Error loading persisted state '${key}':`, error);
      return defaultValue;
    }
  });
  
  // Update localStorage when state changes
  useEffect(() => {
    if (typeof window === 'undefined') {
      return;
    }
    
    try {
      if (value === undefined) {
        localStorage.removeItem(storageKey);
      } else {
        localStorage.setItem(storageKey, JSON.stringify(value));
      }
    } catch (error) {
      console.error(`Error persisting state '${key}':`, error);
    }
  }, [storageKey, value]);
  
  return [value, setValue];
}

/**
 * A hook for session-based persisted state (cleared when browser is closed)
 */
export function useSessionPersistedState<T>(key: string, defaultValue: T): [T, (value: T | ((val: T) => T)) => void] {
  // Ensure consistent key format with prefix
  const storageKey = `${STORAGE_PREFIX}${key}`;
  
  // Initialize state with persisted value or default
  const [value, setValue] = useState<T>(() => {
    if (typeof window === 'undefined') {
      return defaultValue;
    }
    
    try {
      // Get stored value if it exists
      const stored = sessionStorage.getItem(storageKey);
      return stored ? JSON.parse(stored) : defaultValue;
    } catch (error) {
      console.error(`Error loading session persisted state '${key}':`, error);
      return defaultValue;
    }
  });
  
  // Update sessionStorage when state changes
  useEffect(() => {
    if (typeof window === 'undefined') {
      return;
    }
    
    try {
      if (value === undefined) {
        sessionStorage.removeItem(storageKey);
      } else {
        sessionStorage.setItem(storageKey, JSON.stringify(value));
      }
    } catch (error) {
      console.error(`Error persisting session state '${key}':`, error);
    }
  }, [storageKey, value]);
  
  return [value, setValue];
} 