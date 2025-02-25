import React, { useRef, useState, useEffect } from 'react';
import { Message } from '@/types';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { SendIcon, Loader2 } from 'lucide-react';
import { useAuth } from '@/lib/auth';
import ReactMarkdown from 'react-markdown';

interface ChatInterfaceProps {
  messages: Message[];
  onSendMessage: (content: string) => Promise<Message | null>;
  isLoading: boolean;
  isGenerating: boolean;
}

export function ChatInterface({ messages, onSendMessage, isLoading, isGenerating }: ChatInterfaceProps) {
  const { user } = useAuth();
  const [newMessage, setNewMessage] = useState('');
  const [sending, setSending] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const typingTimeoutRef = useRef<NodeJS.Timeout>();
  const messagesContainerRef = useRef<HTMLDivElement>(null);

  // Scroll to bottom when messages change
  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const scrollToBottom = () => {
    if (messagesEndRef.current) {
      messagesEndRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  };

  const handleSend = async () => {
    if (!newMessage.trim() || !user) return;

    const messageToSend = newMessage.trim();
    
    // Clear the input immediately
    setNewMessage('');

    try {
      setSending(true);
      
      // Use the onSendMessage prop instead of directly inserting
      await onSendMessage(messageToSend);
      
      // Input is already cleared above
    } catch (error) {
      console.error('Error sending message:', error);
    } finally {
      setSending(false);
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
      <div className="flex-1 overflow-y-auto p-4 relative" ref={messagesContainerRef}>
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
            
            {/* Typing indicator */}
            {isMessageGenerating && (
              <div className="flex justify-start">
                <div className="bg-muted text-muted-foreground max-w-[80%] rounded-lg p-3 flex items-center space-x-2">
                  <div className="typing-indicator">
                    <span></span>
                    <span></span>
                    <span></span>
                  </div>
                  <span className="text-sm">Ask JDS is responding...</span>
                </div>
              </div>
            )}
            
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