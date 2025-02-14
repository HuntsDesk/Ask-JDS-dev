import { createClient } from '@supabase/supabase-js';
import type { Database } from '@/types/supabase';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error('Missing required environment variables: VITE_SUPABASE_URL and/or VITE_SUPABASE_ANON_KEY');
}

// Create a Supabase client with the anon key for regular operations
export const adminClient = createClient<Database>(supabaseUrl, supabaseAnonKey, {
  auth: {
    autoRefreshToken: true,
    persistSession: false
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

// Admin helper functions with rate limiting and input validation
export async function setUserAsAdmin(userId: string) {
  if (!userId || typeof userId !== 'string') {
    throw new Error('Invalid user ID');
  }

  if (!checkRateLimit(userId)) {
    throw new Error('Rate limit exceeded. Please try again later.');
  }

  const { error } = await adminClient
    .from('users')
    .update({ is_admin: true })
    .eq('id', userId);

  if (error) throw error;
}

export async function removeUserAdmin(userId: string) {
  if (!userId || typeof userId !== 'string') {
    throw new Error('Invalid user ID');
  }

  if (!checkRateLimit(userId)) {
    throw new Error('Rate limit exceeded. Please try again later.');
  }

  const { error } = await adminClient
    .from('users')
    .update({ is_admin: false })
    .eq('id', userId);

  if (error) throw error;
}

export async function getAllUsers() {
  const { data: { user } } = await adminClient.auth.getUser();
  
  if (!user || !checkRateLimit(user.id)) {
    throw new Error('Rate limit exceeded. Please try again later.');
  }

  const { data, error } = await adminClient
    .from('users')
    .select('*')
    .order('created_at', { ascending: false });

  if (error) throw error;
  return data;
}

export async function getErrorLogs() {
  const { data: { user } } = await adminClient.auth.getUser();
  
  if (!user || !checkRateLimit(user.id)) {
    throw new Error('Rate limit exceeded. Please try again later.');
  }

  const { data, error } = await adminClient
    .from('error_logs')
    .select('*')
    .order('created_at', { ascending: false });

  if (error) throw error;
  return data;
}

export async function markErrorAsInvestigated(errorId: string) {
  if (!errorId || typeof errorId !== 'string') {
    throw new Error('Invalid error ID');
  }

  const { data: { user } } = await adminClient.auth.getUser();
  
  if (!user || !checkRateLimit(user.id)) {
    throw new Error('Rate limit exceeded. Please try again later.');
  }

  const { error } = await adminClient
    .from('error_logs')
    .update({ investigated: true })
    .eq('id', errorId);

  if (error) throw error;
}