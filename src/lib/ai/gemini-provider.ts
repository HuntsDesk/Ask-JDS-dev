import type { AIProvider } from '@/types/ai';
import type { Message } from '@/types';
import { prepareConversationHistory } from '../token-utils';
import { getSystemPrompt } from '../system-prompt';
import { supabase } from '../supabase';

export class GeminiProvider implements AIProvider {
  constructor(private settings: { model: string; provider: string }) {}

  async generateResponse(prompt: string, threadMessages: Message[] = []): Promise<string> {
    try {
      console.log('🚀🚀🚀 USING GEMINI PROVIDER 🚀🚀🚀');
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        console.error('🚫 No active session found');
        throw new Error('No active session');
      }

      // Format messages for the Gemini API
      const messages = threadMessages.map(msg => ({
        role: msg.role,
        content: msg.content
      }));

      // Add the new user message
      messages.push({
        role: 'user',
        content: prompt
      });
      
      console.log('Sending request to Gemini:', {
        model: this.settings.model,
        messagesCount: messages.length
      });

      // Set up AbortController for timeout
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 60000); // 60 second timeout

      const baseUrl = new URL(import.meta.env.VITE_SUPABASE_URL).origin;
      const url = `${baseUrl}/functions/v1/chat-google`;

      const response = await fetch(url, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          'Authorization': `Bearer ${session.access_token}`,
        },
        body: JSON.stringify({ messages }),
        signal: controller.signal
      });
      
      // Clear the timeout since we got a response
      clearTimeout(timeoutId);

      if (!response.ok) {
        console.error('Gemini API error:', response.status, await response.text());
        throw new Error(`Gemini API error: ${response.status}`);
      }

      const data = await response.json();
      console.log('Gemini API response:', data);

      return data.choices?.[0]?.message?.content || 'Error retrieving response';
    } catch (error) {
      console.error('Error calling Gemini API:', error);
      if (error instanceof DOMException && error.name === 'AbortError') {
        throw new Error("The AI service is taking too long to respond. Please try again later.");
      }
      throw error;
    }
  }
}