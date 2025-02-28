import type { Content, Part } from '@google/generative-ai';

export interface User {
  id: string;
  email: string;
  // isAdmin is always false in the user app, kept for compatibility with shared backend
  isAdmin: boolean;
  last_sign_in_at?: string;
  user_metadata?: {
    // is_admin is ignored in the user app, but kept for compatibility with shared backend
    is_admin?: boolean;
    preferences?: Record<string, unknown>;
    settings?: Record<string, unknown>;
  };
}

export interface Thread {
  id: string;
  title: string;
  user_id: string;
  created_at: string;
  updated_at: string;
  metadata?: Record<string, unknown>;
}

export interface Message {
  id: string;
  content: string;
  role: 'user' | 'assistant';
  thread_id: string;
  user_id: string;
  created_at: string;
  metadata?: Record<string, unknown>;
  error?: Record<string, unknown>;
}

export interface GeminiMessage extends Content {
  role: 'user' | 'model';
  parts: Part[];
}

export interface ErrorLog {
  id: string;
  message: string;
  stack_trace?: string;
  investigated: boolean;
  created_at: string;
  metadata?: Record<string, unknown>;
  error_data?: Record<string, unknown>;
}

export interface ModelData {
  id: string;
  name: string;
  provider: string;
  model_version: string;
  is_active: boolean;
  created_at: string;
}

export interface AuthContextType {
  user: User | null;
  loading: boolean;
  authInitialized: boolean;
  signIn: (email: string, password: string) => Promise<{ error: Error | null }>;
  signUp: (email: string, password: string) => Promise<{ error: Error | null }>;
  signOut: () => Promise<{ error: Error | null }>;
}