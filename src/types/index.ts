export interface User {
  id: string;
  email: string;
  isAdmin: boolean;
}

export interface Thread {
  id: string;
  title: string;
  created_at: string;
  user_id: string;
}

export interface Message {
  id: string;
  content: string;
  role: 'user' | 'assistant';
  created_at: string;
  thread_id: string;
  user_id: string;
}

export interface ErrorLog {
  id: string;
  message: string;
  stack_trace?: string;
  investigated: boolean;
  created_at: string;
  user_id: string;
}

export interface AuthContextType {
  user: User | null;
  loading: boolean;
  signIn: (email: string, password: string) => Promise<void>;
  signUp: (email: string, password: string) => Promise<void>;
  signOut: () => Promise<void>;
}