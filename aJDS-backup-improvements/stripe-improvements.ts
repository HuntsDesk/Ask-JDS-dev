import { supabase } from './supabase';
import type { User } from '@/types';

export type EntitlementFeature = 'ai_standard' | 'ai_premium' | 'flashcards';
export type EntitlementStatus = 'active' | 'inactive';

export interface Entitlement {
  feature: EntitlementFeature;
  status: EntitlementStatus;
}

// Default entitlements for admin users
const ADMIN_DEFAULT_ENTITLEMENTS: Entitlement[] = [
  { feature: 'ai_standard', status: 'active' },
  { feature: 'ai_premium', status: 'active' },
  { feature: 'flashcards', status: 'active' }
];

// Cache for entitlements to avoid repeated fetches
const entitlementsCache = new Map<string, { entitlements: Entitlement[], timestamp: number }>();
const CACHE_TTL = 5 * 60 * 1000; // 5 minutes

/**
 * Get user entitlements with caching
 */
export async function getUserEntitlements(userId?: string): Promise<Entitlement[]> {
  try {
    // If no userId provided, get the current user
    if (!userId) {
      const { data: { user } } = await supabase.auth.getUser();
      userId = user?.id;
      
      if (!userId) {
        console.warn('No user ID available for getting entitlements');
        return [];
      }
    }
    
    console.log('Getting entitlements for user', userId);
    
    // Check if user is admin, return default admin entitlements
    const { data: { session } } = await supabase.auth.getSession();
    if (session?.user?.user_metadata?.is_admin === true) {
      console.log('User is admin, returning default admin entitlements');
      return ADMIN_DEFAULT_ENTITLEMENTS;
    }
    
    // Check cache first
    const cached = entitlementsCache.get(userId);
    if (cached && Date.now() - cached.timestamp < CACHE_TTL) {
      console.log('Using cached entitlements for user', userId);
      return cached.entitlements;
    }
    
    // Fetch from database
    const { data, error } = await supabase
      .from('user_entitlements')
      .select('*')
      .eq('user_id', userId);
    
    if (error) {
      console.error('Error fetching entitlements:', error);
      return [];
    }
    
    // Transform to Entitlement objects
    const entitlements: Entitlement[] = data.map(item => ({
      feature: item.feature as EntitlementFeature,
      status: item.status as EntitlementStatus
    }));
    
    // Cache the result
    entitlementsCache.set(userId, {
      entitlements,
      timestamp: Date.now()
    });
    
    return entitlements;
  } catch (err) {
    console.error('Failed to get user entitlements:', err);
    return [];
  }
}

/**
 * Check if a user has a specific entitlement
 */
export function hasEntitlement(
  entitlements: Entitlement[] | undefined,
  feature: EntitlementFeature
): boolean {
  if (!entitlements || entitlements.length === 0) {
    return false;
  }
  
  return entitlements.some(e => e.feature === feature && e.status === 'active');
}

/**
 * Create a Stripe checkout session
 */
export async function createCheckoutSession(priceId: string, userId: string): Promise<string | null> {
  try {
    const { data, error } = await supabase.functions.invoke('create-checkout-session', {
      body: { priceId, userId }
    });
    
    if (error) {
      console.error('Error creating checkout session:', error);
      return null;
    }
    
    return data.url;
  } catch (err) {
    console.error('Failed to create checkout session:', err);
    return null;
  }
} 