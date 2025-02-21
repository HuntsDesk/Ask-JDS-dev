import { useState, useEffect } from 'react';
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
import { Switch } from "@/components/ui/switch";

interface Model {
  id: string;
  name: string;
  is_active: boolean;
  max_tokens: number;
  model_version: string;
  provider: string;
  created_at: string;
  updated_at: string;
}

const PROVIDERS = {
  openai: {
    name: 'OpenAI',
    versions: ['gpt-4', 'gpt-3.5-turbo'],
    envKey: 'VITE_OPENAI_API_KEY'
  },
  gemini: {
    name: 'Google Gemini',
    versions: ['gemini-pro'],
    envKey: 'VITE_GEMINI_API_KEY'
  },
  anthropic: {
    name: 'Anthropic',
    versions: ['claude-3-sonnet'],
    envKey: 'VITE_ANTHROPIC_API_KEY'
  }
};

export function ModelSettings() {
  const [models, setModels] = useState<Model[]>([]);
  const [loading, setLoading] = useState(true);
  const [user, setUser] = useState<any>(null);
  const [newModel, setNewModel] = useState({
    name: '',
    provider: 'openai' as 'openai' | 'gemini' | 'anthropic',
    model_version: 'gpt-4o'
  });
  const { toast } = useToast();

  // Define loadModels function
  async function loadModels() {
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
  }

  useEffect(() => {
    async function checkAuthAndLoadModels() {
      const { data: { user: currentUser } } = await supabase.auth.getUser();
      console.log('Current user:', currentUser);
      setUser(currentUser);

      if (!currentUser?.user_metadata?.is_admin) {
        setLoading(false);
        return;
      }

      await loadModels();
    }

    checkAuthAndLoadModels();
  }, [toast]);

  // Move the admin check here, after loading is complete
  if (loading) {
    return <div>Loading...</div>;
  }

  if (!user?.user_metadata?.is_admin) {
    return <div>Access denied. Admin privileges required.</div>;
  }

  async function handleAddModel(modelData: Partial<Model>) {
    console.log('Starting model creation with data:', modelData);
    try {
      const { data, error } = await supabase
        .from('models')
        .insert([{
          name: modelData.name,
          provider: modelData.provider,
          model_version: modelData.model_version,
          is_active: true,
          max_tokens: 4096
        }])
        .select();

      if (error) {
        console.error('Supabase error:', error);
        toast({
          title: 'Error',
          description: error.message
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
      <Button 
        onClick={async () => {
          const { data: { session } } = await supabase.auth.getSession();
          console.log('Current session:', session);
          
          // Test a simple select
          const { data, error } = await supabase
            .from('models')
            .select('id')
            .limit(1);
          
          console.log('Test request result:', data);
          console.log('Test request error:', error);
        }}
        variant="outline"
      >
        Check Auth State
      </Button>

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
                  setNewModel({ ...newModel, provider: value as 'openai' | 'gemini' | 'anthropic' });
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
                <TableCell>{PROVIDERS[model.provider].name}</TableCell>
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
