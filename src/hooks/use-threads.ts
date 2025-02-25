import { useState, useEffect } from 'react';
import { useAuth } from '@/lib/auth';
import { supabase } from '@/lib/supabase';
import type { Thread } from '@/types';

export function useThreads() {
  const { user } = useAuth();
  const [threads, setThreads] = useState<Thread[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) {
      setThreads([]);
      setLoading(false);
      return;
    }

    const fetchThreads = async () => {
      try {
        const { data, error } = await supabase
          .from('threads')
          .select('*')
          .eq('user_id', user.id)
          .order('created_at', { ascending: false });

        if (error) throw error;
        setThreads(data || []);
      } catch (error) {
        console.error('Error fetching threads:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchThreads();

    const threadsSubscription = supabase
      .channel('threads')
      .on('postgres_changes', {
        event: '*',
        schema: 'public',
        table: 'threads',
        filter: `user_id=eq.${user.id}`
      }, (payload) => {
        if (payload.eventType === 'INSERT') {
          setThreads(prev => [payload.new as Thread, ...prev]);
        } else if (payload.eventType === 'DELETE') {
          setThreads(prev => prev.filter(thread => thread.id !== payload.old.id));
        } else if (payload.eventType === 'UPDATE') {
          setThreads(prev => prev.map(thread => 
            thread.id === payload.new.id ? payload.new as Thread : thread
          ));
        }
      })
      .subscribe();

    return () => {
      threadsSubscription.unsubscribe();
    };
  }, [user]);

  const createThread = async () => {
    if (!user) return null;

    try {
      const { data, error } = await supabase
        .from('threads')
        .insert([{ 
          user_id: user.id,
          title: 'New Conversation'
        }])
        .select()
        .single();

      if (error) throw error;
      return data;
    } catch (error) {
      console.error('Error creating thread:', error);
      return null;
    }
  };

  const updateThread = async (id: string, updates: Partial<Thread>) => {
    if (!user) return false;

    try {
      const { error } = await supabase
        .from('threads')
        .update(updates)
        .eq('id', id)
        .eq('user_id', user.id);

      if (error) throw error;
      return true;
    } catch (error) {
      console.error('Error updating thread:', error);
      return false;
    }
  };

  const deleteThread = async (id: string) => {
    if (!user) return false;

    try {
      // Optimistically update the UI immediately
      setThreads(prev => prev.filter(thread => thread.id !== id));
      
      // Then perform the actual deletion on the server
      const { error } = await supabase
        .from('threads')
        .delete()
        .eq('id', id)
        .eq('user_id', user.id);

      if (error) {
        // If there's an error, revert the optimistic update
        const { data } = await supabase
          .from('threads')
          .select('*')
          .eq('user_id', user.id)
          .order('created_at', { ascending: false });
          
        setThreads(data || []);
        throw error;
      }
      
      return true;
    } catch (error) {
      console.error('Error deleting thread:', error);
      return false;
    }
  };

  return {
    threads,
    loading,
    createThread,
    updateThread,
    deleteThread
  };
}