import { createClient } from '@supabase/supabase-js';
import type { Database } from '@/types/supabase';
import { supabase } from './supabase'; // Import the main client

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error('Missing required environment variables: VITE_SUPABASE_URL and/or VITE_SUPABASE_ANON_KEY');
}

// Create a Supabase client with the anon key for regular operations
export const adminClient = createClient<Database>(supabaseUrl, supabaseAnonKey, {
  auth: {
    autoRefreshToken: true,
    persistSession: true
  }
});

// Rate limiting
const rateLimits = new Map<string, { count: number; timestamp: number }>();
const RATE_LIMIT_WINDOW = 60000; // 1 minute
const MAX_REQUESTS = 100;

function checkRateLimit(userId: string): boolean {
  const now = Date.now();
  const userLimit = rateLimits.get(userId);

  if (!userLimit || (now - userLimit.timestamp) > RATE_LIMIT_WINDOW) {
    rateLimits.set(userId, { count: 1, timestamp: now });
    return true;
  }

  if (userLimit.count >= MAX_REQUESTS) {
    return false;
  }

  userLimit.count++;
  return true;
}

// Helper function to check if the current user is an admin
async function isCurrentUserAdmin(): Promise<boolean> {
  try {
    // Try to use the secure RPC function
    const { data, error } = await supabase.rpc('is_admin');
    
    if (!error && data !== null) {
      return data;
    }
    
    if (error) {
      console.error('Error checking admin status with RPC:', error);
      
      // Fall back to checking the user's metadata
      const { data: { session } } = await supabase.auth.getSession();
      return session?.user?.user_metadata?.is_admin === true;
    }
    
    return false;
  } catch (err) {
    console.error('Failed to check admin status:', err);
    return false;
  }
}

// Admin helper functions with rate limiting and input validation
export async function getAllUsers() {
  try {
    const { data: { session } } = await supabase.auth.getSession(); // Use main client
    if (!session?.user) {
      throw new Error('No authenticated user found');
    }
    
    // Check if the user is an admin
    const isAdmin = await isCurrentUserAdmin();
    if (!isAdmin) {
      throw new Error('Admin privileges required');
    }
    
    console.log('Current user:', session.user);
    
    if (!checkRateLimit(session.user.id)) {
      throw new Error('Rate limit exceeded. Please try again later.');
    }

    const { data, error } = await adminClient.rpc('get_all_users');
    
    if (error) {
      console.error('Error fetching users:', error, error.message, error.details);
      throw error;
    }
    
    return data;
  } catch (err) {
    console.error('getAllUsers error:', err);
    throw err;
  }
}

export async function setUserAsAdmin(userId: string) {
  if (!userId || typeof userId !== 'string') {
    throw new Error('Invalid user ID');
  }

  const { data: { session } } = await supabase.auth.getSession(); // Use main client
  
  if (!session?.user) {
    throw new Error('No authenticated user found');
  }
  
  // Check if the user is an admin
  const isAdmin = await isCurrentUserAdmin();
  if (!isAdmin) {
    throw new Error('Admin privileges required');
  }
  
  if (!checkRateLimit(session.user.id)) {
    throw new Error('Rate limit exceeded. Please try again later.');
  }

  const { error } = await adminClient.rpc('upgrade_to_admin', { user_id: userId });
  
  if (error) {
    console.error('Error setting user as admin:', error);
    throw error;
  }
}

export async function removeUserAdmin(userId: string) {
  if (!userId || typeof userId !== 'string') {
    throw new Error('Invalid user ID');
  }

  const { data: { session } } = await supabase.auth.getSession(); // Use main client
  
  if (!session?.user) {
    throw new Error('No authenticated user found');
  }
  
  // Check if the user is an admin
  const isAdmin = await isCurrentUserAdmin();
  if (!isAdmin) {
    throw new Error('Admin privileges required');
  }
  
  if (!checkRateLimit(session.user.id)) {
    throw new Error('Rate limit exceeded. Please try again later.');
  }

  const { error } = await adminClient.rpc('revoke_admin', { user_id: userId });
  
  if (error) {
    console.error('Error removing user admin:', error);
    throw error;
  }
}

export async function getErrorLogs() {
  try {
    const { data: { session } } = await supabase.auth.getSession(); // Use main client
    if (!session?.user) {
      throw new Error('No authenticated user found');
    }
    
    // Check if the user is an admin
    const isAdmin = await isCurrentUserAdmin();
    if (!isAdmin) {
      throw new Error('Admin privileges required');
    }
    
    console.log('Current user:', session.user);
    
    if (!checkRateLimit(session.user.id)) {
      throw new Error('Rate limit exceeded. Please try again later.');
    }

    const { data, error } = await adminClient.rpc('get_error_logs');
    
    if (error) {
      console.error('Error fetching error logs:', error, error.message, error.details);
      throw error;
    }
    
    return data;
  } catch (err) {
    console.error('getErrorLogs error:', err);
    throw err;
  }
}

export async function markErrorAsInvestigated(errorId: string) {
  if (!errorId || typeof errorId !== 'string') {
    throw new Error('Invalid error ID');
  }

  const { data: { session } } = await supabase.auth.getSession(); // Use main client
  
  if (!session?.user) {
    throw new Error('No authenticated user found');
  }
  
  // Check if the user is an admin
  const isAdmin = await isCurrentUserAdmin();
  if (!isAdmin) {
    throw new Error('Admin privileges required');
  }
  
  if (!checkRateLimit(session.user.id)) {
    throw new Error('Rate limit exceeded. Please try again later.');
  }

  const { error } = await adminClient.rpc('mark_error_investigated', { error_id: errorId });

  if (error) {
    console.error('Error marking error as investigated:', error);
    throw error;
  }
}