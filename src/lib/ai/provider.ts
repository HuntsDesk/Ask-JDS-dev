import type { Message } from '@/types';

export interface AIProvider {
  generateResponse: (prompt: string, threadMessages: Message[]) => Promise<string>;
}