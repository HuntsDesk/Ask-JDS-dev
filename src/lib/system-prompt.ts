import { supabase } from './supabase';

let cachedSystemPrompt: string | null = null;

const DEFAULT_SYSTEM_PROMPT = `You are a legal study assistant, helping law students understand complex legal concepts and prepare for exams.`;

export async function getSystemPrompt(): Promise<string> {
  if (cachedSystemPrompt) return cachedSystemPrompt;
  
  try {
    const { data, error } = await supabase
      .from('system_prompts')
      .select('content')
      .eq('is_active', true)
      .single();

    if (error) {
      cachedSystemPrompt = DEFAULT_SYSTEM_PROMPT;
      return DEFAULT_SYSTEM_PROMPT;
    }

    const prompt = data?.content || DEFAULT_SYSTEM_PROMPT;
    cachedSystemPrompt = prompt;
    return prompt;
  } catch (error) {
    cachedSystemPrompt = DEFAULT_SYSTEM_PROMPT;
    return DEFAULT_SYSTEM_PROMPT;
  }
} 