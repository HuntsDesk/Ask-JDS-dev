export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export interface Database {
  public: {
    Tables: {
      threads: {
        Row: {
          id: string
          title: string
          created_at: string
          user_id: string
        }
        Insert: {
          id?: string
          title: string
          created_at?: string
          user_id?: string
        }
        Update: {
          id?: string
          title?: string
          created_at?: string
          user_id?: string
        }
      }
      messages: {
        Row: {
          id: string
          content: string
          role: 'user' | 'assistant'
          created_at: string
          thread_id: string
          user_id: string
        }
        Insert: {
          id?: string
          content: string
          role: 'user' | 'assistant'
          created_at?: string
          thread_id: string
          user_id?: string
        }
        Update: {
          id?: string
          content?: string
          role?: 'user' | 'assistant'
          created_at?: string
          thread_id?: string
          user_id?: string
        }
      }
      error_logs: {
        Row: {
          id: string
          message: string
          stack_trace?: string
          investigated: boolean
          created_at: string
          user_id: string
        }
        Insert: {
          id?: string
          message: string
          stack_trace?: string
          investigated?: boolean
          created_at?: string
          user_id?: string
        }
        Update: {
          id?: string
          message?: string
          stack_trace?: string
          investigated?: boolean
          created_at?: string
          user_id?: string
        }
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      is_admin: {
        Args: { userId: string }
        Returns: boolean
      }
    }
    Enums: {
      [_ in never]: never
    }
  }
}