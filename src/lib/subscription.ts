import { supabase } from './supabase';
import { withTimeout, fetchWithRetry } from './auth-utils';

// Constants
export const FREE_MESSAGE_LIMIT = 10;
export const SUBSCRIPTION_PRICE_ID = 'price_1OxYZ1234567890'; // Replace with your actual Stripe price ID

// Subscription types
export type SubscriptionStatus = 'active' | 'canceled' | 'past_due' | 'trialing' | 'inactive';

export interface Subscription {
  id: string;
  userId?: string;
  status: SubscriptionStatus;
  priceId?: string;
  productId?: string;
  interval?: string;
  intervalCount?: number;
  created?: Date;
  periodEnd: Date;
  cancelAtPeriodEnd: boolean;
  trialEnd?: Date | null;
}

// Cache for message counts and subscription to avoid repeated fetches
const messageCountCache = new Map<string, { count: number, timestamp: number }>();
const CACHE_TTL = 60 * 1000; // 1 minute

// Cache for subscription data
let cachedSubscription: Subscription | null = null;

// Cache for lifetime message counts
const lifetimeMessageCountCache = new Map<string, { count: number, timestamp: number }>();

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
  let timeoutId: NodeJS.Timeout | null = null;
  let hasReturnedValue = false;

  // Create a timeout promise that resolves to 0 instead of rejecting
  const timeoutPromise = new Promise<number>((resolve) => {
    timeoutId = setTimeout(() => {
      if (!hasReturnedValue) {
        console.warn('Message count check timed out, returning 0');
        resolve(0);
      }
    }, 8000); // 8 second timeout (increased from 5 seconds)
  });

  try {
    // If no userId provided, get the current user
    if (!userId) {
      const { data: { user } } = await supabase.auth.getUser();
      userId = user?.id;
      
      if (!userId) {
        console.warn('No user ID available for getting message count');
        hasReturnedValue = true;
        if (timeoutId) clearTimeout(timeoutId);
        return 0;
      }
    }
    
    console.log(`Getting message count for user: ${userId}`);
    
    // Check cache first
    const cached = messageCountCache.get(userId);
    if (cached && Date.now() - cached.timestamp < CACHE_TTL) {
      console.log(`Using cached message count for user ${userId}: ${cached.count}`);
      hasReturnedValue = true;
      if (timeoutId) clearTimeout(timeoutId);
      return cached.count;
    }
    
    // Try to use the RPC function first (more efficient)
    try {
      console.log(`Calling get_user_message_count RPC for user ${userId}`);
      // Always pass the user_id parameter to avoid ambiguity with overloaded functions
      const result = await Promise.race([
        supabase.rpc('get_user_message_count', { user_id: userId }),
        timeoutPromise
      ]);
      
      // If result is a number, it came from the timeout promise
      if (typeof result === 'number') {
        hasReturnedValue = true;
        return result;
      }
      
      const count = result.data;
      const rpcError = result.error;
      
      if (!rpcError && typeof count === 'number') {
        console.log(`RPC returned message count for user ${userId}: ${count}`);
        // Cache the result
        messageCountCache.set(userId, {
          count,
          timestamp: Date.now()
        });
        
        hasReturnedValue = true;
        if (timeoutId) clearTimeout(timeoutId);
        return count;
      }
      
      if (rpcError) {
        console.error(`RPC error for get_user_message_count: ${rpcError.message}`, rpcError);
        handleDatabaseError(rpcError, 'getUserMessageCount (RPC)');
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
    
    // Also increment the lifetime message count
    try {
      const { data: lifetimeCount, error: lifetimeError } = await supabase.rpc('increment_lifetime_message_count', { user_id: userId });
      
      if (lifetimeError) {
        console.error(`Error incrementing lifetime message count: ${lifetimeError.message}`, lifetimeError);
        handleDatabaseError(lifetimeError, 'incrementLifetimeMessageCount');
      } else {
        console.log(`Incremented lifetime message count to: ${lifetimeCount}`);
        
        // Update lifetime count cache
        lifetimeMessageCountCache.set(userId, {
          count: lifetimeCount || 0,
          timestamp: Date.now()
        });
      }
    } catch (lifetimeErr) {
      console.error(`Exception incrementing lifetime message count: ${lifetimeErr}`);
      handleDatabaseError(lifetimeErr, 'incrementLifetimeMessageCount');
    }
    
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
 * Get the user's subscription
 */
export async function getUserSubscription(
  userId: string | undefined,
  forceRefresh: boolean = false
): Promise<Subscription | null> {
  if (!userId) {
    console.log('No userId provided for subscription check');
    return null;
  }

  // If we have a cached subscription and we're not forcing a refresh, return it
  if (cachedSubscription && !forceRefresh) {
    return cachedSubscription;
  }

  try {
    const apiKey = supabase.supabaseKey;
    const baseUrl = supabase.supabaseUrl;
    
    // Create timeout with ability to cancel
    let timeoutId: NodeJS.Timeout | null = null;
    const timeoutPromise = new Promise<null>((resolve) => {
      timeoutId = setTimeout(() => {
        console.warn('Subscription check timed out, returning null');
        resolve(null);
      }, 5000);
    });
    
    // Function to cancel the timeout
    const cancelTimeout = () => {
      if (timeoutId) {
        clearTimeout(timeoutId);
        timeoutId = null;
      }
    };

    // Try direct API request first to avoid 406 errors
    try {
      console.log(`Fetching subscription for user ${userId}`);
      const endpoint = `${baseUrl}/rest/v1/user_subscriptions?user_id=eq.${userId}&select=*`;
      
      // Use a variable to track if we received a successful response
      let receivedResponse = false;
      
      const fetchPromise = fetchWithRetry(
        endpoint,
        {
          method: 'GET',
          headers: {
            'apikey': apiKey,
            'Authorization': `Bearer ${apiKey}`,
            'Content-Type': 'application/json',
            'Accept': 'application/json',
            'Prefer': 'return=representation'
          },
        },
        2
      );
      
      const response = await Promise.race([fetchPromise, timeoutPromise]);

      if (response === null) {
        console.warn('Direct API subscription fetch timed out');
      } else {
        // We got a response, so cancel the timeout
        receivedResponse = true;
        cancelTimeout();
        
        if (response.ok) {
          const subscriptions = await response.json();
          console.log(`Received ${subscriptions.length} subscriptions via direct API`);
          
          if (subscriptions && subscriptions.length > 0) {
            const subscription = subscriptions[0];
            cachedSubscription = mapDatabaseSubscription(subscription);
            return cachedSubscription;
          }
        } else {
          console.warn(`Direct API subscription fetch failed with status ${response.status}`);
        }
      }
    } catch (apiError) {
      console.warn('Direct API subscription fetch failed, falling back to Supabase client', apiError);
    }

    // Cancel any remaining timeout before starting the next request
    cancelTimeout();
    
    // Fallback to Supabase client
    console.log('Using Supabase client as fallback for subscription check');
    
    // Create a new promise that will be resolved with the query result
    const queryPromise = new Promise(async (resolve) => {
      try {
        const { data, error } = await supabase
          .from('user_subscriptions')
          .select('*')
          .eq('user_id', userId)
          .single();
          
        if (error) {
          console.error('Error fetching user subscription:', error);
          handleDatabaseError(error, 'getUserSubscription');
          resolve(null);
        } else if (!data) {
          console.log('No subscription found for user');
          resolve(null);
        } else {
          resolve(data);
        }
      } catch (err) {
        console.error('Unexpected error in Supabase query:', err);
        resolve(null);
      }
    });
    
    // Recreate timeout for Supabase client fallback
    let fallbackTimeoutId: NodeJS.Timeout | null = null;
    const fallbackTimeoutPromise = new Promise<null>((resolve) => {
      fallbackTimeoutId = setTimeout(() => {
        console.warn('Supabase fallback subscription check timed out');
        resolve(null);
      }, 5000);
    });
    
    // Function to cancel the fallback timeout
    const cancelFallbackTimeout = () => {
      if (fallbackTimeoutId) {
        clearTimeout(fallbackTimeoutId);
        fallbackTimeoutId = null;
      }
    };
    
    // Use Promise.race to handle timeout for the fallback
    const result = await Promise.race([queryPromise, fallbackTimeoutPromise]);
    
    // Always cancel the timeout to prevent it from resolving after we've already handled the result
    cancelFallbackTimeout();

    if (!result) {
      console.warn('Subscription query returned null (timed out or no subscription)');
      return null;
    }
    
    cachedSubscription = mapDatabaseSubscription(result);
    return cachedSubscription;
  } catch (error) {
    console.error('Unexpected error in getUserSubscription:', error);
    return null;
  }
}

/**
 * Helper function to map database subscription to our Subscription type
 */
function mapDatabaseSubscription(data: any): Subscription {
  return {
    id: data.id,
    userId: data.user_id,
    status: data.status,
    priceId: data.price_id,
    productId: data.product_id,
    interval: data.interval,
    intervalCount: data.interval_count,
    created: data.created_at ? new Date(data.created_at) : undefined,
    periodEnd: new Date(data.current_period_end),
    cancelAtPeriodEnd: data.cancel_at_period_end,
    trialEnd: data.trial_end ? new Date(data.trial_end) : null,
  };
}

/**
 * Clear the cached subscription data
 */
export function clearCachedSubscription(): void {
  cachedSubscription = null;
  console.log('Subscription cache cleared');
}

/**
 * Check if the user has an active subscription
 */
export async function hasActiveSubscription(userId?: string): Promise<boolean> {
  try {
    // If no userId provided, get the current user
    if (!userId) {
      const { data: { user } } = await supabase.auth.getUser();
      userId = user?.id;
      
      if (!userId) {
        console.warn('No userId provided for active subscription check');
        return false;
      }
    }
    
    console.log(`Checking if user has active subscription for ${userId}`);
    const subscription = await getUserSubscription(userId);
    
    if (!subscription) {
      console.log(`No subscription found for user ${userId}, user is on free tier`);
      return false;
    }
    
    // Check if the subscription status is active or trialing
    const activeStatuses = ['active', 'trialing'];
    const isActive = activeStatuses.includes(subscription.status);
    
    console.log(`Subscription for user ${userId} has status: ${subscription.status}, isActive: ${isActive}`);
    
    // Check if the subscription is set to cancel at period end
    if (subscription.cancelAtPeriodEnd) {
      const periodEndDate = new Date(subscription.periodEnd);
      const now = new Date();
      const isStillActive = periodEndDate > now;
      
      console.log(`Subscription is set to cancel at period end (${periodEndDate.toISOString()}). Currently ${isStillActive ? 'still active' : 'inactive'}`);
      
      return isActive && isStillActive;
    }
    
    return isActive;
  } catch (error) {
    console.error('Error checking subscription status:', error);
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

/**
 * Gets the lifetime message count for a user
 */
export async function getLifetimeMessageCount(userId?: string): Promise<number> {
  try {
    // If no userId provided, get the current user
    if (!userId) {
      const { data: { user } } = await supabase.auth.getUser();
      userId = user?.id;
      
      if (!userId) {
        console.warn('No user ID available for getting lifetime message count');
        return 0;
      }
    }
    
    // Check cache first
    const cached = lifetimeMessageCountCache.get(userId);
    if (cached && Date.now() - cached.timestamp < CACHE_TTL) {
      return cached.count;
    }
    
    // Try to use the RPC function first (more efficient)
    try {
      const { data: count, error: rpcError } = await supabase.rpc('get_lifetime_message_count', { user_id: userId });
      
      if (!rpcError && typeof count === 'number') {
        // Cache the result
        lifetimeMessageCountCache.set(userId, {
          count,
          timestamp: Date.now()
        });
        
        return count;
      }
      
      if (rpcError) {
        handleDatabaseError(rpcError, 'getLifetimeMessageCount (RPC)');
      }
    } catch (rpcErr) {
      handleDatabaseError(rpcErr, 'getLifetimeMessageCount (RPC)');
    }
    
    // Fallback: Get count directly from profiles table
    try {
      const { data: profileData, error: profileError } = await supabase
        .from('profiles')
        .select('lifetime_message_count')
        .eq('id', userId)
        .single();
      
      if (profileError) {
        handleDatabaseError(profileError, 'getLifetimeMessageCount (profiles)');
        return 0;
      }
      
      const count = profileData.lifetime_message_count || 0;
      
      // Cache the result
      lifetimeMessageCountCache.set(userId, {
        count,
        timestamp: Date.now()
      });
      
      return count;
    } catch (countErr) {
      handleDatabaseError(countErr, 'getLifetimeMessageCount (profiles)');
    }
    
    return 0;
  } catch (err) {
    console.error('Failed to get lifetime message count:', err);
    return 0;
  }
}

/**
 * Get the user's sign up date
 */
export async function getUserSignUpDate(userId?: string): Promise<Date | null> {
  try {
    // If no userId provided, get the current user
    if (!userId) {
      const { data: { user } } = await supabase.auth.getUser();
      userId = user?.id;
      
      if (!userId) {
        console.warn('No user ID available for getting sign up date');
        return null;
      }
    }
    
    // Query the users table for created_at
    const { data, error } = await supabase
      .from('users')
      .select('created_at')
      .eq('id', userId)
      .single();
    
    if (error) {
      console.error('Error fetching user sign up date:', error);
      return null;
    }
    
    if (data?.created_at) {
      return new Date(data.created_at);
    }
    
    // Fallback to auth.users if not found in public.users
    const { data: authData, error: authError } = await supabase.auth.admin.getUserById(userId);
    
    if (authError || !authData?.user) {
      console.error('Error fetching user from auth:', authError);
      return null;
    }
    
    if (authData.user.created_at) {
      return new Date(authData.user.created_at);
    }
    
    return null;
  } catch (err) {
    console.error('Failed to get user sign up date:', err);
    return null;
  }
} 