import { OpenAIProvider } from './openai-provider';
import { GeminiProvider } from './gemini-provider';
import type { AISettings, AIProvider } from '@/types/ai';
import { supabase } from '../supabase';

let currentProvider: AIProvider | null = null;
let currentSettings: AISettings | null = null;

export async function getAIProvider(): Promise<AIProvider> {
  if (!currentSettings) {
    // Fetch active settings
    const { data, error } = await supabase
      .from('ai_settings')
      .select('*')
      .eq('is_active', true)
      .single();
      
    if (error) throw error;
    if (!data) throw new Error('No active AI settings found');
    currentSettings = data;
  }

  if (!currentProvider || !currentSettings) {
    if (!currentSettings) throw new Error('No AI settings available');
    
    switch (currentSettings.provider) {
      case 'openai':
        currentProvider = new OpenAIProvider(currentSettings);
        break;
      case 'gemini':
        currentProvider = new GeminiProvider(currentSettings);
        break;
      default:
        throw new Error(`Unsupported AI provider: ${currentSettings.provider}`);
    }
  }

  if (!currentProvider) throw new Error('Failed to initialize AI provider');
  return currentProvider;
}

// Subscribe to settings changes
supabase
  .channel('ai_settings_changes')
  .on(
    'postgres_changes',
    {
      event: '*',
      schema: 'public',
      table: 'ai_settings',
      filter: 'is_active=eq.true'
    },
    (payload) => {
      currentSettings = payload.new as AISettings;
      currentProvider = null; // Force provider recreation
    }
  )
  .subscribe(); 