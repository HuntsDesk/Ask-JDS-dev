import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { useToast } from '@/hooks/use-toast';
import { Loader2, Save } from 'lucide-react';
import { getSystemPromptHistory, updateSystemPrompt } from '@/lib/system-prompt';

export function SystemPrompt() {
  const [prompt, setPrompt] = useState('');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    loadPrompt();
  }, []);

  async function loadPrompt() {
    try {
      const history = await getSystemPromptHistory();
      const activePrompt = history.find(p => p.is_active);
      if (activePrompt) {
        setPrompt(activePrompt.content);
      }
    } catch (error) {
      toast({
        title: 'Error',
        description: 'Failed to load system prompt',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  }

  async function handleSave() {
    if (!prompt.trim()) return;

    setSaving(true);
    try {
      await updateSystemPrompt(prompt);
      toast({
        title: 'Success',
        description: 'System prompt updated successfully',
      });
    } catch (error) {
      toast({
        title: 'Error',
        description: 'Failed to update system prompt',
        variant: 'destructive',
      });
    } finally {
      setSaving(false);
    }
  }

  if (loading) {
    return (
      <Card>
        <CardContent className="pt-6">
          <div className="flex items-center justify-center">
            <Loader2 className="h-6 w-6 animate-spin" />
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>System Prompt</CardTitle>
        <CardDescription>
          This prompt defines how the AI assistant behaves and formats its responses.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <Textarea
          value={prompt}
          onChange={(e) => setPrompt(e.target.value)}
          className="min-h-[300px] font-mono text-sm"
          placeholder="Enter system prompt..."
          disabled={saving}
        />
        <Button 
          onClick={handleSave} 
          disabled={saving || !prompt.trim()}
          className="w-full"
        >
          {saving ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              Saving...
            </>
          ) : (
            <>
              <Save className="mr-2 h-4 w-4" />
              Save Changes
            </>
          )}
        </Button>
      </CardContent>
    </Card>
  );
}