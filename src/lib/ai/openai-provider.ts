import OpenAI from 'openai';
import type { AIProvider, AISettings } from '@/types/ai';
import type { Message } from '@/types';
import { prepareConversationHistory, summarizeConversation } from '../token-utils';
import { getSystemPrompt } from '../system-prompt';

export class OpenAIProvider implements AIProvider {
  private client: OpenAI;
  private settings: AISettings;

  constructor(settings: AISettings) {
    this.settings = settings;
    this.client = new OpenAI({
      apiKey: import.meta.env.VITE_OPENAI_API_KEY,
      dangerouslyAllowBrowser: true
    });
  }

  async generateResponse(prompt: string, threadMessages: Message[] = []): Promise<string> {
    const startTime = Date.now();
    try {
      const systemPrompt = await getSystemPrompt();
      
      const selectedMessages = prepareConversationHistory(
        threadMessages,
        systemPrompt,
        prompt
      );

      const completion = await this.client.chat.completions.create({
        model: this.settings.model,
        messages: [
          {
            role: 'system',
            content: systemPrompt
          },
          ...selectedMessages.map(msg => ({
            role: msg.role,
            content: msg.content
          })),
          { 
            role: 'user', 
            content: prompt 
          }
        ],
        temperature: 0.7,
        max_tokens: 1000
      });

      const response = completion.choices[0].message.content || 'I apologize, but I was unable to generate a response.';
      return response.replace(/([.!?])\s+(?=[A-Z])/g, '$1\n\n');
    } catch (error) {
      console.error('OpenAI API Error:', error);
      throw error;
    }
  }
} 