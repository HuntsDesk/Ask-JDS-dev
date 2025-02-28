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
      user_subscriptions: {
        Row: {
          id: string
          user_id: string
          subscription_id: string
          status: 'active' | 'canceled' | 'past_due' | 'trialing'
          price_id: string
          quantity: number
          cancel_at_period_end: boolean
          created_at: string
          current_period_start: string
          current_period_end: string
          ended_at: string | null
          cancel_at: string | null
          canceled_at: string | null
          trial_start: string | null
          trial_end: string | null
        }
        Insert: {
          id?: string
          user_id: string
          subscription_id: string
          status: 'active' | 'canceled' | 'past_due' | 'trialing'
          price_id: string
          quantity?: number
          cancel_at_period_end?: boolean
          created_at?: string
          current_period_start: string
          current_period_end: string
          ended_at?: string | null
          cancel_at?: string | null
          canceled_at?: string | null
          trial_start?: string | null
          trial_end?: string | null
        }
        Update: {
          id?: string
          user_id?: string
          subscription_id?: string
          status?: 'active' | 'canceled' | 'past_due' | 'trialing'
          price_id?: string
          quantity?: number
          cancel_at_period_end?: boolean
          created_at?: string
          current_period_start?: string
          current_period_end?: string
          ended_at?: string | null
          cancel_at?: string | null
          canceled_at?: string | null
          trial_start?: string | null
          trial_end?: string | null
        }
      }
      message_counts: {
        Row: {
          id: string
          user_id: string
          count: number
          period_start: string
          period_end: string
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          user_id: string
          count?: number
          period_start: string
          period_end: string
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          user_id?: string
          count?: number
          period_start?: string
          period_end?: string
          created_at?: string
          updated_at?: string
        }
      }
      profiles: {
        Row: {
          id: string
          user_id: string
          display_name: string | null
          avatar_url: string | null
          bio: string | null
          preferences: Json | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          user_id: string
          display_name?: string | null
          avatar_url?: string | null
          bio?: string | null
          preferences?: Json | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          user_id?: string
          display_name?: string | null
          avatar_url?: string | null
          bio?: string | null
          preferences?: Json | null
          created_at?: string
          updated_at?: string
        }
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      is_admin: {
        Args: { user_id?: string }
        Returns: boolean
      }
      get_user_message_count: {
        Args: { user_id?: string }
        Returns: number
      }
      increment_user_message_count: {
        Args: { user_id?: string }
        Returns: number
      }
    }
    Enums: {
      [_ in never]: never
    }
  }
}