import type { AIProvider } from '@/types/ai';
import type { Message } from '@/types';
import { prepareConversationHistory } from '../token-utils';
import { getSystemPrompt } from '../system-prompt';
import { callAIRelay } from './relay-utils';

export class GeminiProvider implements AIProvider {
  constructor(private settings: { model: string; provider: string }) {}

  async generateResponse(prompt: string, threadMessages: Message[] = []): Promise<string> {
    const systemPrompt = await getSystemPrompt();
    const formattedMessages = prepareConversationHistory(threadMessages, systemPrompt, prompt);
    
    // Convert the Gemini message format to the relay format
    const messages = formattedMessages.map(msg => ({
      role: msg.role,
      content: msg.parts[0].text
    }));
    
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