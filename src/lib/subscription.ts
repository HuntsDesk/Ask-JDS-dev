import { supabase } from './supabase';
import { withTimeout } from './auth-utils';

// Constants
export const FREE_MESSAGE_LIMIT = 10;
export const SUBSCRIPTION_PRICE_ID = 'price_1OxYZ1234567890'; // Replace with your actual Stripe price ID

// Subscription types
export type SubscriptionStatus = 'active' | 'canceled' | 'past_due' | 'trialing' | 'inactive';

export interface Subscription {
  id: string;
  status: SubscriptionStatus;
  current_period_end: string;
  cancel_at_period_end: boolean;
}

// Cache for message counts to avoid repeated fetches
const messageCountCache = new Map<string, { count: number, timestamp: number }>();
const CACHE_TTL = 60 * 1000; // 1 minute

// Flag to track if we've already logged database errors
let hasLoggedDatabaseErrors = false;

/**
 * Helper function to check if a database error is due to missing tables
 */
function isMissingTableError(error: any): boolean {
  return (
    error?.code === '42P01' || // PostgreSQL "relation does not exist"
    error?.message?.includes('does not exist') ||
    error?.details?.includes('does not exist')
  );
}

/**
 * Handle database errors gracefully
 */
function handleDatabaseError(error: any, context: string): void {
  if (isMissingTableError(error)) {
    if (!hasLoggedDatabaseErrors) {
      console.warn(`Database tables for subscription system not set up yet. ${context} will return default values.`);
      hasLoggedDatabaseErrors = true;
    }
  } else {
    console.error(`Error in ${context}:`, error);
  }
}

/**
 * Get the current user's message count for the current period
 */
export async function getUserMessageCount(userId?: string): Promise<number> {
  // Create a timeout promise that resolves to 0 instead of rejecting
  const timeoutPromise = new Promise<number>((resolve) => {
    setTimeout(() => {
      console.warn('Message count check timed out, returning 0');
      resolve(0);
    }, 8000); // 8 second timeout (increased from 5 seconds)
  });

  try {
    // If no userId provided, get the current user
    if (!userId) {
      const { data: { user } } = await supabase.auth.getUser();
      userId = user?.id;
      
      if (!userId) {
        console.warn('No user ID available for getting message count');
        return 0;
      }
    }
    
    console.log(`Getting message count for user: ${userId}`);
    
    // Check cache first
    const cached = messageCountCache.get(userId);
    if (cached && Date.now() - cached.timestamp < CACHE_TTL) {
      console.log(`Using cached message count for user ${userId}: ${cached.count}`);
      return cached.count;
    }
    
    // Try to use the RPC function first (more efficient)
    try {
      console.log(`Calling get_user_message_count RPC for user ${userId}`);
      // Always pass the user_id parameter to avoid ambiguity with overloaded functions
      let count;
      try {
        const result = await Promise.race([
          supabase.rpc('get_user_message_count', { user_id: userId }),
          timeoutPromise
        ]);
        
        // If result is a number, it came from the timeout promise
        if (typeof result === 'number') {
          return result;
        }
        
        count = result.data;
        const rpcError = result.error;
        
        if (!rpcError && typeof count === 'number') {
          console.log(`RPC returned message count for user ${userId}: ${count}`);
          // Cache the result
          messageCountCache.set(userId, {
            count,
            timestamp: Date.now()
          });
          
          return count;
        }
        
        if (rpcError) {
          console.error(`RPC error for get_user_message_count: ${rpcError.message}`, rpcError);
          handleDatabaseError(rpcError, 'getUserMessageCount (RPC)');
        }
      } catch (timeoutErr) {
        console.error('Message count RPC check error:', timeoutErr);
        return 0;
      }
    } catch (rpcErr) {
      console.error(`Exception in get_user_message_count RPC: ${rpcErr}`);
      handleDatabaseError(rpcErr, 'getUserMessageCount (RPC)');
    }
    
    // Fallback: Count messages directly
    console.log(`Falling back to direct count for user ${userId}`);
    const now = new Date();
    const firstDayOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
    const lastDayOfMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0);
    
    try {
      let messageCount;
      try {
        const result = await Promise.race([
          supabase
            .from('messages')
            .select('*', { count: 'exact', head: true })
            .eq('user_id', userId)
            .eq('role', 'user')
            .gte('created_at', firstDayOfMonth.toISOString())
            .lte('created_at', lastDayOfMonth.toISOString()),
          timeoutPromise
        ]);
        
        // If result is a number, it came from the timeout promise
        if (typeof result === 'number') {
          return result;
        }
        
        messageCount = result.count;
        const error = result.error;
        
        if (error) {
          console.error(`Error in direct count: ${error.message}`);
          handleDatabaseError(error, 'getUserMessageCount (direct count)');
          return 0;
        }
      } catch (timeoutErr) {
        console.error('Message count direct check error:', timeoutErr);
        return 0;
      }
      
      // Cache the result
      const finalCount = messageCount || 0;
      console.log(`Direct count returned message count for user ${userId}: ${finalCount}`);
      messageCountCache.set(userId, {
        count: finalCount,
        timestamp: Date.now()
      });
      
      return finalCount;
    } catch (countErr) {
      console.error(`Exception in direct count: ${countErr}`);
      handleDatabaseError(countErr, 'getUserMessageCount (direct count)');
      return 0;
    }
  } catch (err) {
    console.error('Failed to get user message count:', err);
    return 0;
  }
}

/**
 * Increment the user's message count
 */
export async function incrementUserMessageCount(userId?: string): Promise<number> {
  try {
    // If no userId provided, get the current user
    if (!userId) {
      const { data: { user } } = await supabase.auth.getUser();
      userId = user?.id;
      
      if (!userId) {
        console.warn('No user ID available for incrementing message count');
        return 0;
      }
    }
    
    console.log(`Incrementing message count for user: ${userId}`);
    
    // Try to use the RPC function first (more efficient and handles race conditions)
    try {
      console.log(`Calling increment_user_message_count RPC for user ${userId}`);
      // Always pass the user_id parameter to avoid ambiguity with overloaded functions
      const { data: newCount, error: rpcError } = await supabase.rpc('increment_user_message_count', { user_id: userId });
      
      if (!rpcError && typeof newCount === 'number') {
        console.log(`RPC returned new message count for user ${userId}: ${newCount}`);
        // Update cache
        messageCountCache.set(userId, {
          count: newCount,
          timestamp: Date.now()
        });
        
        return newCount;
      }
      
      if (rpcError) {
        console.error(`RPC error for increment_user_message_count: ${rpcError.message}`, rpcError);
        handleDatabaseError(rpcError, 'incrementUserMessageCount (RPC)');
      }
    } catch (rpcErr) {
      console.error(`Exception in increment_user_message_count RPC: ${rpcErr}`);
      handleDatabaseError(rpcErr, 'incrementUserMessageCount (RPC)');
    }
    
    // Fallback: Get current count and increment
    const currentCount = await getUserMessageCount(userId);
    const updatedCount = currentCount + 1;
    
    // Update cache immediately for optimistic UI
    messageCountCache.set(userId, {
      count: updatedCount,
      timestamp: Date.now()
    });
    
    // Try to update the database, but don't fail if tables don't exist
    try {
      // Update or insert the message count record
      const now = new Date();
      const firstDayOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
      const lastDayOfMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0);
      
      // Check if a record exists for this period
      const { data: existingRecord, error: fetchError } = await supabase
        .from('message_counts')
        .select('*')
        .eq('user_id', userId)
        .gte('period_start', firstDayOfMonth.toISOString())
        .lte('period_end', lastDayOfMonth.toISOString())
        .single();
      
      if (fetchError && fetchError.code !== 'PGRST116') { // PGRST116 = not found
        handleDatabaseError(fetchError, 'incrementUserMessageCount (fetch)');
        return updatedCount;
      }
      
      if (existingRecord) {
        // Update existing record
        const { error: updateError } = await supabase
          .from('message_counts')
          .update({
            count: updatedCount,
            updated_at: new Date().toISOString()
          })
          .eq('id', existingRecord.id);
        
        if (updateError) {
          handleDatabaseError(updateError, 'incrementUserMessageCount (update)');
        }
      } else {
        // Create new record
        const { error: insertError } = await supabase
          .from('message_counts')
          .insert({
            user_id: userId,
            count: 1,
            period_start: firstDayOfMonth.toISOString(),
            period_end: lastDayOfMonth.toISOString()
          });
        
        if (insertError) {
          handleDatabaseError(insertError, 'incrementUserMessageCount (insert)');
        }
      }
    } catch (dbErr) {
      handleDatabaseError(dbErr, 'incrementUserMessageCount (database operations)');
    }
    
    return updatedCount;
  } catch (err) {
    console.error('Failed to increment user message count:', err);
    return 0;
  }
}

/**
 * Check if the user has reached their free message limit
 */
export async function hasReachedFreeMessageLimit(userId?: string): Promise<boolean> {
  try {
    // First check if user has an active subscription
    const hasSubscription = await hasActiveSubscription(userId);
    if (hasSubscription) {
      return false; // Subscribed users have unlimited messages
    }
    
    // Check message count for free users
    const messageCount = await getUserMessageCount(userId);
    return messageCount >= FREE_MESSAGE_LIMIT;
  } catch (err) {
    console.error('Failed to check if user reached message limit:', err);
    return false; // Default to not showing paywall on error
  }
}

/**
 * Get the user's current subscription
 */
export async function getUserSubscription(userId?: string): Promise<Subscription | null> {
  // Create a timeout promise that resolves to null instead of rejecting
  const timeoutPromise = new Promise<null>((resolve) => {
    setTimeout(() => {
      console.warn('Subscription check timed out, returning null');
      resolve(null);
    }, 8000); // 8 second timeout (increased from 5 seconds)
  });

  try {
    // If no userId provided, get the current user
    if (!userId) {
      const { data: { user } } = await supabase.auth.getUser();
      userId = user?.id;
      
      if (!userId) {
        console.warn('No user ID available for getting subscription');
        return null;
      }
    }
    
    console.log(`Getting subscription for user: ${userId}`);
    
    // Check if user is admin, admins have unlimited access
    try {
      let session;
      try {
        const result = await Promise.race([
          supabase.auth.getSession(),
          timeoutPromise
        ]);
        
        // If result is null, it came from the timeout promise
        if (result === null) {
          console.warn('Session check timed out during subscription check');
          // Continue to check subscription in database
        } else {
          session = result.data.session;
        }
      } catch (timeoutErr) {
        console.error('Session check error during subscription check:', timeoutErr);
        // Continue to check subscription in database
      }
      
      if (session?.user?.user_metadata?.is_admin === true) {
        console.log('User is admin, returning admin subscription');
        return {
          id: 'admin',
          status: 'active',
          current_period_end: '9999-12-31T23:59:59Z',
          cancel_at_period_end: false
        };
      }
    } catch (sessionErr) {
      console.error('Error checking admin status:', sessionErr);
      // Continue to check subscription in database
    }
    
    // Get the most recent active subscription
    try {
      let data;
      let error;
      
      try {
        const result = await Promise.race([
          supabase
            .from('user_subscriptions')
            .select('*')
            .eq('user_id', userId)
            .in('status', ['active', 'trialing'])
            .order('created_at', { ascending: false })
            .limit(1)
            .single(),
          timeoutPromise
        ]);
        
        // If result is null, it came from the timeout promise
        if (result === null) {
          console.warn('Subscription database check timed out');
          return null;
        }
        
        data = result.data;
        error = result.error;
      } catch (timeoutErr) {
        console.error('Subscription database check error:', timeoutErr);
        return null;
      }
      
      if (error) {
        if (error.code === 'PGRST116') { // No subscription found
          console.log(`No subscription found for user ${userId}`);
          return null;
        }
        handleDatabaseError(error, 'getUserSubscription');
        return null;
      }
      
      console.log(`Found subscription for user ${userId}:`, data);
      return {
        id: data.id,
        status: data.status,
        current_period_end: data.current_period_end,
        cancel_at_period_end: data.cancel_at_period_end
      };
    } catch (dbErr) {
      console.error('Database error in getUserSubscription:', dbErr);
      handleDatabaseError(dbErr, 'getUserSubscription');
      return null;
    }
  } catch (err) {
    console.error('Failed to get user subscription:', err);
    return null;
  }
}

/**
 * Check if the user has an active subscription
 */
export async function hasActiveSubscription(userId?: string): Promise<boolean> {
  try {
    const subscription = await getUserSubscription(userId);
    return subscription !== null && subscription.status === 'active';
  } catch (err) {
    console.error('Failed to check active subscription:', err);
    return false;
  }
}

/**
 * Create a Stripe checkout session
 */
export async function createCheckoutSession(userId?: string): Promise<string | null> {
  try {
    // If no userId provided, get the current user
    if (!userId) {
      const { data: { user } } = await supabase.auth.getUser();
      userId = user?.id;
      
      if (!userId) {
        console.warn('No user ID available for creating checkout session');
        return null;
      }
    }
    
    try {
      const { data, error } = await supabase.functions.invoke('create-checkout-session', {
        body: { 
          priceId: SUBSCRIPTION_PRICE_ID,
          userId 
        }
      });
      
      if (error) {
        console.error('Error creating checkout session:', error);
        return null;
      }
      
      return data.url;
    } catch (invokeErr) {
      console.error('Failed to invoke create-checkout-session function:', invokeErr);
      return null;
    }
  } catch (err) {
    console.error('Failed to create checkout session:', err);
    return null;
  }
}

/**
 * Create a Stripe customer portal session
 */
export async function createCustomerPortalSession(userId?: string): Promise<string | null> {
  try {
    // If no userId provided, get the current user
    if (!userId) {
      const { data: { user } } = await supabase.auth.getUser();
      userId = user?.id;
      
      if (!userId) {
        console.warn('No user ID available for creating customer portal session');
        return null;
      }
    }
    
    try {
      const { data, error } = await supabase.functions.invoke('create-customer-portal-session', {
        body: { userId }
      });
      
      if (error) {
        console.error('Error creating customer portal session:', error);
        return null;
      }
      
      return data.url;
    } catch (invokeErr) {
      console.error('Failed to invoke create-customer-portal-session function:', invokeErr);
      return null;
    }
  } catch (err) {
    console.error('Failed to create customer portal session:', err);
    return null;
  }
} 