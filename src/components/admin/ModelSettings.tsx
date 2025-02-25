import { useState, useEffect, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { useToast } from '@/hooks/use-toast';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Label } from '@/components/ui/label';
import { supabase } from '@/lib/supabase';
import type { ModelData } from '@/types';

interface SupabaseUser {
  id: string;
  isAdmin?: boolean;
}

const PROVIDERS = {
  openai: {
    name: 'OpenAI',
    versions: ['gpt-4', 'gpt-3.5-turbo'],
  },
  google: {
    name: 'Google Gemini',
    versions: ['gemini-pro'],
  },
  anthropic: {
    name: 'Anthropic',
    versions: ['claude-3-sonnet'],
  }
} as const;

type Provider = keyof typeof PROVIDERS;

export function ModelSettings() {
  const [models, setModels] = useState<ModelData[]>([]);
  const [loading, setLoading] = useState(true);
  const [user, setUser] = useState<SupabaseUser | null>(null);
  const [newModel, setNewModel] = useState({
    name: '',
    provider: 'openai' as Provider,
    model_version: 'gpt-4'
  });
  const { toast } = useToast();

  const loadModels = useCallback(async () => {
    const { data, error } = await supabase
      .from('models')
      .select('*')
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Error loading models:', error);
      toast({
        title: 'Error',
        description: 'Failed to load models'
      });
      return;
    }

    setModels(data || []);
    setLoading(false);
  }, [toast]);

  useEffect(() => {
    async function init() {
      const { data: { user: currentUser } } = await supabase.auth.getUser();
      setUser(currentUser);

      // Check if user is admin using the isAdmin property from auth context
      const { data: { session } } = await supabase.auth.getSession();
      const isAdmin = session?.user?.user_metadata?.is_admin || false;
      
      if (isAdmin) {
        await loadModels();
      } else {
        setLoading(false);
      }
    }

    init();
  }, [loadModels]);

  if (loading) {
    return <div>Loading...</div>;
  }

  // Check if user is admin using the isAdmin property
  if (!user?.isAdmin) {
    return <div>Access denied. Admin privileges required.</div>;
  }

  async function handleAddModel(modelData: Partial<ModelData>) {
    console.log('Starting model creation with data:', modelData);
    try {
      const { error: insertError } = await supabase
        .from('models')
        .insert([{
          name: modelData.name,
          provider: modelData.provider,
          model_version: modelData.model_version,
          is_active: true,
          max_tokens: 4096
        }]);

      if (insertError) {
        console.error('Supabase error:', insertError);
        toast({
          title: 'Error',
          description: insertError.message
        });
        return;
      }

      toast({
        title: 'Success',
        description: 'Model added successfully'
      });
      
      await loadModels();
    } catch (error) {
      console.error('Error adding model:', error);
      toast({
        title: 'Error',
        description: 'Failed to add model'
      });
    }
  }

  async function handleToggleActive(id: string, currentActive: boolean) {
    try {
      const { error } = await supabase
        .from('models')
        .update({ is_active: !currentActive })
        .eq('id', id);

      if (error) throw error;

      toast({
        title: 'Success',
        description: 'Model status updated'
      });
      
      loadModels();
    } catch (error) {
      console.error('Error updating model:', error);
      toast({
        title: 'Error',
        description: 'Failed to update model status',
        variant: 'destructive'
      });
    }
  }

  return (
    <div className="space-y-6">
      <div className="rounded-md border p-4">
        <h2 className="text-lg font-semibold mb-4">Add New Model</h2>
        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="name">Model Name</Label>
              <Input
                id="name"
                value={newModel.name}
                onChange={(e) => {
                  console.log('Name changed:', e.target.value);
                  setNewModel({ ...newModel, name: e.target.value });
                }}
                placeholder="e.g., gpt-4"
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="provider">Provider</Label>
              <Select
                value={newModel.provider}
                onValueChange={(value) => {
                  console.log('Provider changed:', value);
                  setNewModel({ ...newModel, provider: value as Provider });
                }}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select provider" />
                </SelectTrigger>
                <SelectContent>
                  {Object.entries(PROVIDERS).map(([key, provider]) => (
                    <SelectItem key={key} value={key}>
                      {provider.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
          <div className="space-y-2">
            <Label htmlFor="model_version">Model Version</Label>
            <Input
              id="model_version"
              value={newModel.model_version}
              onChange={(e) => {
                console.log('Version changed:', e.target.value);
                setNewModel({ ...newModel, model_version: e.target.value });
              }}
              required
            />
          </div>
          <Button 
            onClick={() => {
              console.log('Button clicked, model data:', newModel);
              handleAddModel(newModel).catch(error => {
                console.error('Failed to add model:', error);
              });
            }}
          >
            Add Model
          </Button>
        </div>
      </div>

      <div className="rounded-md border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Name</TableHead>
              <TableHead>Provider</TableHead>
              <TableHead>Model Version</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {models.map((model) => (
              <TableRow key={model.id}>
                <TableCell>{model.name}</TableCell>
                <TableCell>{PROVIDERS[model.provider as Provider]?.name || model.provider}</TableCell>
                <TableCell>{model.model_version}</TableCell>
                <TableCell>{model.is_active ? 'Active' : 'Inactive'}</TableCell>
                <TableCell>
                  <Button 
                    onClick={() => handleToggleActive(model.id, model.is_active)}
                    variant={model.is_active ? "default" : "outline"}
                  >
                    {model.is_active ? "Active" : "Activate"}
                  </Button>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}