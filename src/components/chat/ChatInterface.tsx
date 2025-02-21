import { useState, useRef, useEffect, useCallback } from 'react';
import { Send, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Card } from '@/components/ui/card';
import { Avatar } from '@/components/ui/avatar';
import { Message } from '@/types';
import ReactMarkdown from 'react-markdown';
import { format, isToday, isYesterday } from 'date-fns';

interface ChatInterfaceProps {
  messages: Message[];
  onSendMessage: (content: string) => Promise<void>;
  isLoading?: boolean;
  isGenerating?: boolean;
}

interface MessageGroup {
  date: string;
  messages: Message[];
}

export function ChatInterface({ messages, onSendMessage, isLoading = false, isGenerating = false }: ChatInterfaceProps) {
  console.log('ChatInterface render:', { 
    isGenerating, 
    isLoading, 
    messageCount: messages.length,
    time: new Date().toISOString()
  });
  const [input, setInput] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const scrollAreaRef = useRef<HTMLDivElement>(null);
  const typingTimeoutRef = useRef<NodeJS.Timeout>();

  const scrollToBottom = useCallback((behavior: ScrollBehavior = 'smooth') => {
    if (messagesEndRef.current) {
      messagesEndRef.current.scrollIntoView({ behavior, block: 'end' });
    }
  }, []);

  const groupMessagesByDate = useCallback((messages: Message[]): MessageGroup[] => {
    const groups: { [key: string]: Message[] } = {};
    
    messages.forEach(message => {
      const date = new Date(message.created_at);
      let dateString = '';
      
      if (isToday(date)) {
        dateString = 'Today';
      } else if (isYesterday(date)) {
        dateString = 'Yesterday';
      } else {
        dateString = format(date, 'MMMM d, yyyy');
      }
      
      if (!groups[dateString]) {
        groups[dateString] = [];
      }
      groups[dateString].push(message);
    });
    
    return Object.entries(groups).map(([date, messages]) => ({
      date,
      messages
    }));
  }, []);

  const handleInputChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setInput(e.target.value);
    setIsTyping(true);
    
    if (typingTimeoutRef.current) {
      clearTimeout(typingTimeoutRef.current);
    }
    
    typingTimeoutRef.current = setTimeout(() => {
      setIsTyping(false);
    }, 1000);
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages, scrollToBottom]);

  useEffect(() => {
    return () => {
      if (typingTimeoutRef.current) {
        clearTimeout(typingTimeoutRef.current);
      }
    };
  }, []);

  useEffect(() => {
    console.log('isGenerating changed:', isGenerating);
  }, [isGenerating]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (input.trim() && !isLoading && !isGenerating) {
      const message = input.trim();
      setInput('');
      try {
        await onSendMessage(message);
      } catch (error) {
        setInput(message);
        console.error('Failed to send message:', error);
      }
    }
  };

  const messageGroups = groupMessagesByDate(messages);

  return (
    <div className="flex flex-col h-full">
      <ScrollArea className="flex-1 px-4 py-4 md:px-6" ref={scrollAreaRef}>
        <div className="flex flex-col justify-end min-h-full max-w-3xl mx-auto space-y-6">
          {messageGroups.map(({ date, messages }) => (
            <div key={date} className="space-y-4">
              <div className="sticky top-0 z-10 flex justify-center">
                <span className="px-2 py-1 text-xs bg-muted rounded-full">
                  {date}
                </span>
              </div>
              <div className="space-y-4">
                {messages.map((message, index) => (
                  <Card 
                    key={`${message.id}-${index}`}
                    className={`p-3 md:p-4 ${
                      message.role === 'assistant' ? 'bg-secondary' : ''
                    }`}
                  >
                    <div className="flex items-start gap-3">
                      <Avatar className="w-6 h-6 md:w-8 md:h-8 shrink-0">
                        <div className="flex items-center justify-center w-full h-full bg-muted text-xs md:text-base">
                          {message.role === 'assistant' ? '🤖' : '👤'}
                        </div>
                      </Avatar>
                      <div className="flex-1 min-w-0 space-y-1">
                        <div className="flex items-center gap-2">
                          <span className="text-xs text-muted-foreground">
                            {format(new Date(message.created_at), 'HH:mm')}
                          </span>
                        </div>
                        <ReactMarkdown 
                          className="prose dark:prose-invert max-w-none text-sm md:text-base break-words [&>p]:mb-4 [&>p:last-child]:mb-0 [&>ul]:mt-4 [&>ul]:mb-4 [&>ul:last-child]:mb-0"
                          components={{
                            p: ({ children }) => (
                              <p className="mb-4 last:mb-0">{children}</p>
                            ),
                            code: ({ node, inline, className, children, ...props }) => {
                              if (inline) {
                                return (
                                  <code className="px-1 py-0.5 rounded-md bg-muted font-mono text-sm" {...props}>
                                    {children}
                                  </code>
                                );
                              }
                              return (
                                <pre className="p-4 rounded-lg bg-muted font-mono text-sm overflow-x-auto">
                                  <code {...props}>{children}</code>
                                </pre>
                              );
                            }
                          }}
                        >
                          {message.content}
                        </ReactMarkdown>
                      </div>
                    </div>
                  </Card>
                ))}
              </div>
            </div>
          ))}
          
          {(isLoading || isGenerating) && (
            <Card className="p-3 md:p-4 bg-secondary">
              <div className="flex items-start gap-3">
                <Avatar className="w-6 h-6 md:w-8 md:h-8 shrink-0">
                  <div className="flex items-center justify-center w-full h-full bg-muted text-xs md:text-base">
                    🤖
                  </div>
                </Avatar>
                <div className="flex items-center gap-2 text-muted-foreground">
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span className="text-sm md:text-base">
                    {isGenerating ? 'Thinking...' : 'Loading messages...'}
                  </span>
                </div>
              </div>
            </Card>
          )}
          
          <div ref={messagesEndRef} />
        </div>
      </ScrollArea>
      
      <div className="border-t bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 p-4 sticky bottom-0">
        <form onSubmit={handleSubmit} className="flex gap-2 max-w-3xl mx-auto">
          <Textarea
            value={input}
            onChange={handleInputChange}
            placeholder="Type a message..."
            className="min-h-[44px] md:min-h-[60px] max-h-[200px] text-sm md:text-base resize-none flex-1"
            onKeyDown={(e) => {
              if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault();
                handleSubmit(e);
              }
            }}
            disabled={isLoading || isGenerating}
          />
          <Button 
            type="submit" 
            disabled={isLoading || isGenerating || !input.trim()}
            size="icon"
            className="shrink-0"
          >
            {isGenerating ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <Send className="w-4 h-4" />
            )}
          </Button>
        </form>
      </div>
    </div>
  );
}