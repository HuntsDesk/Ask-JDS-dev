import { supabase } from '../supabase';

type AIResponse = {
  choices?: Array<{ message: { content: string } }>;
  candidates?: Array<{ content: { parts: Array<{ text: string }> } }>;
};

export async function callAIRelay(
  provider: string, 
  model: string, 
  prompt: string, 
  messages: Array<{ role: string; content: string }>
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

    const baseUrl = new URL(import.meta.env.VITE_SUPABASE_URL).origin;
    const url = `${baseUrl}/functions/v1/chat-relay`;

    console.log('🚀 Sending AI Relay Request:', {
      url,
      provider,
      model,
      promptLength: prompt.length,
      messagesCount: messages?.length || 0
    });

    // Set up AbortController for timeout
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 60000); // 60 second timeout

    try {
      const response = await fetch(url, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          'Authorization': `Bearer ${session.access_token}`,
        },
        body: JSON.stringify(requestBody),
        signal: controller.signal
      });
      
      // Clear the timeout since we got a response
      clearTimeout(timeoutId);

      let data;
      try {
        // Clone the response before parsing to be able to get the text if parsing fails
        const responseClone = response.clone();
        try {
          data = await response.json();
        } catch (jsonError) {
          // If JSON parsing fails, get the raw text and log it
          const responseText = await responseClone.text();
          console.error('❌ JSON Parse Error:', {
            error: jsonError,
            responseText: responseText.substring(0, 500) + (responseText.length > 500 ? '...' : '')
          });
          
          // Check for network connection issues
          if (responseText.includes("Network connection lost")) {
            throw new Error("Network connection to AI service was lost. Please try again.");
          }
          
          throw jsonError;
        }
      } catch (error) {
        console.error('❌ Response Parsing Error:', error);
        throw error;
      }

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
      // Specific handling for AbortController timeout
      if (error instanceof DOMException && error.name === 'AbortError') {
        console.error('⏱️ AI Relay Timeout: Request aborted after 60 seconds');
        throw new Error("The AI service is taking too long to respond. Please try again later.");
      }
      
      console.error('🔥 AI Relay Fatal Error:', {
        name: error instanceof Error ? error.name : 'Unknown',
        message: error instanceof Error ? error.message : String(error),
        stack: error instanceof Error ? error.stack : undefined
      });
      throw error;
    }
  } catch (error) {
    console.error('🔥 AI Relay Request Setup Error:', error);
    throw error;
  }
}