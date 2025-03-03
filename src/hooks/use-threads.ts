import { useState, useEffect, useRef } from 'react';
import { useAuth } from '@/lib/auth';
import { supabase } from '@/lib/supabase';
import type { Thread } from '@/types';
import { useToast } from '@/hooks/use-toast';

export function useThreads() {
  const { user } = useAuth();
  const [threads, setThreads] = useState<Thread[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);
  const { toast } = useToast();
  const initialLoadRef = useRef(true);
  const toastTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    console.log('useThreads: Initializing with user', user?.email);
    
    if (!user) {
      console.log('useThreads: No user, clearing threads');
      setThreads([]);
      setLoading(false);
      return;
    }

    let isMounted = true;
    let subscriptionActive = false;
    
    // Safety timeout to prevent getting stuck in loading state
    const safetyTimeoutId = setTimeout(() => {
      if (isMounted && loading) {
        console.warn('useThreads: Safety timeout triggered after 8 seconds');
        setLoading(false);
        setError(new Error('Loading threads timed out. Please try again.'));
        
        // Only show toast after a delay on initial load
        if (initialLoadRef.current) {
          // Clear any existing timeout
          if (toastTimeoutRef.current) {
            clearTimeout(toastTimeoutRef.current);
          }
          
          // Set a new timeout to show the toast after 2 seconds
          toastTimeoutRef.current = setTimeout(() => {
            toast({
              title: "Loading threads timeout",
              description: "We're having trouble loading your conversations. The database might be slow to respond.",
              variant: "destructive",
            });
            toastTimeoutRef.current = null;
          }, 2000);
        } else {
          toast({
            title: "Loading threads timeout",
            description: "We're having trouble loading your conversations. The database might be slow to respond.",
            variant: "destructive",
          });
        }
      }
    }, 8000); // Increased from 5000 to 8000ms (8 seconds)

    const fetchThreads = async () => {
      try {
        console.log('useThreads: Fetching threads for user', user.email);
        setLoading(true);
        
        let fetchTimeoutId: NodeJS.Timeout | null = null;
        let hasReceivedResponse = false;
        
        // Add a timeout promise to prevent hanging
        const fetchPromise = supabase
          .from('threads')
          .select('*')
          .eq('user_id', user.id)
          .order('created_at', { ascending: false });
          
        // Create a timeout promise that resolves with empty data
        const timeoutPromise = new Promise<{data: Thread[], error: null}>((resolve) => {
          fetchTimeoutId = setTimeout(() => {
            if (!hasReceivedResponse) {
              console.warn('useThreads: Database fetch timed out after 10 seconds, returning empty threads');
              resolve({data: [], error: null});
            }
          }, 10000); // 10 seconds timeout
        });
        
        // Race the fetch against the timeout
        const { data, error } = await Promise.race([fetchPromise, timeoutPromise]);
        hasReceivedResponse = true;
        if (fetchTimeoutId) clearTimeout(fetchTimeoutId);

        if (error) {
          console.error('useThreads: Error fetching threads:', error);
          console.error('Error details:', JSON.stringify(error));
          setError(error);
          
          if (isMounted) {
            // Show an error toast for a better user experience
            // Only show toast after a delay on initial load
            if (initialLoadRef.current) {
              // Clear any existing timeout
              if (toastTimeoutRef.current) {
                clearTimeout(toastTimeoutRef.current);
              }
              
              // Set a new timeout to show the toast after 2 seconds
              toastTimeoutRef.current = setTimeout(() => {
                toast({
                  title: "Error loading conversations",
                  description: "We encountered an error loading your conversations. Please try again.",
                  variant: "destructive",
                });
                toastTimeoutRef.current = null;
              }, 2000);
            } else {
              toast({
                title: "Error loading conversations",
                description: "We encountered an error loading your conversations. Please try again.",
                variant: "destructive",
              });
            }
          }
          
          setLoading(false);
          return;
        }

        if (isMounted) {
          console.log('useThreads: Fetched', data?.length ?? 0, 'threads');
          
          if (data && Array.isArray(data)) {
            setThreads(data);
            // Once we get data, clear any safety timeout we've previously set
            if (safetyTimeoutId) {
              clearTimeout(safetyTimeoutId);
            }
          } else {
            console.warn('useThreads: Received non-array data from thread fetch:', data);
            setThreads([]);
          }
          
          setLoading(false);
        }
      } catch (err) {
        console.error('useThreads: Error in fetchThreads:', err);
        if (isMounted) {
          setError(err instanceof Error ? err : new Error(String(err)));
          setLoading(false);
          
          // Show an error toast (with delay on initial load)
          if (initialLoadRef.current) {
            if (toastTimeoutRef.current) {
              clearTimeout(toastTimeoutRef.current);
            }
            
            toastTimeoutRef.current = setTimeout(() => {
              toast({
                title: "Error loading conversations",
                description: "We encountered an error loading your conversations. Please try again.",
                variant: "destructive",
              });
              toastTimeoutRef.current = null;
            }, 2000);
          } else {
            toast({
              title: "Error loading conversations",
              description: "We encountered an error loading your conversations. Please try again.",
              variant: "destructive",
            });
          }
        }
      }
    };

    fetchThreads();
    
    // After the first load, set initialLoadRef to false
    initialLoadRef.current = false;

    // Set up realtime subscription for thread changes
    const setupSubscription = async () => {
      try {
        console.log('useThreads: Setting up realtime subscription');
        
        const threadsSubscription = supabase
          .channel('threads')
          .on('postgres_changes', {
            event: '*',
            schema: 'public',
            table: 'threads',
            filter: `user_id=eq.${user.id}`
          }, (payload) => {
            console.log('useThreads: Received realtime update', payload.eventType);
            
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
          .subscribe((status) => {
            console.log('useThreads: Subscription status:', status);
            subscriptionActive = status === 'SUBSCRIBED';
          });
          
        return threadsSubscription;
      } catch (err) {
        console.error('useThreads: Error setting up subscription:', err);
        return null;
      }
    };
    
    const subscription = setupSubscription();

    return () => {
      console.log('useThreads: Cleaning up');
      isMounted = false;
      clearTimeout(safetyTimeoutId);
      
      // Clear any pending toast timeouts
      if (toastTimeoutRef.current) {
        clearTimeout(toastTimeoutRef.current);
        toastTimeoutRef.current = null;
      }
      
      // Clean up subscription
      if (subscription) {
        subscription.then(sub => {
          if (sub && subscriptionActive) {
            console.log('useThreads: Unsubscribing from realtime updates');
            sub.unsubscribe();
          }
        });
      }
    };
  }, [user, toast]);

  const createThread = async () => {
    try {
      console.log('useThreads: Creating new thread');
      
      if (!user) {
        console.error('useThreads: Cannot create thread without user');
        return null;
      }

      // Log user id for debugging
      console.log('useThreads: Creating thread for user', user.id);

      // Create a timeout promise that resolves to null
      const timeoutPromise = new Promise<null>((resolve) => {
        setTimeout(() => {
          console.warn('useThreads: Thread creation timed out after 8 seconds');
          resolve(null);
        }, 8000); // 8 second timeout
      });

      // Attempt to ensure profile exists first to address RLS issues
      try {
        console.log('useThreads: Ensuring profile exists');
        // Check if profile exists
        const profileCheck = await supabase
          .from('profiles')
          .select('id')
          .eq('id', user.id)
          .single();
          
        if (profileCheck.error) {
          console.log('useThreads: Profile not found, creating one');
          // Create a profile if it doesn't exist
          const profileResult = await supabase
            .from('profiles')
            .insert([{ id: user.id }])
            .select();
            
          console.log('useThreads: Profile creation result', profileResult);
        } else {
          console.log('useThreads: Profile exists, proceeding with thread creation');
        }
      } catch (err) {
        console.error('useThreads: Error checking/creating profile:', err);
        // Continue anyway, the trigger we created should handle this
      }

      // Create the actual thread
      const threadPromise = supabase
        .from('threads')
        .insert([
          { 
            user_id: user.id,
            title: 'New Conversation'
          }
        ])
        .select()
        .single();

      // Race the thread creation against the timeout
      const result = await Promise.race([threadPromise, timeoutPromise]);
      
      // If result is null, it means the timeout won
      if (result === null) {
        toast({
          title: "Thread creation timeout",
          description: "Creating a new conversation is taking longer than expected. Please try again.",
          variant: "destructive",
        });
        return null;
      }
      
      const { data, error } = result;

      if (error) {
        console.error('useThreads: Error creating thread:', error);
        
        // If we get an RLS error, try one more time after a delay
        if (error.message?.includes('row-level security') || error.code === '42501') {
          console.log('useThreads: Got RLS error, trying again after delay');
          toast({
            title: "Authentication sync issue",
            description: "We're fixing a sync issue. Trying again...",
            variant: "default",
          });
          
          // Wait 2 seconds and try again
          await new Promise(resolve => setTimeout(resolve, 2000));
          
          const retryResult = await supabase
            .from('threads')
            .insert([
              { 
                user_id: user.id,
                title: 'New Conversation'
              }
            ])
            .select()
            .single();
            
          if (retryResult.error) {
            console.error('useThreads: Retry also failed:', retryResult.error);
            toast({
              title: "Error creating thread",
              description: "There was a problem with permissions. Please try signing out and back in.",
              variant: "destructive",
            });
            throw retryResult.error;
          }
          
          console.log('useThreads: Retry succeeded', retryResult.data);
          return retryResult.data as Thread;
        }
        
        toast({
          title: "Error creating thread",
          description: "There was a problem creating a new conversation. Please try again.",
          variant: "destructive",
        });
        throw error;
      }

      console.log('useThreads: Thread created successfully', data);
      return data as Thread;
    } catch (error) {
      console.error('useThreads: Exception creating thread:', error);
      return null;
    }
  };

  const updateThread = async (id: string, updates: Partial<Thread>) => {
    try {
      console.log(`useThreads: Updating thread ${id}`, updates);
      
      if (!user) {
        console.error('useThreads: Cannot update thread without user');
        return false;
      }

      // Create a timeout promise that resolves to a failure result
      const timeoutPromise = new Promise<{error: Error}>((resolve) => {
        setTimeout(() => {
          console.warn(`useThreads: Thread update timed out after 6 seconds for thread ${id}`);
          resolve({error: new Error('Update timed out')});
        }, 6000); // 6 second timeout
      });

      // Update the thread
      const updatePromise = supabase
        .from('threads')
        .update(updates)
        .eq('id', id)
        .eq('user_id', user.id);

      // Race the update against the timeout
      const result = await Promise.race([updatePromise, timeoutPromise]);
      
      if ('error' in result && result.error) {
        // Check if this is our timeout error
        if (result.error instanceof Error && result.error.message === 'Update timed out') {
          console.error('useThreads: Thread update timed out');
          toast({
            title: "Thread update timeout",
            description: "Updating the conversation is taking longer than expected.",
            variant: "warning",
          });
          return false;
        }
        
        // This is a regular database error
        console.error('useThreads: Error updating thread:', result.error);
        toast({
          title: "Error updating thread",
          description: "There was a problem updating the conversation.",
          variant: "destructive",
        });
        return false;
      }

      console.log(`useThreads: Thread ${id} updated successfully`);
      return true;
    } catch (error) {
      console.error('useThreads: Exception updating thread:', error);
      return false;
    }
  };

  const deleteThread = async (id: string) => {
    try {
      console.log(`useThreads: Deleting thread ${id}`);
      
      if (!user) {
        console.error('useThreads: Cannot delete thread without user');
        return false;
      }

      // Create a timeout promise that resolves to a failure result
      const timeoutPromise = new Promise<{error: Error}>((resolve) => {
        setTimeout(() => {
          console.warn(`useThreads: Thread deletion timed out after 6 seconds for thread ${id}`);
          resolve({error: new Error('Deletion timed out')});
        }, 6000); // 6 second timeout
      });

      // Delete the thread
      const deletePromise = supabase
        .from('threads')
        .delete()
        .eq('id', id)
        .eq('user_id', user.id);

      // Race the deletion against the timeout
      const result = await Promise.race([deletePromise, timeoutPromise]);
      
      if ('error' in result && result.error) {
        // Check if this is our timeout error
        if (result.error instanceof Error && result.error.message === 'Deletion timed out') {
          console.error('useThreads: Thread deletion timed out');
          toast({
            title: "Thread deletion timeout",
            description: "Deleting the conversation is taking longer than expected.",
            variant: "warning",
          });
          // Continue with optimistic UI update despite timeout
          return true;
        }
        
        // This is a regular database error
        console.error('useThreads: Error deleting thread:', result.error);
        toast({
          title: "Error deleting thread",
          description: "There was a problem deleting the conversation.",
          variant: "destructive",
        });
        return false;
      }

      console.log(`useThreads: Thread ${id} deleted successfully`);
      return true;
    } catch (error) {
      console.error('useThreads: Exception deleting thread:', error);
      return false;
    }
  };

  return {
    threads,
    loading,
    error,
    createThread,
    updateThread,
    deleteThread
  };
}