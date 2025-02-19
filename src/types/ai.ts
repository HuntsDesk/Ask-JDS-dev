import type { Message } from '@/types';

export interface AISettings {
  id: string;
  model: string;
  provider: 'openai' | 'google' | 'anthropic';
  is_active: boolean;
  created_at: string;
  created_by: string | null;
}

export interface AIProvider {
  generateResponse: (prompt: string, threadMessages: Message[]) => Promise<string>;
} 