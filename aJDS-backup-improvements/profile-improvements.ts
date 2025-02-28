// Key improvements for user profile functionality

import { supabase } from './supabase';
import { withTimeout } from './auth-utils';

export interface UserProfile {
  id: string;
  user_id: string;
  display_name: string | null;
  avatar_url: string | null;
  bio: string | null;
  preferences: Record<string, any> | null;
  created_at: string;
  updated_at: string;
}

// Cache for profiles to avoid repeated fetches
const profileCache = new Map<string, { profile: UserProfile | null, timestamp: number }>();
const CACHE_TTL = 5 * 60 * 1000; // 5 minutes

/**
 * Get a user's profile with caching
 */
export async function getUserProfile(userId: string): Promise<UserProfile | null> {
  try {
    // Check cache first
    const cached = profileCache.get(userId);
    if (cached && Date.now() - cached.timestamp < CACHE_TTL) {
      console.log('Using cached profile for user', userId);
      return cached.profile;
    }
    
    // Fetch from database with timeout
    const { data, error } = await withTimeout(
      supabase
        .from('profiles')
        .select('*')
        .eq('user_id', userId)
        .single(),
      5000,
      'Get user profile timed out'
    );
    
    if (error) {
      console.error('Error fetching user profile:', error);
      
      // If profile doesn't exist, create it
      if (error.code === 'PGRST116') {
        return await createUserProfile(userId);
      }
      
      return null;
    }
    
    // Cache the result
    profileCache.set(userId, {
      profile: data,
      timestamp: Date.now()
    });
    
    return data;
  } catch (err) {
    console.error('Failed to get user profile:', err);
    return null;
  }
}

/**
 * Create a new user profile
 */
export async function createUserProfile(userId: string): Promise<UserProfile | null> {
  try {
    // Get user data for initial profile
    const { data: userData, error: userError } = await supabase.auth.getUser();
    
    if (userError || !userData.user) {
      console.error('Error getting user data for profile creation:', userError);
      return null;
    }
    
    const newProfile = {
      user_id: userId,
      display_name: userData.user.email?.split('@')[0] || null,
      avatar_url: null,
      bio: null,
      preferences: {
        theme: 'light',
        notifications: true
      }
    };
    
    const { data, error } = await supabase
      .from('profiles')
      .insert(newProfile)
      .select()
      .single();
    
    if (error) {
      console.error('Error creating user profile:', error);
      return null;
    }
    
    // Cache the new profile
    profileCache.set(userId, {
      profile: data,
      timestamp: Date.now()
    });
    
    return data;
  } catch (err) {
    console.error('Failed to create user profile:', err);
    return null;
  }
}

/**
 * Update a user's profile
 */
export async function updateUserProfile(
  userId: string,
  updates: Partial<UserProfile>
): Promise<UserProfile | null> {
  try {
    const { data, error } = await supabase
      .from('profiles')
      .update(updates)
      .eq('user_id', userId)
      .select()
      .single();
    
    if (error) {
      console.error('Error updating user profile:', error);
      return null;
    }
    
    // Update cache
    profileCache.set(userId, {
      profile: data,
      timestamp: Date.now()
    });
    
    return data;
  } catch (err) {
    console.error('Failed to update user profile:', err);
    return null;
  }
}

/**
 * Clear the profile cache for a user
 */
export function clearProfileCache(userId?: string): void {
  if (userId) {
    profileCache.delete(userId);
  } else {
    profileCache.clear();
  }
} 