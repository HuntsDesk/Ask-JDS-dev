import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import type { AISettings } from '@/types/ai';

const DEFAULT_SETTINGS: AISettings = {
  id: 'default',
  model: 'gpt-4',
  provider: 'openai',
  is_active: true,
  created_at: new Date().toISOString(),
  created_by: null
};

export function useSettings() {
  const [settings, setSettings] = useState<AISettings>(DEFAULT_SETTINGS);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function loadSettings() {
      try {
        const { data, error } = await supabase
          .from('ai_settings')
          .select('*')
          .eq('is_active', true)
          .single();

        if (error) {
          console.warn('Error loading AI settings:', error);
          return; // Keep using default settings
        }

        if (data) {
          setSettings(data);
        }
      } catch (error) {
        console.error('Error loading AI settings:', error);
      } finally {
        setLoading(false);
      }
    }

    loadSettings();
  }, []);

  return { settings, loading };
} 