import OpenAI from 'openai';
import { logError } from './supabase';
import { supabase } from './supabase';
import { 
  prepareConversationHistory, 
  summarizeConversation,
  MAX_RESPONSE_TOKENS 
} from './token-utils';
import type { Message } from '@/types';

const openai = new OpenAI({
  apiKey: import.meta.env.VITE_OPENAI_API_KEY,
  dangerouslyAllowBrowser: true
});

// Default system prompt if none is found in the database
const DEFAULT_SYSTEM_PROMPT = `You are a legal study assistant, helping law students understand complex legal concepts and prepare for exams. 

Your responses should be:
- Clear and educational
- Focused on legal principles and concepts
- Include relevant case law when appropriate
- Avoid giving actual legal advice
- Professional and accurate

Format your responses with:
- Clear paragraph breaks for readability
- Bullet points for lists
- Examples when helpful
- Citations where relevant`;

let cachedSystemPrompt: string | null = null;

async function getSystemPrompt() {
  if (cachedSystemPrompt) return cachedSystemPrompt;
  
  try {
    const { data, error } = await supabase
      .from('system_prompts')
      .select('content')
      .eq('is_active', true)
      .single();

    if (error) {
      console.warn('Error fetching system prompt:', error);
      cachedSystemPrompt = DEFAULT_SYSTEM_PROMPT;
      return DEFAULT_SYSTEM_PROMPT;
    }

    const prompt = data?.content || DEFAULT_SYSTEM_PROMPT;
    cachedSystemPrompt = prompt;
    return prompt;
  } catch (error) {
    console.error('Failed to fetch system prompt:', error);
    cachedSystemPrompt = DEFAULT_SYSTEM_PROMPT;
    return DEFAULT_SYSTEM_PROMPT;
  }
}

export async function generateResponse(prompt: string, threadMessages: Message[] = []) {
  const startTime = Date.now();
  try {
    console.log('Starting OpenAI request...');
    
    const systemPrompt = await getSystemPrompt();
    
    // Prepare conversation history with token limits
    const selectedMessages = prepareConversationHistory(
      threadMessages,
      systemPrompt,
      prompt
    );

    // Create conversation summary if we had to skip messages
    let conversationContext = selectedMessages;
    if (selectedMessages.length < threadMessages.length) {
      const skippedMessages = threadMessages.slice(0, -selectedMessages.length);
      const summary = summarizeConversation(skippedMessages);
      conversationContext = [
        { 
          id: 'summary',
          role: 'assistant',
          content: summary,
          thread_id: threadMessages[0]?.thread_id || '',
          user_id: '',
          created_at: new Date().toISOString()
        },
        ...selectedMessages
      ];
    }

    // Convert messages to OpenAI format
    const messages = [
      {
        role: 'system' as const,
        content: systemPrompt
      },
      ...conversationContext.map(msg => ({
        role: msg.role as 'user' | 'assistant' | 'system',
        content: msg.content
      })),
      { 
        role: 'user' as const, 
        content: prompt 
      }
    ];

    const completion = await openai.chat.completions.create({
      model: 'gpt-4',
      messages,
      temperature: 0.7,
      max_tokens: MAX_RESPONSE_TOKENS
    });

    console.log('OpenAI request completed:', { 
      elapsed: `${Date.now() - startTime}ms`,
      messagesUsed: selectedMessages.length,
      totalMessages: threadMessages.length
    });

    const response = completion.choices[0].message.content || 'I apologize, but I was unable to generate a response.';
    return response.replace(/([.!?])\s+(?=[A-Z])/g, '$1\n\n');
  } catch (error) {
    console.error('OpenAI API Error:', error);
    await logError(error, 'OpenAI API Error');
    throw error;
  }
}

export async function updateSystemPrompt(content: string) {
  try {
    // First, deactivate all existing prompts
    await supabase
      .from('system_prompts')
      .update({ is_active: false })
      .eq('is_active', true);

    // Then create a new active prompt
    const { error } = await supabase
      .from('system_prompts')
      .insert([
        {
          content,
          is_active: true,
          created_by: (await supabase.auth.getUser()).data.user?.id
        }
      ]);

    if (error) throw error;
    
    // Clear the cache when updating
    cachedSystemPrompt = null;
    
    return true;
  } catch (error) {
    console.error('Failed to update system prompt:', error);
    await logError(error, 'Update System Prompt');
    throw error;
  }
}

export async function getSystemPromptHistory() {
  try {
    const { data, error } = await supabase
      .from('system_prompts')
      .select('*')
      .order('created_at', { ascending: false });

    if (error) throw error;
    return data;
  } catch (error) {
    console.error('Failed to fetch system prompt history:', error);
    await logError(error, 'Fetch System Prompt History');
    throw error;
  }
}