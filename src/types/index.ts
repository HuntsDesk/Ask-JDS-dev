import type { Content, Part } from '@google/generative-ai';

export interface User {
  id: string;
  email: string;
  isAdmin: boolean;
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
  is_bot: boolean;
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

export interface AuthContextType {
  user: User | null;
  loading: boolean;
  signIn: (email: string, password: string) => Promise<unknown>;
  signUp: (email: string, password: string) => Promise<unknown>;
  signOut: () => Promise<void>;
}

export interface UserMetadata {
  is_admin?: boolean;
  preferences?: Record<string, unknown>;
  settings?: Record<string, unknown>;
}