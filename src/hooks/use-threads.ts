import { useState, useEffect, useCallback, useRef } from 'react';
import { supabase } from '@/lib/supabase';
import { useToast } from './use-toast';
import { logError } from '@/lib/supabase';
import type { Thread } from '@/types';

// Welcome message as a static constant with proper bullet points
const WELCOME_MESSAGE = `Hi! I'm your legal study buddy. I'm here to help you with:

• Understanding complex legal concepts and principles
• Analyzing case law and legal precedents
• Preparing for law school exams and the bar
• Clarifying legal terminology and definitions
• Discussing legal theories and frameworks
• Reviewing legal documents and statutes
• Exploring different areas of law

What would you like to get started with?`;

export function useThreads() {
  const [threads, setThreads] = useState<Thread[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);
  const { toast } = useToast();
  const loadAttemptRef = useRef(0);
  const threadMapRef = useRef<Map<string, Thread>>(new Map());

  const loadThreads = useCallback(async (retryCount = 0) => {
    setLoading(true);
    setError(null);
    const currentAttempt = ++loadAttemptRef.current;

    try {
      console.log(`[Attempt ${retryCount + 1}] Loading threads`);

      const { data, error } = await supabase
        .from('threads')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;
      
      // Only update state if this is still the most recent load attempt
      if (currentAttempt === loadAttemptRef.current) {
        console.log(`Loaded ${data?.length || 0} threads:`, data);
        if (data) {
          // Update thread map
          threadMapRef.current.clear();
          data.forEach(thread => threadMapRef.current.set(thread.id, thread));
          
          // Update threads state
          setThreads(data);
        }
      } else {
        console.log('Skipping stale load attempt');
      }
    } catch (err) {
      console.error('Error in loadThreads:', err);
      const error = err instanceof Error ? err : new Error('Failed to load threads');
      
      // Only retry if this is still the most recent load attempt
      if (currentAttempt === loadAttemptRef.current && retryCount < 2) {
        console.log(`Retrying load (attempt ${retryCount + 2}/3)...`);
        await new Promise(resolve => setTimeout(resolve, 1000 * (retryCount + 1)));
        return loadThreads(retryCount + 1);
      }
      
      setError(error);
      await logError(error, 'Load Threads');
      toast({
        title: 'Error',
        description: 'Failed to load chat history. Please try again.',
        variant: 'destructive',
      });
    } finally {
      if (currentAttempt === loadAttemptRef.current) {
        setLoading(false);
      }
    }
  }, [toast]);

  // Load threads when component mounts
  useEffect(() => {
    console.log('Initial threads load');
    loadThreads();
  }, [loadThreads]);

  // Subscribe to real-time updates
  useEffect(() => {
    console.log('Setting up real-time subscription for threads');
    const channel = supabase.channel('threads_channel');
    
    const subscription = channel
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'threads'
        },
        (payload) => {
          console.log('Received thread update:', payload);
          
          if (payload.eventType === 'INSERT') {
            const newThread = payload.new as Thread;
            // Only add if we don't already have this thread
            if (!threadMapRef.current.has(newThread.id)) {
              threadMapRef.current.set(newThread.id, newThread);
              setThreads(prev => [newThread, ...prev]);
            }
          } else if (payload.eventType === 'DELETE') {
            console.log('Deleting thread:', payload.old.id);
            threadMapRef.current.delete(payload.old.id);
            setThreads(prev => {
              console.log('Previous threads:', prev);
              const updated = prev.filter(thread => thread.id !== payload.old.id);
              console.log('Updated threads:', updated);
              return updated;
            });
          } else if (payload.eventType === 'UPDATE') {
            const updatedThread = payload.new as Thread;
            threadMapRef.current.set(updatedThread.id, updatedThread);
            setThreads(prev => prev.map(thread => 
              thread.id === updatedThread.id ? updatedThread : thread
            ));
          }
        }
      )
      .subscribe((status) => {
        console.log('Subscription status:', status);
      });

    return () => {
      console.log('Cleaning up thread subscription');
      channel.unsubscribe();
    };
  }, []);

  const createThread = useCallback(async () => {
    try {
      // Get current user
      const { data: { user }, error: userError } = await supabase.auth.getUser();
      if (userError) throw userError;
      if (!user) throw new Error('No authenticated user');

      // Create thread with temporary title
      const { data: thread, error: threadError } = await supabase
        .from('threads')
        .insert({ title: 'New Chat', user_id: user.id })
        .select()
        .single();

      if (threadError) throw threadError;

      // Add welcome message
      if (thread) {
        const { error: messageError } = await supabase
          .from('messages')
          .insert([{
            content: WELCOME_MESSAGE,
            role: 'assistant',
            thread_id: thread.id,
            user_id: user.id
          }]);

        if (messageError) {
          console.error('Error adding welcome message:', messageError);
          await logError(messageError, 'Create Welcome Message');
        }
      }

      return thread;
    } catch (error) {
      console.error('Error creating thread:', error);
      await logError(error, 'Create Thread');
      toast({
        title: 'Error',
        description: 'Failed to create new chat. Please try again.',
        variant: 'destructive',
      });
      throw error;
    }
  }, [toast]);

  const updateThread = useCallback(async (id: string, title: string) => {
    try {
      const { error } = await supabase
        .from('threads')
        .update({ title })
        .eq('id', id);

      if (error) throw error;
    } catch (error) {
      console.error('Error updating thread:', error);
      await logError(error, 'Update Thread');
      toast({
        title: 'Error',
        description: 'Failed to update chat title. Please try again.',
        variant: 'destructive',
      });
      throw error;
    }
  }, [toast]);

  const updateThreadTitle = useCallback(async (threadId: string, firstMessage: string) => {
    try {
      // Generate title from first message (truncate if too long)
      const title = firstMessage.length > 50 
        ? firstMessage.substring(0, 47) + '...'
        : firstMessage;

      const { error } = await supabase
        .from('threads')
        .update({ title })
        .eq('id', threadId);

      if (error) throw error;
    } catch (error) {
      console.error('Error updating thread title:', error);
      await logError(error, 'Update Thread Title');
      // Don't show toast for title update failure as it's not critical
    }
  }, []);

  const deleteThread = useCallback(async (id: string) => {
    try {
      console.log('Deleting thread:', id);
      const { error } = await supabase
        .from('threads')
        .delete()
        .eq('id', id);

      if (error) throw error;
      console.log('Thread deleted successfully');
    } catch (error) {
      console.error('Error deleting thread:', error);
      await logError(error, 'Delete Thread');
      toast({
        title: 'Error',
        description: 'Failed to delete chat. Please try again.',
        variant: 'destructive',
      });
      throw error;
    }
  }, [toast]);

  return {
    threads,
    loading,
    error,
    loadThreads,
    createThread,
    updateThread,
    deleteThread,
    updateThreadTitle
  };
}