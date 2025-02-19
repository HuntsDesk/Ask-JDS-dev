import type { AIProvider, AISettings } from '@/types/ai';
import { OpenAIProvider } from './openai-provider';
import { GeminiProvider } from './gemini-provider';

export function createAIProvider(settings: AISettings): AIProvider {
  switch (settings.provider) {
    case 'openai':
      return new OpenAIProvider(settings);
    case 'google':
      return new GeminiProvider(settings);
    default:
      throw new Error(`Unsupported AI provider: ${settings.provider}`);
  }
} 