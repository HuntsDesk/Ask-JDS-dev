import { useEffect, useRef } from 'react';
import { supabase } from '../supabase';
import type { AIProvider } from './provider';
import { OpenAIProvider } from './openai-provider';
import { GoogleAIProvider } from './google-provider';

export function useAIProvider() {
  const providerRef = useRef<AIProvider | null>(null);

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
            providerRef.current = new GoogleAIProvider(settings);
            break;
          default:
            throw new Error(`Unknown provider: ${settings.provider}`);
        }
      } catch (error) {
        console.error('Failed to initialize AI provider:', error);
      }
    }

    initProvider();
  }, []);

  return providerRef;
} 