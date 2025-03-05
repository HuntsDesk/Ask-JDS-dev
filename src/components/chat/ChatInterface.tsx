import React, { useRef, useState, useEffect } from 'react';
import { Message } from '@/types';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { SendIcon, Loader2, Info, Shield } from 'lucide-react';
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
import { VirtualMessageList } from './VirtualMessageList';
import { ChatMessage } from './ChatMessage';

interface ChatInterfaceProps {
  threadId: string;
  messages: Message[];
  loading: boolean;
  loadingTimeout: boolean;
  onSend: (content: string) => Promise<Message | null>;
  onRefresh: () => void;
  messageCount?: number;
  messageLimit?: number;
  preservedMessage?: string;
  showPaywall: boolean;
}

export function ChatInterface({ 
  threadId,
  messages, 
  loading, 
  loadingTimeout,
  onSend, 
  onRefresh,
  messageCount = 0,
  messageLimit = 10,
  preservedMessage,
  showPaywall
}: ChatInterfaceProps) {
  const { user } = useAuth();
  const [newMessage, setNewMessage] = useState(preservedMessage || '');
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
    // Immediate scroll for the first render and then a delayed scroll to handle any layout shifts
    if (messages.length > 0) {
      scrollToBottom(false);
      // Additional scroll after layout stabilizes
      setTimeout(() => scrollToBottom(true), 300);
    }
  }, [messages.length]);

  // Force scroll to bottom when new messages are added or removed
  useEffect(() => {
    if (messages.length > 0) {
      // Use immediate scroll without smooth behavior first
      scrollToBottom(false);
      
      // Then use smooth scrolling after a short delay, but only if not sending
      // This prevents competing scroll behaviors when a message is being sent
      if (!sending) {
        const timeoutId = setTimeout(() => scrollToBottom(true), 100);
        return () => clearTimeout(timeoutId);
      }
    }
  }, [messages.length, sending]);

  // Handle scroll when sending state changes
  useEffect(() => {
    if (sending) {
      // Short delay to let the UI update with the sending indicator first
      const timeoutId = setTimeout(() => scrollToBottom(false), 50);
      return () => clearTimeout(timeoutId);
    }
  }, [sending]);

  // Update message input when preservedMessage changes
  useEffect(() => {
    if (preservedMessage) {
      setNewMessage(preservedMessage);
    }
  }, [preservedMessage]);

  const scrollToBottom = (smooth = true) => {
    if (!messagesContainerRef.current) return;
    
    // First try scrolling the container with the appropriate behavior
    const container = messagesContainerRef.current;
    const scrollBehavior = smooth ? 'smooth' : 'auto';
    
    // Use requestAnimationFrame to ensure the scroll happens after layout
    requestAnimationFrame(() => {
      // Calculate the target scroll position
      const scrollTarget = container.scrollHeight - container.clientHeight;
      
      // Only use smooth scrolling for small scroll distances to avoid bounce
      const currentPosition = container.scrollTop;
      const distance = Math.abs(scrollTarget - currentPosition);
      const shouldUseSmooth = smooth && distance < 500;
      
      // Apply the scroll with the determined behavior
      container.scrollTo({
        top: scrollTarget,
        behavior: shouldUseSmooth ? 'smooth' : 'auto'
      });
      
      // Also try scrolling the end ref as a fallback, but only if we're not using smooth scrolling
      if (messagesEndRef.current && !shouldUseSmooth) {
        messagesEndRef.current.scrollIntoView({
          behavior: 'auto',
          block: 'end'
        });
      }
    });
  };

  const handleSend = async () => {
    if (!newMessage.trim()) return;
    
    // Reset any previous send errors
    setSendError(null);
    setSending(true);
    
    const messageContent = newMessage.trim();
    // Only clear the message if no errors occur - we'll restore it if needed
    const originalMessage = messageContent;
    
    // We're not clearing the message field until we know we won't hit the limit
    // This helps prevent flickering of UI elements
    
    // Track whether we've shown the timeout warning
    let timeoutWarningShown = false;
    let limitReached = false;
    
    // First, do a preliminary check for message limit to avoid UI flicker
    // Instead of checking here, we'll let the hook handle it
    
    // Don't clear message text until we're sure we won't hit the limit
    try {
      // Set up a timeout to show a warning but not fail the request
      const timeoutId = setTimeout(() => {
        // Only show the toast if we're not hitting the message limit
        if (!showPaywall) {
          timeoutWarningShown = true;
          toast({
            title: "Processing your message",
            description: "This is taking longer than usual. The AI is working on your response, please wait...",
            variant: "warning",
            duration: 15000,
          });
        }
      }, 20000); // Show warning after 20 seconds
      
      // Actually send the message - this will trigger the paywall if needed
      const result = await onSend(messageContent);
      
      // Now it's safe to clear the message if we didn't hit the limit
      if (!showPaywall) {
        setNewMessage('');
      }
      
      // Clear the timeout since we got a response
      clearTimeout(timeoutId);
      
      // Handle different failure cases
      if (!result) {
        if (showPaywall) {
          // Message limit reached case - don't show an error toast
          console.log('Message limit reached, showing paywall');
          limitReached = true;
          // Don't clear message text in this case
        } else {
          // Other failure case
          console.error('Failed to send message, result was null');
          toast({
            title: "Failed to send message",
            description: "The message couldn't be sent properly. You may need to try again.",
            variant: "destructive",
          });
        }
      } else {
        // Successful message, clear the input
        setNewMessage('');
      }
    } catch (error) {
      console.error('Error sending message:', error);
      
      // Only show an error toast if we haven't already shown the timeout warning
      // and we're not showing the paywall
      if (!timeoutWarningShown && !showPaywall && !limitReached) {
        const errorMessage = error instanceof Error 
          ? error.message
          : "We couldn't send your message. Please try again.";
        
        toast({
          title: "Error sending message",
          description: errorMessage,
          variant: "destructive",
        });
      }
      
      // Only show error message if not hitting message limit
      if (!showPaywall && !limitReached) {
        setSendError("An error occurred while sending your message. Your message has been restored to the input field.");
      }
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
    <div className="flex flex-col h-full w-full chat-container pl-0 md:pl-0">
      {/* Messages area - should take most of the space */}
      <div className="flex-1 overflow-hidden message-container w-full">
        <div 
          ref={messagesContainerRef}
          className="flex-1 h-full w-full overflow-y-auto px-4 pb-2 custom-scrollbar"
        >
          {loading && messages.length === 0 ? (
            <div className="flex items-center justify-center h-full">
              <div className="flex flex-col items-center max-w-md text-center p-4">
                <LoadingSpinner size="lg" />
                <p className="mt-4">{getLoadingMessage()}</p>
                {loadingTimeout && (
                  <div className="mt-4 flex flex-col items-center">
                    <p className="mb-2 text-muted-foreground">
                      This is taking longer than expected. You can try refreshing.
                    </p>
                    <Button onClick={onRefresh} variant="outline">
                      Refresh
                    </Button>
                  </div>
                )}
              </div>
            </div>
          ) : messages.length === 0 ? (
            <div className="flex items-center justify-center h-full">
              <div className="flex flex-col items-center max-w-md text-center p-4">
                <Shield className="h-16 w-16 mb-4 text-[#F37022]" />
                <h3 className="text-xl font-semibold mb-2">Welcome to Ask JDS</h3>
                <p className="text-muted-foreground">
                Your trusted legal AI research assistant. Whether you're researching a legal question, 
                navigating law school, or exploring complex legal topics, Ask JDS is here to provide 
                clear, reliable, and knowledgeable guidance.
                </p>
              </div>
            </div>
          ) : (
            <div className="pb-0">
              {messages.map((message, index) => (
                <ChatMessage 
                  key={message.id || `temp-${index}`} 
                  message={message}
                  isLastMessage={index === messages.length - 1}
                />
              ))}
              <div ref={messagesEndRef} style={{ height: '1px' }} />
              
              {/* Only show the indicator when actually sending, with no permanent reserved space */}
              {sending && (
                <div className="flex items-start px-4 my-2">
                  <div className="flex-1 bg-muted/80 p-3 rounded-lg shadow-sm border border-border/30">
                    <div className="flex items-center">
                      <LoadingSpinner size="sm" className="mr-2 text-primary" />
                      <span className="text-sm font-medium">Ask JDS is responding...</span>
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
      
      {/* Input area - fixed height at bottom */}
      <div className="input-container pt-2 pb-4 px-4 border-t border-border w-full">
        {sendError && (
          <div className="mb-2 p-2 text-sm rounded bg-red-50 text-red-600">
            {sendError}
          </div>
        )}
        
        <form 
          onSubmit={(e) => {
            e.preventDefault();
            handleSend();
          }}
          className="flex items-end gap-2 w-full"
        >
          <div className="relative flex-1 w-full">
            <Textarea
              value={newMessage}
              onChange={handleInputChange}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && !e.shiftKey) {
                  e.preventDefault();
                  handleSend();
                }
              }}
              placeholder="Type your message..."
              className="min-h-24 max-h-[200px] py-3 resize-none pr-3 transition-none w-full"
              disabled={sending || loading}
            />
          </div>
          
          <Button 
            size="sm" 
            type="submit" 
            disabled={!newMessage.trim() || sending || loading}
            className={`rounded-md p-2 bg-[#F37022] hover:bg-[#E35D10] text-white ${!newMessage.trim() ? 'opacity-50' : ''}`}
            aria-label="Send message"
          >
            {sending ? (
              <Loader2 className="h-5 w-5 animate-spin" />
            ) : (
              <SendIcon className="h-5 w-5" />
            )}
            <span className="sr-only">Send</span>
          </Button>
        </form>
        
        {isNearLimit && (
          <div className="mt-2 p-2 rounded bg-amber-50 text-amber-700">
            <p className="text-sm flex items-center">
              <Info className="h-4 w-4 mr-2 flex-shrink-0" />
              You have {remainingMessages} message{remainingMessages !== 1 ? 's' : ''} left before hitting your daily limit.
            </p>
          </div>
        )}
      </div>
    </div>
  );
}