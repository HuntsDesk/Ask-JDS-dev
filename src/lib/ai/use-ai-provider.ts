import { useEffect, useRef, useState } from 'react';
import { supabase } from '../supabase';
import type { AIProvider } from './provider';
import { OpenAIProvider } from './openai-provider';
import { GeminiProvider } from './gemini-provider';

export function useAIProvider() {
  const providerRef = useRef<AIProvider | null>(null);
  const [settingsVersion, setSettingsVersion] = useState(0);

  useEffect(() => {
    async function initProvider() {
      try {
        // Get active settings
        const { data: settings, error } = await supabase
          .from('ai_settings')
          .select('*')
          .eq('is_active', true)
          .single();

        if (error) throw error;

        console.log('🔧 Initializing AI Provider with settings:', settings);

        // Initialize the appropriate provider
        switch (settings.provider) {
          case 'openai':
            providerRef.current = new OpenAIProvider(settings);
            break;
          case 'google':
            providerRef.current = new GeminiProvider(settings);
            break;
          case 'anthropic':
            throw new Error('Anthropic provider not yet implemented');
          default:
            throw new Error(`Unknown provider: ${settings.provider}`);
        }
      } catch (error) {
        console.error('Failed to initialize AI provider:', error);
      }
    }

    initProvider();

    // Subscribe to changes in the ai_settings table
    const subscription = supabase
      .channel('ai_settings_changes')
      .on('postgres_changes', { 
        event: '*', 
        schema: 'public', 
        table: 'ai_settings' 
      }, () => {
        console.log('AI settings changed, reinitializing provider');
        setSettingsVersion(prev => prev + 1);
      })
      .subscribe();

    return () => {
      subscription.unsubscribe();
    };
  }, [settingsVersion]);

  return providerRef;
}