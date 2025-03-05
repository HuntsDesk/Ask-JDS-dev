import React, { useState, useEffect } from 'react';
import { useAuth } from '@/lib/auth';
import { getLifetimeMessageCount } from '@/lib/subscription';
import { LoadingSpinner } from '@/components/LoadingSpinner';
import { useToast } from '@/hooks/use-toast';
import { MessageSquare } from 'lucide-react';
import { supabase } from '@/lib/supabase';

export function UserProfileInfo() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [loading, setLoading] = useState(true);
  const [messageCount, setMessageCount] = useState<number | null>(null);
  
  // Add refresh interval to keep message count updated
  useEffect(() => {
    // Initial fetch
    fetchMessageCount();
    
    // Set up refresh interval (every 10 seconds)
    const interval = setInterval(() => {
      if (user) {
        fetchMessageCount(true); // silent refresh
      }
    }, 10000);
    
    return () => clearInterval(interval);
  }, [user, toast]);
  
  async function fetchMessageCount(silent = false) {
    if (!user) return;
    
    if (!silent) {
      setLoading(true);
    }
    
    try {
      // Always get fresh data from the server
      const count = await getLifetimeMessageCount(user.id);
      setMessageCount(count);
    } catch (error) {
      console.error('Error fetching message count:', error);
      if (!silent) {
        toast({
          title: 'Error',
          description: 'Failed to load message count. Please try again later.',
          variant: 'destructive'
        });
      }
    } finally {
      if (!silent) {
        setLoading(false);
      }
    }
  }

  if (loading) {
    return (
      <div className="flex justify-center p-4">
        <LoadingSpinner className="h-6 w-6" />
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="grid gap-4 py-4">
        <div className="flex flex-col space-y-2 sm:flex-row sm:space-y-0 sm:space-x-4">
          <div className="flex items-center space-x-2 bg-muted/50 p-3 rounded-md">
            <MessageSquare className="h-5 w-5 text-blue-500" />
            <div>
              <div className="text-sm font-medium">Messages Sent</div>
              <div className="text-2xl font-bold">{messageCount !== null ? messageCount : 'N/A'}</div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
} 