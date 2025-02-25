import { supabase } from './supabase';

export async function getSystemPromptHistory() {
  const { data, error } = await supabase
    .from('system_prompts')
    .select('*')
    .order('created_at', { ascending: false });

  if (error) throw error;
  return data;
}

export async function updateSystemPrompt(content: string) {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error('No authenticated user');

  const { data, error } = await supabase
    .from('system_prompts')
    .insert({
      content,
      created_by: user.id
    })
    .select()
    .single();

  if (error) throw error;
  return data;
}

export async function getSystemPrompt(): Promise<string> {
  const { data, error } = await supabase
    .from('system_prompts')
    .select('content')
    .order('created_at', { ascending: false })
    .limit(1)
    .single();

  if (error) {
    console.warn('Error fetching system prompt:', error);
    return 'You are a helpful AI assistant.';
  }

  return data.content;
} 