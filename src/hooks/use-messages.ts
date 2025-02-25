import { useState, useEffect, useCallback, useRef } from 'react';
import { supabase } from '@/lib/supabase';
import type { Message } from '@/types';
import { useToast } from './use-toast';
import { logError } from '@/lib/supabase';
import { createAIProvider } from '@/lib/ai/provider-factory';
import { useSettings } from './use-settings';
import type { AIProvider } from '@/types/ai';

export function useMessages(threadId: string | null, onFirstMessage?: (message: string) => void) {
  const { settings } = useSettings();
  const aiProvider = useRef<AIProvider | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [loading, setLoading] = useState(true);
  const [isGenerating, setIsGenerating] = useState(false);
  const { toast } = useToast();
  const isFirstMessageRef = useRef(true);
  const { user } = supabase.auth.getUser();
  // Add a ref to track message IDs we've already added
  const addedMessageIds = useRef(new Set<string>());

  // Initialize AI provider when settings change
  useEffect(() => {
    if (settings) {
      aiProvider.current = createAIProvider(settings);
    }
  }, [settings]);

  const loadMessages = useCallback(async () => {
    if (!threadId) {
      setMessages([]);
      setLoading(false);
      return;
    }

    setLoading(true);
    // Clear the set of added message IDs when loading a new thread
    addedMessageIds.current.clear();

    try {
      const { data, error } = await supabase
        .from('messages')
        .select('*')
        .eq('thread_id', threadId)
        .order('created_at', { ascending: true });

      if (error) throw error;
      
      const messagesList = data || [];
      
      // Add all loaded message IDs to our tracking set
      messagesList.forEach(msg => {
        addedMessageIds.current.add(msg.id);
      });
      
      setMessages(messagesList);

      // Handle first message callback if needed
      if (messagesList.length > 0 && onFirstMessage && isFirstMessageRef.current) {
        const firstUserMessage = messagesList.find(m => m.role === 'user');
        if (firstUserMessage) {
          onFirstMessage(firstUserMessage.content);
          isFirstMessageRef.current = false;
        }
      }
    } catch (error) {
      console.error('Error loading messages:', error);
      await logError(error, 'Load Messages');
      toast({
        title: 'Error',
        description: 'Failed to load messages. Please try again.',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  }, [threadId, onFirstMessage, toast]);

  // Load messages when thread changes
  useEffect(() => {
    loadMessages();
    // Reset isFirstMessageRef when threadId changes
    isFirstMessageRef.current = true;
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

  const sendMessage = useCallback(async (content: string) => {
    if (!threadId || !aiProvider.current) return null;
    if (!content.trim()) return null;

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

      // If this is the first user message, update the thread title
      if (isFirstMessageRef.current && onFirstMessage) {
        onFirstMessage(content);
        isFirstMessageRef.current = false;
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
  }, [threadId, messages, toast, onFirstMessage]);

  return {
    messages,
    loading,
    isGenerating,
    loadMessages,
    sendMessage
  };
}