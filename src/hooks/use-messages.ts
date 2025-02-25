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

    try {
      const { data, error } = await supabase
        .from('messages')
        .select('*')
        .eq('thread_id', threadId)
        .order('created_at', { ascending: true });

      if (error) {
        throw error;
      }
      
      if (!data) {
        setMessages([]);
        return;
      }

      setMessages(data);

      // Safely handle first message callback
      if (data.length > 0 && onFirstMessage && isFirstMessageRef.current) {
        const firstUserMessage = data.find(m => !m.is_bot);
        if (firstUserMessage) {
          onFirstMessage(firstUserMessage.content);
          isFirstMessageRef.current = false;
        }
      }
    } catch (error) {
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
  }, [threadId, loadMessages]);

  // Subscribe to real-time updates
  useEffect(() => {
    if (!threadId) return;
    
    const subscription = supabase
      .channel(`messages:${threadId}`)
      .on('postgres_changes', {
        event: '*',
        schema: 'public',
        table: 'messages',
        filter: `thread_id=eq.${threadId}`
      }, () => {
        loadMessages();  // Reload messages when we get an update
      })
      .subscribe();

    return () => {
      subscription.unsubscribe();
    };
  }, [threadId, loadMessages]);

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
        created_at: new Date().toISOString(),
        is_bot: false
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

      // Use aiMessageData
      if (aiMessageData) {
        setMessages(prev => [...prev, aiMessageData]);
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