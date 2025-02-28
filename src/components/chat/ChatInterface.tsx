import React, { useRef, useState, useEffect } from 'react';
import { Message } from '@/types';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { SendIcon, Loader2, Info } from 'lucide-react';
import { useAuth } from '@/lib/auth';
import ReactMarkdown from 'react-markdown';
import { 
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import { useToast } from '@/hooks/use-toast';
import { LoadingSpinner } from '@/components/LoadingSpinner';
import { Progress } from '@/components/ui/progress';

interface ChatInterfaceProps {
  threadId: string;
  messages: Message[];
  loading: boolean;
  loadingTimeout: boolean;
  onSend: (content: string) => Promise<Message | null>;
  onRefresh: () => void;
  messageCount?: number;
  messageLimit?: number;
}

export function ChatInterface({ 
  threadId,
  messages, 
  loading, 
  loadingTimeout,
  onSend, 
  onRefresh,
  messageCount = 0,
  messageLimit = 10
}: ChatInterfaceProps) {
  const { user } = useAuth();
  const [newMessage, setNewMessage] = useState('');
  const [sending, setSending] = useState(false);
  const [sendError, setSendError] = useState<string | null>(null);
  const [showTimeoutWarning, setShowTimeoutWarning] = useState(false);
  const [loadingProgress, setLoadingProgress] = useState(0);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const typingTimeoutRef = useRef<NodeJS.Timeout>();
  const messagesContainerRef = useRef<HTMLDivElement>(null);
  const loadingTimerRef = useRef<NodeJS.Timeout | null>(null);
  const { toast } = useToast();

  // Simulate loading progress
  useEffect(() => {
    if (loading) {
      // Reset progress when loading starts
      setLoadingProgress(0);
      
      // Clear any existing timer
      if (loadingTimerRef.current) {
        clearInterval(loadingTimerRef.current);
      }
      
      // Set up a timer to increment progress
      loadingTimerRef.current = setInterval(() => {
        setLoadingProgress(prev => {
          // Slow down progress as it gets higher
          const increment = prev < 30 ? 5 : prev < 60 ? 3 : prev < 80 ? 1 : 0.5;
          // Cap at 95% until actually loaded
          return Math.min(95, prev + increment);
        });
      }, 300);
    } else {
      // When loading completes, clear the timer and set progress to 100%
      if (loadingTimerRef.current) {
        clearInterval(loadingTimerRef.current);
        loadingTimerRef.current = null;
      }
      setLoadingProgress(100);
    }
    
    // Cleanup on unmount
    return () => {
      if (loadingTimerRef.current) {
        clearInterval(loadingTimerRef.current);
        loadingTimerRef.current = null;
      }
    };
  }, [loading]);

  // Delay showing timeout warnings to prevent them from flashing immediately on load
  useEffect(() => {
    let timeoutId: NodeJS.Timeout;
    
    if (loadingTimeout) {
      // Only show timeout warning after 2 seconds of continued timeout state
      timeoutId = setTimeout(() => {
        setShowTimeoutWarning(true);
      }, 2000);
    } else {
      setShowTimeoutWarning(false);
    }
    
    return () => {
      if (timeoutId) clearTimeout(timeoutId);
    };
  }, [loadingTimeout]);

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
    if (!newMessage.trim()) return;
    
    // Reset any previous send errors
    setSendError(null);
    setSending(true);
    
    const messageContent = newMessage.trim();
    setNewMessage('');
    
    try {
      // Set up a timeout for message sending
      const sendPromise = onSend(messageContent);
      const timeoutPromise = new Promise<null>((_, reject) => {
        setTimeout(() => reject(new Error('Message sending timed out')), 8000);
      });
      
      // Race the message sending against the timeout
      const result = await Promise.race([sendPromise, timeoutPromise]);
      
      if (!result) {
        console.error('Failed to send message, result was null');
        toast({
          title: "Failed to send message",
          description: "The message couldn't be sent. The database might be slow to respond.",
          variant: "destructive",
        });
      }
    } catch (error) {
      console.error('Error sending message:', error);
      
      // Check if this was a timeout error
      const errorMessage = error instanceof Error && error.message === 'Message sending timed out'
        ? "Database is responding slowly. Please try again in a moment."
        : "We couldn't send your message. Please try again.";
      
      toast({
        title: "Error sending message",
        description: errorMessage,
        variant: "destructive",
      });
      
      // Keep the message content in the input field so the user doesn't lose their message
      setNewMessage(messageContent);
      setSendError(errorMessage);
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

  // Calculate remaining messages
  const remainingMessages = Math.max(0, messageLimit - messageCount);
  const isNearLimit = remainingMessages <= 3 && remainingMessages > 0;

  // Get loading message based on progress
  const getLoadingMessage = () => {
    if (loadingProgress < 30) {
      return "Connecting to database...";
    } else if (loadingProgress < 60) {
      return "Retrieving messages...";
    } else if (loadingProgress < 90) {
      return "Processing conversation...";
    } else {
      return "Almost ready...";
    }
  };

  return (
    <div className="flex flex-col h-full">
      <div className="flex-1 overflow-hidden">
        {loading ? (
          <div className="flex flex-col items-center justify-center h-[calc(100vh-150px)]">
            <LoadingSpinner size="lg" />
            <div className="mt-4 w-full max-w-md px-4">
              <p className="text-sm text-gray-500 mb-2 text-center">{getLoadingMessage()}</p>
              <Progress value={loadingProgress} className="h-1 mb-2" />
              <p className="text-xs text-gray-400 text-center">
                {loadingProgress < 95 ? `${Math.round(loadingProgress)}% complete` : "Finalizing..."}
              </p>
            </div>
            {showTimeoutWarning && loadingTimeout && (
              <div className="mt-4 max-w-md text-center px-4">
                <p className="text-sm text-amber-600">
                  The database is responding slowly. Your messages will appear shortly.
                </p>
                <p className="text-xs text-gray-500 mt-1">
                  This might take a few more seconds. Thanks for your patience.
                </p>
              </div>
            )}
          </div>
        ) : loadingTimeout && showTimeoutWarning ? (
          <div className="flex flex-col items-center justify-center h-full">
            <div className="text-center max-w-md mx-auto p-6">
              <h3 className="text-xl font-semibold mb-2">Taking longer than expected</h3>
              <p className="mb-4 text-gray-600">
                We're having trouble loading your messages. The database might be slow to respond.
              </p>
              <div className="flex justify-center">
                <Button onClick={onRefresh} variant="default">
                  Refresh
                </Button>
              </div>
            </div>
          </div>
        ) : (
          <div 
            ref={messagesContainerRef}
            className="p-4 overflow-y-auto h-full"
          >
            {messages.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-full text-center">
                <h3 className="text-xl font-semibold mb-2">Start a new conversation</h3>
                <p className="mb-4 text-gray-600 max-w-md">
                Engage in insightful legal discussions. Whether you’re preparing for the bar exam, 
                navigating law school, or exploring complex legal topics, Ask JDS is here to provide 
                clear, reliable, and knowledgeable guidance.
                </p>
              </div>
            ) : (
              messages.map((message) => (
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
              ))
            )}
            
            {sending && (
              <div className="flex items-start mb-4">
                <div className="flex-1 bg-muted p-3 rounded-lg">
                  <div className="flex items-center">
                    <Loader2 className="h-4 w-4 animate-spin mr-2 text-muted-foreground" />
                    <span className="text-sm">Ask JDS is responding...</span>
                  </div>
                </div>
              </div>
            )}
            
            <div ref={messagesEndRef} />
          </div>
        )}
      </div>
      
      <div className="border-t p-4">
        {/* Message count indicator */}
        {isNearLimit && (
          <div className="mb-2 text-sm text-amber-500 flex items-center">
            <Info className="w-4 h-4 mr-1" />
            You have {remainingMessages} free {remainingMessages === 1 ? 'message' : 'messages'} remaining this month.
          </div>
        )}
        
        {/* Message send error indicator */}
        {sendError && (
          <div className="mb-2 text-sm text-red-500 flex items-center">
            <Info className="w-4 h-4 mr-1" />
            {sendError}
          </div>
        )}
        
        <div className="flex gap-2">
          <Textarea
            value={newMessage}
            onChange={handleInputChange}
            placeholder="Type your message..."
            className="flex-1"
            disabled={loading || (loadingTimeout && showTimeoutWarning)}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault();
                handleSend();
              }
            }}
          />
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <Button 
                  onClick={handleSend}
                  disabled={loading || (loadingTimeout && showTimeoutWarning) || sending || !newMessage.trim()}
                  variant={sending ? "secondary" : "default"}
                  className={`transition-colors ${
                    sending 
                      ? "" 
                      : "!bg-[#FF5A1F] hover:!bg-[#FF5A1F]/90 !text-white"
                  }`}
                >
                  <div className="relative w-4 h-4">
                    <SendIcon className={`w-4 h-4 absolute inset-0 transition-opacity duration-200 ${
                      sending ? 'opacity-0' : 'opacity-100'
                    }`} />
                    <Loader2 className={`w-4 h-4 absolute inset-0 animate-spin transition-opacity duration-200 ${
                      sending ? 'opacity-100' : 'opacity-0'
                    }`} />
                  </div>
                </Button>
              </TooltipTrigger>
              <TooltipContent>
                <p>Send message ({messageCount}/{messageLimit} used)</p>
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>
        </div>
      </div>
    </div>
  );
}