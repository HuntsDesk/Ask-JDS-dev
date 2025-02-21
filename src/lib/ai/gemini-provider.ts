import type { AIProvider, AISettings } from '@/types/ai';
import type { Message } from '@/types';
import { prepareConversationHistory } from '../token-utils';
import { getSystemPrompt } from '../system-prompt';
import { callAIRelay } from './relay-utils';

export class GeminiProvider implements AIProvider {
  private settings: AISettings;

  constructor(settings: AISettings) {
    this.settings = settings;
  }

  async generateResponse(prompt: string, threadMessages: Message[] = []): Promise<string> {
    const systemPrompt = await getSystemPrompt();
    const messages = prepareConversationHistory(threadMessages, systemPrompt, prompt);
    
    console.log('Sending request to relay:', {
      provider: 'google',
      model: this.settings.model,
      prompt,
      messages
    });
    
    const data = await callAIRelay('google', this.settings.model, prompt, messages);
    return data.candidates?.[0]?.content?.parts?.[0]?.text || 'Error retrieving response';
  }
} 