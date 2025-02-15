import { GoogleGenerativeAI } from '@google/generative-ai';
import type { AIProvider, AISettings } from '@/types/ai';
import type { Message } from '@/types';
import { prepareConversationHistory, summarizeConversation } from '../token-utils';
import { getSystemPrompt } from '../system-prompt';

export class GeminiProvider implements AIProvider {
  private client: GoogleGenerativeAI;
  private settings: AISettings;

  constructor(settings: AISettings) {
    this.settings = settings;
    this.client = new GoogleGenerativeAI(import.meta.env.VITE_GEMINI_API_KEY);
  }

  async generateResponse(prompt: string, threadMessages: Message[] = []): Promise<string> {
    const model = this.client.getGenerativeModel({ model: this.settings.model });
    const systemPrompt = await getSystemPrompt();
    
    const selectedMessages = prepareConversationHistory(
      threadMessages,
      systemPrompt,
      prompt
    );

    const chat = model.startChat({
      history: selectedMessages.map(msg => ({
        role: msg.role,
        parts: msg.content,
      })),
      generationConfig: {
        temperature: 0.7,
        maxOutputTokens: 1000,
      },
    });

    const result = await chat.sendMessage(prompt);
    const response = result.response.text();
    return response;
  }
} 