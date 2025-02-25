import { useState, useRef } from 'react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { SendIcon } from 'lucide-react';
import { useAuth } from '@/lib/auth';
import ReactMarkdown from 'react-markdown';
import { supabase } from '@/lib/supabase';
import { useSettings } from '@/hooks/use-settings';
import type { Message } from '@/types';
import { Loader2 } from 'lucide-react';

interface ChatInterfaceProps {
  messages: Message[];
  onSendMessage: (content: string) => Promise<Message | null>;
  isLoading: boolean;
  isGenerating: boolean;
}

interface MessageGroup {
  date: string;
  messages: Message[];
}

export function ChatInterface({ messages, onSendMessage, isLoading, isGenerating }: ChatInterfaceProps) {
  const { user } = useAuth();
  const { settings } = useSettings();
  const [newMessage, setNewMessage] = useState('');
  const [sending, setSending] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const typingTimeoutRef = useRef<NodeJS.Timeout>();

  const handleSend = async () => {
    if (!newMessage.trim() || !user) return;

    try {
      setSending(true);
      
      // Insert user message
      const { error: userError } = await supabase
        .from('messages')
        .insert([{
          thread_id: messages[0].thread_id,
          content: newMessage,
          role: 'user',
          user_id: user.id
        }])
        .select()
        .single();

      if (userError) throw userError;
      setNewMessage('');

      // Get session token
      const session = await supabase.auth.getSession();
      const token = session.data.session?.access_token;
      
      if (!token) {
        throw new Error('No authentication token available');
      }

      // Get last few messages for context (e.g., last 10 messages)
      const contextMessages = messages.slice(-10).map(msg => ({
        role: msg.role,
        content: msg.content
      }));

      // Add system message with guardrails
      const systemMessage = {
        role: "system",
        content: `You are an AI assistant focused on helping with legal questions and concepts. You should:
          - Provide accurate, clear explanations of legal concepts
          - Use examples to illustrate complex ideas
          - Break down information into digestible parts
          - Cite relevant legal principles when appropriate
          - Clarify that you're providing general information, not legal advice
          - Maintain a professional, helpful tone
          - Format responses with clear spacing between sections
          - Add a blank line between paragraphs and list items
          - Use headings to organize information`
      };

      // Prepare request payload
      const payload = {
        messages: [
          systemMessage,
          ...contextMessages,
          { role: 'user', content: newMessage }
        ]
      };

      // Update debug logging
      console.log('ChatInterface - Full payload:', {
        messagesCount: payload.messages.length,
        messages: payload.messages,
      });

      const response = await fetch(`https://prbbuxgirnecbkpdpgcb.supabase.co/functions/v1/chat-${settings?.provider || 'openai'}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify(payload)
      });

      const responseData = await response.json();

      if (!response.ok) {
        throw new Error(`Failed to get AI response: ${responseData.error || 'Unknown error'}`);
      }

      // Extract message based on provider response format
      const botMessage = responseData.candidates?.[0]?.content?.parts?.[0]?.text || // Google format
                        responseData.choices?.[0]?.message?.content || // OpenAI format
                        responseData.content;
                        
      console.log('Extracted bot message:', botMessage);

      if (!botMessage) {
        console.error('Response structure:', responseData);
        throw new Error('No message content in AI response');
      }

      // Insert bot message
      const { error: botError } = await supabase
        .from('messages')
        .insert([{
          thread_id: messages[0].thread_id,
          content: botMessage,
          role: 'assistant',
          user_id: user.id
        }])
        .select()
        .single();

      if (botError) throw botError;
    } catch (error) {
      console.error('Error sending message:', error);
    } finally {
      setSending(false);
    }
  };

  const scrollToBottom = () => {
    if (messagesEndRef.current) {
      messagesEndRef.current.scrollIntoView({
        behavior: 'smooth',
        block: 'end'
      });
    }
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setNewMessage(e.target.value);
    
    if (typingTimeoutRef.current) {
      clearTimeout(typingTimeoutRef.current);
    }
    
    typingTimeoutRef.current = setTimeout(() => {
    }, 1000);
  };

  // Add loading indicator for message generation
  const isMessageGenerating = sending || isGenerating;

  return (
    <div className="flex flex-col h-full">
      <div className="flex-1 overflow-y-auto p-4 relative">
        {isLoading ? (
          <div className="flex items-center justify-center h-full">
            <Loader2 className="w-8 h-8 animate-spin" />
          </div>
        ) : (
          <div className="space-y-4 min-h-full">
            {messages.map((message) => (
              <div 
                key={message.id} 
                className={`flex ${message.role === 'assistant' ? 'justify-start' : 'justify-end'}`}
                style={{
                  animation: 'fadeIn 0.2s ease-in-out'
                }}
              >
                <div className={`max-w-[80%] rounded-lg p-3 ${
                  message.role === 'assistant'
                    ? 'bg-muted text-muted-foreground' 
                    : 'bg-primary text-primary-foreground'
                }`}>
                  <ReactMarkdown 
                    className="prose dark:prose-invert max-w-none text-sm md:text-base break-words [&>p]:mb-4 [&>p:last-child]:mb-0 [&>ul]:mt-4 [&>ul]:mb-4 [&>ul:last-child]:mb-0"
                  >
                    {message.content}
                  </ReactMarkdown>
                </div>
              </div>
            ))}
            <div ref={messagesEndRef} />
          </div>
        )}
      </div>
      
      <div className="border-t p-4">
        <div className="flex gap-2">
          <Textarea
            value={newMessage}
            onChange={handleInputChange}
            placeholder="Type your message..."
            className="flex-1"
            onKeyDown={(e) => {
              if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault();
                handleSend();
              }
            }}
          />
          <Button 
            onClick={handleSend}
            disabled={isMessageGenerating || !newMessage.trim()}
            variant={isMessageGenerating ? "secondary" : "default"}
            className={`transition-colors ${
              isMessageGenerating 
                ? "" 
                : "!bg-[#FF5A1F] hover:!bg-[#FF5A1F]/90 !text-white"
            }`}
          >
            <div className="relative w-4 h-4">
              <SendIcon className={`w-4 h-4 absolute inset-0 transition-opacity duration-200 ${
                isMessageGenerating ? 'opacity-0' : 'opacity-100'
              }`} />
              <Loader2 className={`w-4 h-4 absolute inset-0 animate-spin transition-opacity duration-200 ${
                isMessageGenerating ? 'opacity-100' : 'opacity-0'
              }`} />
            </div>
          </Button>
        </div>
      </div>
    </div>
  );
}