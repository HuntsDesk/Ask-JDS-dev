import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';
import type { Thread, Message } from '@/types';
import { useAuth } from '@/lib/auth';

// Query keys for better cache management
export const threadKeys = {
  all: ['threads'] as const,
  thread: (id: string) => [...threadKeys.all, id] as const,
  messages: (threadId: string) => [...threadKeys.thread(threadId), 'messages'] as const,
};

// Hook to fetch all threads
export function useThreads() {
  const { user } = useAuth();
  const userId = user?.id;
  
  return useQuery(
    threadKeys.all,
    async () => {
      if (!userId) return [];
      
      const { data, error } = await supabase
        .from('threads')
        .select('*')
        .eq('user_id', userId)
        .order('created_at', { ascending: false });
      
      if (error) throw error;
      return data as Thread[];
    },
    {
      // Only fetch if we have a user
      enabled: !!userId,
      // Keep the previous data when refetching
      keepPreviousData: true,
      // Cache for 2 minutes
      staleTime: 2 * 60 * 1000,
    }
  );
}

// Hook to fetch a specific thread with its messages
export function useThread(id: string | null) {
  return useQuery(
    threadKeys.thread(id || 'null'),
    async () => {
      if (!id) return null;
      
      const { data, error } = await supabase
        .from('threads')
        .select('*')
        .eq('id', id)
        .single();
      
      if (error) throw error;
      return data as Thread;
    },
    {
      // Don't fetch if no ID is provided
      enabled: !!id,
      // Keep the previous data when refetching
      keepPreviousData: true,
    }
  );
}

// Hook to fetch messages for a thread
export function useMessages(threadId: string | null) {
  return useQuery(
    threadKeys.messages(threadId || 'null'),
    async () => {
      if (!threadId) return [];
      
      const { data, error } = await supabase
        .from('messages')
        .select('*')
        .eq('thread_id', threadId)
        .order('created_at', { ascending: true });
      
      if (error) throw error;
      return data as Message[];
    },
    {
      // Don't fetch if no thread ID is provided
      enabled: !!threadId,
      // Refetch messages periodically 
      refetchInterval: 10000, // Every 10 seconds
      // Keep the previous data when refetching
      keepPreviousData: true,
    }
  );
}

// Mutation to create a new thread
export function useCreateThread() {
  const queryClient = useQueryClient();
  const { user } = useAuth();
  
  return useMutation(
    async (title: string) => {
      if (!user) throw new Error('User not authenticated');
      
      const { data, error } = await supabase
        .from('threads')
        .insert([
          { 
            title, 
            user_id: user.id 
          }
        ])
        .select()
        .single();
      
      if (error) throw error;
      return data as Thread;
    },
    {
      // When mutation succeeds, update the threads list
      onSuccess: (newThread) => {
        // Get the current threads from the cache
        const previousThreads = queryClient.getQueryData<Thread[]>(threadKeys.all) || [];
        
        // Update the cache with the new thread
        queryClient.setQueryData(threadKeys.all, [newThread, ...previousThreads]);
      },
    }
  );
}

// Mutation to add a new message to a thread
export function useAddMessage() {
  const queryClient = useQueryClient();
  
  return useMutation(
    async ({ threadId, content, role }: { threadId: string; content: string; role: 'user' | 'assistant' }) => {
      const { data, error } = await supabase
        .from('messages')
        .insert([
          { 
            thread_id: threadId, 
            content,
            role
          }
        ])
        .select()
        .single();
      
      if (error) throw error;
      return data as Message;
    },
    {
      // When mutation succeeds, update the messages list
      onSuccess: (newMessage) => {
        // Get the current messages from the cache
        const previousMessages = queryClient.getQueryData<Message[]>(
          threadKeys.messages(newMessage.thread_id)
        ) || [];
        
        // Update the cache with the new message
        queryClient.setQueryData(
          threadKeys.messages(newMessage.thread_id), 
          [...previousMessages, newMessage]
        );
      },
    }
  );
} 