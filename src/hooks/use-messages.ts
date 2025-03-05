import { useState, useEffect, useCallback, useRef } from 'react';
import { supabase } from '@/lib/supabase';
import type { Message } from '@/types';
import { useToast } from './use-toast';
import { setPaywallActive } from './use-toast';
import { logError } from '@/lib/supabase';
import { createAIProvider } from '@/lib/ai/provider-factory';
import { useSettings } from './use-settings';
import type { AIProvider } from '@/types/ai';
import { Toast } from '@/components/ui/toast';
import { 
  incrementUserMessageCount, 
  hasReachedFreeMessageLimit,
  getUserMessageCount,
  getLifetimeMessageCount,
  FREE_MESSAGE_LIMIT,
  hasActiveSubscription
} from '@/lib/subscription';

export function useMessages(threadId: string | null, onFirstMessage?: (message: string) => void, onThreadTitleGenerated?: (title: string) => Promise<void>) {
  const { settings } = useSettings();
  const aiProvider = useRef<AIProvider | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [loading, setLoading] = useState(true);
  const [isGenerating, setIsGenerating] = useState(false);
  const [showPaywall, setShowPaywall] = useState(false);
  const [messageCount, setMessageCount] = useState(0);
  const [lifetimeMessageCount, setLifetimeMessageCount] = useState(0);
  const [isSubscribed, setIsSubscribed] = useState(false);
  const [preservedMessage, setPreservedMessage] = useState<string | undefined>(undefined);
  const { toast, dismiss } = useToast();
  const isFirstMessageRef = useRef(true);
  const userMessageCountRef = useRef(0);
  // Add a ref to track message IDs we've already added
  const addedMessageIds = useRef(new Set<string>());
  // Add refs for tracking initial load and toast timeouts
  const initialLoadRef = useRef(true);
  const toastTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  // Initialize AI provider when settings change
  useEffect(() => {
    if (settings) {
      aiProvider.current = createAIProvider(settings);
    }
  }, [settings]);

  // Load user's message count and subscription status on mount
  useEffect(() => {
    const loadUserData = async () => {
      try {
        const [count, lifetimeCount, subscribed] = await Promise.all([
          getUserMessageCount(),
          getLifetimeMessageCount(),
          hasActiveSubscription()
        ]);
        
        setMessageCount(count);
        setLifetimeMessageCount(lifetimeCount);
        setIsSubscribed(subscribed);
      } catch (error) {
        console.error('Error loading user data:', error);
      }
    };
    
    loadUserData();
  }, []);

  // Function to generate a thread title based on multiple messages
  const generateThreadTitle = async (userMessages: Message[]): Promise<string> => {
    if (!aiProvider.current) {
      return "New Conversation";
    }

    try {
      // Extract the content from user messages
      const messageContents = userMessages.map(msg => msg.content).join("\n- ");
      
      // Create a prompt for the AI to generate a concise title based on multiple messages
      const titlePrompt = `Generate a concise, descriptive title (5 words or less) for a conversation that includes these messages:
- ${messageContents}

Respond with ONLY the title, no quotes or additional text.`;
      
      // Use the AI to generate a title
      const titleResponse = await aiProvider.current.generateResponse(titlePrompt, []);
      
      // Clean up the response (remove quotes, trim whitespace)
      const cleanTitle = titleResponse.replace(/^["']|["']$/g, '').trim();
      
      // Use the generated title, or a fallback if it's empty
      return cleanTitle || "New Conversation";
    } catch (error) {
      console.error('Error generating thread title:', error);
      return "New Conversation";
    }
  };

  // Helper function to show delayed toast notifications
  const showDelayedToast = useCallback((toastOptions: any, delay: number = 2000) => {
    // Clear any existing timeout
    if (toastTimeoutRef.current) {
      clearTimeout(toastTimeoutRef.current);
    }
    
    // Only delay toasts on initial load
    if (initialLoadRef.current) {
      toastTimeoutRef.current = setTimeout(() => {
        toast(toastOptions);
        toastTimeoutRef.current = null;
      }, delay);
    } else {
      toast(toastOptions);
    }
  }, [toast]);

  const loadMessages = useCallback(async () => {
    if (!threadId) {
      setMessages([]);
      setLoading(false);
      return;
    }

    setLoading(true);
    // Clear the set of added message IDs when loading a new thread
    addedMessageIds.current.clear();
    // Reset user message counter when loading a new thread
    userMessageCountRef.current = 0;

    // Maximum number of retry attempts
    const MAX_RETRIES = 2;
    let retryCount = 0;
    let success = false;

    while (retryCount <= MAX_RETRIES && !success) {
      try {
        let timeoutId: NodeJS.Timeout | null = null;
        let hasReceivedResponse = false;
        
        // Create a timeout promise that resolves to empty messages
        const timeoutPromise = new Promise<{data: Message[], error: null}>((resolve) => {
          timeoutId = setTimeout(() => {
            if (!hasReceivedResponse) {
              console.warn(`useMessages: Loading messages timed out after 10 seconds (attempt ${retryCount + 1}/${MAX_RETRIES + 1}), returning empty messages`);
              resolve({data: [], error: null});
            }
          }, 10000); // 10 second timeout
        });
        
        // Load messages
        const fetchPromise = supabase
          .from('messages')
          .select('*')
          .eq('thread_id', threadId)
          .order('created_at', { ascending: true });
        
        // Race the fetch against the timeout
        const result = await Promise.race([fetchPromise, timeoutPromise]);
        hasReceivedResponse = true;
        if (timeoutId) clearTimeout(timeoutId);
        
        const { data, error } = result;

        if (error) {
          console.error('Error loading messages:', error);
          throw error;
        }

        if (data && data.length > 0) {
          // Sort messages by created_at just to be safe
          const sortedMessages = [...data].sort((a, b) => 
            new Date(a.created_at).getTime() - new Date(b.created_at).getTime()
          );
          
          // Count user messages for tracking limits
          const userMessageCount = sortedMessages.filter(m => m.role === 'user').length;
          userMessageCountRef.current = userMessageCount;
          
          console.log(`Loaded ${sortedMessages.length} messages (${userMessageCount} from user) for thread ${threadId}`);
          
          setMessages(sortedMessages);
          success = true;
          
          // If this is the first load and the thread has a user message, call onFirstMessage
          if (isFirstMessageRef.current && sortedMessages.some(m => m.role === 'user') && onFirstMessage) {
            const firstUserMessage = sortedMessages.find(m => m.role === 'user');
            if (firstUserMessage) {
              onFirstMessage(firstUserMessage.content);
              isFirstMessageRef.current = false;
            }
          }

          break; // Exit the retry loop if successful
        } else {
          console.log(`No messages found for thread ${threadId} (attempt ${retryCount + 1}/${MAX_RETRIES + 1})`);
          setMessages([]);
          success = true; // Consider empty results a success
          setLoading(false); // Set loading to false immediately for empty threads
          break; // Exit the retry loop since we have a valid (empty) result
        }
      } catch (error) {
        console.error(`Error loading messages (attempt ${retryCount + 1}/${MAX_RETRIES + 1}):`, error);
        
        // If this is the last attempt, set an empty array and show an error
        if (retryCount === MAX_RETRIES) {
          setMessages([]);
          showDelayedToast({
            title: "Error loading messages",
            description: "We encountered an error loading messages. Please try refreshing.",
            variant: "destructive",
          });
        } else {
          // Otherwise, retry after a short delay
          await new Promise(resolve => setTimeout(resolve, 1000 * (retryCount + 1)));
          console.log(`Retrying message load (attempt ${retryCount + 2}/${MAX_RETRIES + 1})...`);
        }
      } finally {
        retryCount++;
      }
    }

    setLoading(false);
  }, [threadId, onFirstMessage, showDelayedToast]);

  // Load messages when thread changes
  useEffect(() => {
    loadMessages();
    // Reset isFirstMessageRef when threadId changes
    isFirstMessageRef.current = true;
    // Reset user message counter when thread changes
    userMessageCountRef.current = 0;
    
    return () => {
      // Clear any pending toast timeouts when unmounting or changing threads
      if (toastTimeoutRef.current) {
        clearTimeout(toastTimeoutRef.current);
        toastTimeoutRef.current = null;
      }
    };
  }, [threadId, loadMessages]);

  // Subscribe to real-time updates
  useEffect(() => {
    if (threadId) {
      // Set up real-time subscription for new messages
      const channel = supabase
        .channel(`messages:thread_id=eq.${threadId}`)
        .on('postgres_changes', { 
          event: 'INSERT', 
          schema: 'public', 
          table: 'messages',
          filter: `thread_id=eq.${threadId}`
        }, (payload) => {
          const newMessageId = payload.new.id;
          
          // Only add the message if we haven't already added it
          if (!addedMessageIds.current.has(newMessageId)) {
            // Double-check that this message isn't already in the list
            // This prevents duplicate messages with the same ID
            setMessages(prev => {
              // Check if message with this ID already exists
              const exists = prev.some(msg => msg.id === newMessageId);
              if (exists) {
                return prev; // Don't add it again
              }
              
              // Add the message ID to our tracking set
              addedMessageIds.current.add(newMessageId);
              return [...prev, payload.new as Message];
            });
          }
        })
        .subscribe();
      
      return () => {
        supabase.removeChannel(channel);
      };
    }
  }, [threadId]);

  // Check if user has reached message limit before sending
  const checkMessageLimit = useCallback(async (messageContent?: string): Promise<boolean> => {
    try {
      // Refresh subscription status before checking limit
      const subscribed = await hasActiveSubscription();
      setIsSubscribed(subscribed);
      
      // If user is subscribed, they have no limit
      if (subscribed) {
        return false;
      }
      
      // For free users, check if they've reached the limit
      const count = await getUserMessageCount();
      setMessageCount(count);
      
      const hasReachedLimit = count >= FREE_MESSAGE_LIMIT;
      
      // If limit reached and a message was provided, preserve it
      if (hasReachedLimit && messageContent) {
        setPreservedMessage(messageContent);
        
        // Dismiss any active toasts to prevent them from appearing alongside the paywall
        dismiss();
      }
      
      setShowPaywall(hasReachedLimit);
      return hasReachedLimit;
    } catch (error) {
      console.error('Error checking message limit:', error);
      return false;
    }
  }, [dismiss]);

  // Handle closing the paywall
  const handleClosePaywall = useCallback(() => {
    // Reset the global paywall flag first
    setPaywallActive(false);
    
    // Keep preservedMessage in state so it can be used when the paywall is closed
    // This ensures it's still available for the ChatInterface component
    setShowPaywall(false);
    
    // We don't clear preservedMessage here because we need it to be picked up
    // by the ChatInterface component after the paywall is closed
  }, []);

  // Effect to set paywall state
  useEffect(() => {
    // Set the global flag whenever showPaywall changes
    setPaywallActive(showPaywall);
    
    // Clean up on unmount
    return () => {
      if (showPaywall) {
        setPaywallActive(false);
      }
    };
  }, [showPaywall]);

  const sendMessage = useCallback(async (content: string) => {
    if (!threadId || !aiProvider.current) return null;
    if (!content.trim()) return null;

    // First, immediately dismiss any existing toasts before any checks
    dismiss();

    // Set the global flag to prevent new toasts
    setPaywallActive(true);

    // Check if user has reached message limit - do this silently to avoid toast flashes
    const count = await getUserMessageCount();
    const hasSubscription = await hasActiveSubscription();
    
    // Immediately check for limit and show paywall if needed
    if (!hasSubscription && count >= FREE_MESSAGE_LIMIT) {
      // We've hit the limit - preserve message and show paywall without error toasts
      setPreservedMessage(content);
      
      // Ensure all toasts are dismissed before showing paywall
      dismiss();
      
      // Keep the paywall active flag on
      setPaywallActive(true);
      
      // Set a tiny timeout to ensure the dismiss operation completes before showing paywall
      setTimeout(() => {
        setShowPaywall(true);
      }, 0);
      
      return null;
    }
    
    // If we reached here, we're not hitting the limit - can allow toasts again
    setPaywallActive(false);
    
    // Update the message count 
    setMessageCount(count);
    setIsSubscribed(hasSubscription);

    let optimisticUserMessage: Message | null = null;

    try {
      // Get current user
      const { data: { user }, error: userError } = await supabase.auth.getUser();
      if (userError) throw userError;
      if (!user) throw new Error('No authenticated user');

      // Create optimistic user message
      optimisticUserMessage = {
        id: `temp-${crypto.randomUUID()}`,
        content,
        thread_id: threadId,
        role: 'user',
        user_id: user.id,
        created_at: new Date().toISOString()
      };
      
      // Add optimistic message to UI
      setMessages(prev => [...prev, optimisticUserMessage!]);
      setIsGenerating(true);

      // Send user message to server
      const { data: userMessageData, error: userMessageError } = await supabase
        .from('messages')
        .insert({
          content,
          thread_id: threadId,
          role: 'user',
          user_id: user.id
        })
        .select()
        .single();

      if (userMessageError) throw userMessageError;

      // Update messages with real user message and track its ID
      if (userMessageData) {
        // Add the message ID to our tracking set
        addedMessageIds.current.add(userMessageData.id);
        
        // Replace the optimistic message with the real one, or skip if it already exists
        setMessages(prev => {
          // Check if we already have this message (not just the optimistic one)
          const alreadyExists = prev.some(msg => 
            msg.id === userMessageData.id && msg.id !== optimisticUserMessage!.id
          );
          
          if (alreadyExists) {
            // If it exists (not as the optimistic message), remove the optimistic one
            return prev.filter(msg => msg.id !== optimisticUserMessage!.id);
          }
          
          // Otherwise replace the optimistic message with the real one
          return prev.map(msg => 
            msg.id === optimisticUserMessage!.id ? userMessageData : msg
          );
        });
      }

      // Increment user message count in database and update local state
      const [newCount, newLifetimeCount] = await Promise.all([
        incrementUserMessageCount(),
        getLifetimeMessageCount()
      ]);
      setMessageCount(newCount);
      setLifetimeMessageCount(newLifetimeCount);
      
      // Increment local thread message counter
      userMessageCountRef.current++;

      // Generate AI response with conversation history
      const aiResponse = await aiProvider.current.generateResponse(content, messages);
      
      // Send AI response to server
      const { data: aiMessageData, error: aiMessageError } = await supabase
        .from('messages')
        .insert({
          content: aiResponse,
          thread_id: threadId,
          role: 'assistant',
          user_id: user.id
        })
        .select()
        .single();

      if (aiMessageError) throw aiMessageError;

      // If this is the first user message, call the onFirstMessage callback
      if (isFirstMessageRef.current && onFirstMessage) {
        onFirstMessage(content);
        isFirstMessageRef.current = false;
      }

      // Generate and update thread title after 3 user messages
      if (userMessageCountRef.current === 3 && onThreadTitleGenerated) {
        try {
          // Get all user messages for context
          const userMessages = messages
            .filter(msg => msg.role === 'user')
            .concat(optimisticUserMessage ? [optimisticUserMessage] : []);
          
          // Generate title based on all user messages
          const generatedTitle = await generateThreadTitle(userMessages);
          await onThreadTitleGenerated(generatedTitle);
          console.log(`Generated thread title after 3 messages: ${generatedTitle}`);
        } catch (error) {
          console.error('Error updating thread title:', error);
        }
      }

      // Add AI message to UI and track its ID
      if (aiMessageData) {
        // Check if this message is already in the list before adding it
        setMessages(prev => {
          // Check if message with this ID already exists
          const exists = prev.some(msg => msg.id === aiMessageData.id);
          if (exists) {
            return prev; // Don't add it again
          }
          
          // Add the message ID to our tracking set
          addedMessageIds.current.add(aiMessageData.id);
          return [...prev, aiMessageData];
        });
      }

      return userMessageData;
    } catch (error) {
      // Remove optimistic message on error
      if (optimisticUserMessage) {
        setMessages(prev => prev.filter(msg => msg.id !== optimisticUserMessage?.id));
      }
      
      console.error('Error sending message:', error);
      await logError(error, 'Send Message');
      
      // Display more specific error messages
      let errorMessage = 'Failed to send message. Please try again.';
      
      if (error instanceof Error) {
        if (error.message.includes("Network connection to AI service was lost")) {
          errorMessage = "Network connection to AI service was lost. Please try again.";
        } else if (error.message.includes("Unable to generate AI response")) {
          errorMessage = error.message;
        }
      }
      
      toast({
        title: 'Error',
        description: errorMessage,
        variant: 'destructive',
      });
      return null;
    } finally {
      setIsGenerating(false);
    }
  }, [threadId, messages, toast, onFirstMessage, checkMessageLimit, generateThreadTitle, onThreadTitleGenerated]);

  return {
    messages,
    loading,
    loadingTimeout: toastTimeoutRef.current,
    isGenerating,
    sendMessage,
    refreshMessages: loadMessages,
    showPaywall,
    handleClosePaywall,
    messageCount,
    lifetimeMessageCount,
    messageLimit: FREE_MESSAGE_LIMIT,
    isSubscribed,
    preservedMessage
  };
}