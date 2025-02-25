import type { AIProvider } from './provider';
import type { Message } from '@/types/chat';
import type { AISettings } from '@/types/ai';
import { callAIRelay } from './relay-utils';
import { getSystemPrompt } from '@/lib/system-prompt';

export class OpenAIProvider implements AIProvider {
  private settings: AISettings;

  constructor(settings: AISettings) {
    this.settings = settings;
  }

  async generateResponse(prompt: string, threadMessages: Message[] = []): Promise<string> {
    try {
      const systemPrompt = await getSystemPrompt();
      
      // Format messages correctly for OpenAI
      const messages = [
        { role: 'system', content: systemPrompt },
        ...threadMessages.map(msg => ({
          // Ensure role is one of: 'system', 'assistant', 'user'
          role: msg.role === 'model' ? 'assistant' : 'user',
          content: msg.content
        })),
        { role: 'user', content: prompt }
      ];

      console.log('📤 OpenAI Provider - Sending Request:', {
        model: this.settings.model,
        messagesCount: messages.length,
        roles: messages.map(m => m.role)
      });

      const data = await callAIRelay(
        'openai',
        this.settings.model,
        prompt,
        messages
      );

      console.log('✅ OpenAI Provider - Response Received');
      return data.choices?.[0]?.message?.content || 'Error retrieving response';
    } catch (error) {
      console.error('❌ OpenAI Provider - Error:', error);
      throw error;
    }
  }
} 