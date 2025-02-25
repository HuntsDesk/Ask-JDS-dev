import { Thread, Message } from '@/types';

// Constants for storage keys
const THREADS_KEY = 'offline_threads';
const MESSAGES_KEY = 'offline_messages';
const PENDING_ACTIONS_KEY = 'offline_pending_actions';

// Types for pending actions
type ActionType = 'CREATE_THREAD' | 'UPDATE_THREAD' | 'DELETE_THREAD' | 'SEND_MESSAGE';

interface PendingAction {
  id: string;
  type: ActionType;
  data: Record<string, unknown>;
  timestamp: number;
}

interface StorageData {
  [key: string]: unknown;
}

// Helper functions for local storage
const getItem = <T>(key: string): T | null => {
  try {
    const item = localStorage.getItem(key);
    return item ? JSON.parse(item) : null;
  } catch (error) {
    console.error(`Error reading from localStorage:`, error);
    return null;
  }
};

const setItem = <T>(key: string, value: T): void => {
  try {
    localStorage.setItem(key, JSON.stringify(value));
  } catch (error) {
    console.error(`Error writing to localStorage:`, error);
  }
};

// Thread management
export const saveThreadsOffline = (threads: Thread[]): void => {
  setItem(THREADS_KEY, threads);
};

export const getOfflineThreads = (): Thread[] => {
  return getItem<Thread[]>(THREADS_KEY) || [];
};

// Message management
export const saveMessagesOffline = (threadId: string, messages: Message[]): void => {
  const allMessages = getItem<Record<string, Message[]>>(MESSAGES_KEY) || {};
  allMessages[threadId] = messages;
  setItem(MESSAGES_KEY, allMessages);
};

export const getOfflineMessages = (threadId: string): Message[] => {
  const allMessages = getItem<Record<string, Message[]>>(MESSAGES_KEY) || {};
  return allMessages[threadId] || [];
};

// Pending actions management
export const addPendingAction = (action: Omit<PendingAction, 'id' | 'timestamp'>): void => {
  const pendingActions = getItem<PendingAction[]>(PENDING_ACTIONS_KEY) || [];
  const newAction: PendingAction = {
    ...action,
    id: crypto.randomUUID(),
    timestamp: Date.now()
  };
  pendingActions.push(newAction);
  setItem(PENDING_ACTIONS_KEY, pendingActions);
};

export const removePendingAction = (actionId: string): void => {
  const pendingActions = getItem<PendingAction[]>(PENDING_ACTIONS_KEY) || [];
  const updatedActions = pendingActions.filter(action => action.id !== actionId);
  setItem(PENDING_ACTIONS_KEY, updatedActions);
};

export const getPendingActions = (): PendingAction[] => {
  return getItem<PendingAction[]>(PENDING_ACTIONS_KEY) || [];
};

// Storage space management
export const checkStorageQuota = (): boolean => {
  try {
    const testKey = '_test_storage_';
    const testData = 'x'.repeat(1024 * 1024); // 1MB test
    localStorage.setItem(testKey, testData);
    localStorage.removeItem(testKey);
    return true;
  } catch (error) {
    console.error('Storage quota exceeded:', error);
    return false;
  }
};

// Clear old data
export const clearOldOfflineData = (maxAge: number = 7 * 24 * 60 * 60 * 1000): void => {
  const now = Date.now();
  const pendingActions = getPendingActions();
  const updatedActions = pendingActions.filter(action => now - action.timestamp < maxAge);
  setItem(PENDING_ACTIONS_KEY, updatedActions);
};

export async function saveToStorage(key: string, data: StorageData): Promise<void> {
  setItem(key, data);
}

export async function loadFromStorage<T>(key: string): Promise<T | null> {
  return getItem<T>(key);
}