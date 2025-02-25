import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import type { AISettings } from '@/types/ai';
import { Button } from '@/components/ui/button';
import { toast } from '@/hooks/use-toast';

// Move AI_MODELS to where it's used or remove if not needed
export function AISettingsForm() {
  const [settings, setSettings] = useState<AISettings[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadSettings();
  }, []);

  async function loadSettings() {
    const { data, error } = await supabase
      .from('ai_settings')
      .select('*')
      .order('created_at', { ascending: false });

    if (error) {
      toast({
        title: 'Error',
        description: 'Failed to load AI settings',
        variant: 'destructive'
      });
      return;
    }

    console.log('Current AI Settings:', data);
    setSettings(data);
    setLoading(false);
  }

  async function updateSetting(id: string) {
    const { error } = await supabase
      .from('ai_settings')
      .update({ is_active: true })
      .eq('id', id);

    if (error) {
      toast({
        title: 'Error',
        description: 'Failed to update AI settings',
        variant: 'destructive'
      });
      return;
    }

    loadSettings();
    toast({
      title: 'Success',
      description: 'AI settings updated'
    });
  }

  return (
    <div className="space-y-4">
      <h2 className="text-lg font-semibold">AI Engine Settings</h2>
      
      {loading ? (
        <div>Loading...</div>
      ) : (
        <div className="space-y-4">
          {settings.map(setting => (
            <div key={setting.id} className="flex items-center justify-between p-4 border rounded-lg">
              <div>
                <div className="font-medium">{setting.provider}</div>
                <div className="text-sm text-muted-foreground">{setting.model}</div>
              </div>
              <Button 
                onClick={() => updateSetting(setting.id)}
                variant={setting.is_active ? "default" : "outline"}
              >
                {setting.is_active ? "Active" : "Activate"}
              </Button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
} 