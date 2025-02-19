import { useState, useEffect, useCallback, useRef } from 'react';
import { supabase } from '@/lib/supabase';
import type { Message } from '@/types';
import { useToast } from './use-toast';
import { logError } from '@/lib/supabase';
import { createAIProvider } from '@/lib/ai/provider-factory';
import { useSettings } from './use-settings';

export function useMessages(threadId: string | null, onFirstMessage?: (message: string) => void) {
  const { settings } = useSettings();
  const aiProvider = useRef<AIProvider | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [loading, setLoading] = useState(true);
  const [isGenerating, setIsGenerating] = useState(false);
  const { toast } = useToast();
  const loadAttemptRef = useRef(0);
  const messageMapRef = useRef<Map<string, Message>>(new Map());
  const isFirstMessageRef = useRef(true);

  // Initialize AI provider when settings change
  useEffect(() => {
    if (settings) {
      aiProvider.current = createAIProvider(settings);
    }
  }, [settings]);

  const loadMessages = useCallback(async (retryCount = 0) => {
    if (!threadId) {
      setMessages([]);
      setLoading(false);
      return;
    }

    setLoading(true);
    const currentAttempt = ++loadAttemptRef.current;

    try {
      console.log(`[Attempt ${retryCount + 1}] Loading messages for thread:`, threadId);

      const { data, error } = await supabase
        .from('messages')
        .select('*')
        .eq('thread_id', threadId)
        .order('created_at', { ascending: true });

      if (error) throw error;

      if (currentAttempt === loadAttemptRef.current) {
        console.log(`Loaded ${data?.length || 0} messages`);
        if (data) {
          messageMapRef.current.clear();
          data.forEach(msg => messageMapRef.current.set(msg.id, msg));
          setMessages(data);
        }
      } else {
        console.log('Skipping stale load attempt');
      }
    } catch (err) {
      console.error('Error loading messages:', err);
      const error = err instanceof Error ? err : new Error('Failed to load messages');

      if (currentAttempt === loadAttemptRef.current && retryCount < 2) {
        console.log(`Retrying load (attempt ${retryCount + 2}/3)...`);
        await new Promise(resolve => setTimeout(resolve, 1000 * (retryCount + 1)));
        return loadMessages(retryCount + 1);
      }

      await logError(error, 'Load Messages');
      toast({
        title: 'Error',
        description: 'Failed to load messages. Please try again.',
        variant: 'destructive',
      });
    } finally {
      if (currentAttempt === loadAttemptRef.current) {
        setLoading(false);
      }
    }
  }, [threadId, toast]);

  // Load messages when thread changes
  useEffect(() => {
    loadMessages();
  }, [threadId, loadMessages]);

  // Subscribe to real-time updates
  useEffect(() => {
    if (!threadId) return;

    console.log('Setting up real-time subscription for thread:', threadId);
    const channel = supabase.channel(`messages:${threadId}`);
    
    const subscription = channel
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'messages',
          filter: `thread_id=eq.${threadId}`
        },
        (payload) => {
          console.log('Received message update:', payload);
          
          if (payload.eventType === 'INSERT') {
            const newMessage = payload.new as Message;
            if (!messageMapRef.current.has(newMessage.id)) {
              messageMapRef.current.set(newMessage.id, newMessage);
              setMessages(prev => {
                // Check if message already exists to prevent duplicates
                if (prev.some(msg => msg.id === newMessage.id)) {
                  return prev;
                }
                return [...prev, newMessage];
              });
            }
          } else if (payload.eventType === 'DELETE') {
            messageMapRef.current.delete(payload.old.id);
            setMessages(prev => prev.filter(msg => msg.id !== payload.old.id));
          }
        }
      )
      .subscribe((status) => {
        console.log('Subscription status:', status);
      });

    return () => {
      console.log('Cleaning up subscription for thread:', threadId);
      channel.unsubscribe();
    };
  }, [threadId]);

  const sendMessage = useCallback(async (content: string) => {
    if (!threadId || !aiProvider.current) return;

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

      // Update messages with real user message
      if (userMessageData) {
        setMessages(prev => 
          prev.map(msg => msg.id === optimisticUserMessage!.id ? userMessageData : msg)
        );
      }

      // Generate AI response with conversation history using the provider
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

      return userMessageData;
    } catch (error) {
      // Remove optimistic message on error
      if (optimisticUserMessage) {
        setMessages(prev => prev.filter(msg => msg.id !== optimisticUserMessage?.id));
      }
      
      console.error('Error sending message:', error);
      await logError(error, 'Send Message');
      toast({
        title: 'Error',
        description: 'Failed to send message. Please try again.',
        variant: 'destructive',
      });
      throw error;
    } finally {
      setIsGenerating(false);
    }
  }, [threadId, messages, toast, onFirstMessage, isFirstMessageRef]);

  // Reset isFirstMessageRef when threadId changes
  useEffect(() => {
    isFirstMessageRef.current = true;
  }, [threadId]);

  return {
    messages,
    loading,
    isGenerating,
    loadMessages,
    sendMessage
  };
}