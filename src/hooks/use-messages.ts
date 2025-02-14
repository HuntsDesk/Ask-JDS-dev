import { useState, useEffect, useCallback, useRef } from 'react';
import { supabase } from '@/lib/supabase';
import { Message } from '@/types';
import { useToast } from './use-toast';
import { logError } from '@/lib/supabase';

export function useMessages(threadId: string | null, onFirstMessage?: (message: string) => void) {
  const [messages, setMessages] = useState<Message[]>([]);
  const [loading, setLoading] = useState(true);
  const { toast } = useToast();
  const loadAttemptRef = useRef(0);
  const messageMapRef = useRef<Map<string, Message>>(new Map());
  const isFirstMessageRef = useRef(true);

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
              setMessages(prev => [...prev, newMessage]);
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
    if (!threadId) return;

    try {
      // Get current user
      const { data: { user }, error: userError } = await supabase.auth.getUser();
      if (userError) throw userError;
      if (!user) throw new Error('No authenticated user');

      // Optimistically add the message to the UI
      const optimisticMessage: Message = {
        id: crypto.randomUUID(),
        content,
        thread_id: threadId,
        role: 'user',
        user_id: user.id,
        created_at: new Date().toISOString()
      };
      
      setMessages(prev => [...prev, optimisticMessage]);

      // Send to server
      const { data, error } = await supabase
        .from('messages')
        .insert({
          content,
          thread_id: threadId,
          role: 'user',
          user_id: user.id
        })
        .select()
        .single();

      if (error) throw error;

      // If this is the first user message, update the thread title
      if (isFirstMessageRef.current && onFirstMessage) {
        onFirstMessage(content);
        isFirstMessageRef.current = false;
      }

      // Replace optimistic message with real one
      if (data) {
        setMessages(prev => 
          prev.map(msg => msg.id === optimisticMessage.id ? data : msg)
        );
      }

      return data;
    } catch (error) {
      // Remove optimistic message on error
      setMessages(prev => prev.filter(msg => msg.id !== optimisticMessage?.id));
      
      console.error('Error sending message:', error);
      await logError(error, 'Send Message');
      toast({
        title: 'Error',
        description: 'Failed to send message. Please try again.',
        variant: 'destructive',
      });
      throw error;
    }
  }, [threadId, toast, onFirstMessage, isFirstMessageRef]);

  // Reset isFirstMessageRef when threadId changes
  useEffect(() => {
    isFirstMessageRef.current = true;
  }, [threadId]);

  return {
    messages,
    loading,
    loadMessages,
    sendMessage
  };
}