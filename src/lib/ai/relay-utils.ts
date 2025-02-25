import { supabase } from '../supabase';

type AIResponse = {
  choices?: Array<{ message: { content: string } }>;
  candidates?: Array<{ content: { parts: Array<{ text: string }> } }>;
};

export async function callAIRelay(
  provider: string, 
  model: string, 
  prompt: string, 
  messages: unknown
): Promise<AIResponse> {
  try {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) {
      console.error('🚫 No active session found');
      throw new Error('No active session');
    }

    // Ensure messages is always an array
    const requestBody = {
      provider,
      model,
      prompt,
      messages: messages ?? []
    };

    console.log('🚀 Sending AI Relay Request:', {
      url: `${supabase.supabaseUrl}/functions/v1/chat-relay`,
      provider,
      model,
      promptLength: prompt.length,
      messagesCount: requestBody.messages.length,
      body: JSON.stringify(requestBody, null, 2)
    });

    const response = await fetch(`${supabase.supabaseUrl}/functions/v1/chat-relay`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${session.access_token}`,
      },
      body: JSON.stringify(requestBody)
    });

    const data = await response.json();

    if (!response.ok) {
      console.error('❌ AI Relay Error:', {
        status: response.status,
        statusText: response.statusText,
        data
      });
      throw new Error(`AI Relay failed: ${data.error?.message || data.error || response.statusText}`);
    }

    console.log('✅ AI Relay Success:', {
      status: response.status,
      dataLength: JSON.stringify(data).length
    });

    return data;
  } catch (error) {
    console.error('🔥 AI Relay Fatal Error:', {
      name: error.name,
      message: error.message,
      stack: error.stack
    });
    throw error;
  }
}
