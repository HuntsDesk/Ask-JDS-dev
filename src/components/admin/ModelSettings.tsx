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
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { supabase } from '@/lib/supabase';

interface Model {
  id: string;
  name: string;
  is_active: boolean;
  api_key_required: boolean;
  max_tokens: number;
  created_at: string;
}

export function ModelSettings() {
  const [models, setModels] = useState<Model[]>([]);
  const [loading, setLoading] = useState(true);
  const [newModel, setNewModel] = useState({
    name: '',
    api_key_required: false,
    max_tokens: 4096
  });
  const { toast } = useToast();

  useEffect(() => {
    loadModels();
  }, []);

  async function loadModels() {
    try {
      const { data, error } = await supabase
        .from('models')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;
      setModels(data || []);
    } catch (error) {
      console.error('Error loading models:', error);
      toast({
        title: 'Error',
        description: 'Failed to load models',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  }

  async function handleAddModel(e: React.FormEvent) {
    e.preventDefault();
    try {
      const { error } = await supabase
        .from('models')
        .insert([newModel]);

      if (error) throw error;
      
      await loadModels();
      setNewModel({ name: '', api_key_required: false, max_tokens: 4096 });
      toast({
        title: 'Success',
        description: 'Model added successfully',
      });
    } catch (error) {
      console.error('Error adding model:', error);
      toast({
        title: 'Error',
        description: 'Failed to add model',
        variant: 'destructive',
      });
    }
  }

  async function handleToggleActive(modelId: string, currentStatus: boolean) {
    try {
      const { error } = await supabase
        .from('models')
        .update({ is_active: !currentStatus })
        .eq('id', modelId);

      if (error) throw error;
      
      await loadModels();
      toast({
        title: 'Success',
        description: 'Model status updated',
      });
    } catch (error) {
      console.error('Error updating model:', error);
      toast({
        title: 'Error',
        description: 'Failed to update model status',
        variant: 'destructive',
      });
    }
  }

  if (loading) {
    return <div>Loading...</div>;
  }

  return (
    <div className="space-y-6">
      <div className="rounded-md border p-4">
        <h2 className="text-lg font-semibold mb-4">Add New Model</h2>
        <form onSubmit={handleAddModel} className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="name">Model Name</Label>
              <Input
                id="name"
                value={newModel.name}
                onChange={(e) => setNewModel({ ...newModel, name: e.target.value })}
                placeholder="e.g., gpt-4"
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="max_tokens">Max Tokens</Label>
              <Input
                id="max_tokens"
                type="number"
                value={newModel.max_tokens}
                onChange={(e) => setNewModel({ ...newModel, max_tokens: parseInt(e.target.value) })}
                required
              />
            </div>
          </div>
          <div className="flex items-center space-x-2">
            <Switch
              id="api_key_required"
              checked={newModel.api_key_required}
              onCheckedChange={(checked) => setNewModel({ ...newModel, api_key_required: checked })}
            />
            <Label htmlFor="api_key_required">Requires API Key</Label>
          </div>
          <Button type="submit">Add Model</Button>
        </form>
      </div>

      <div className="rounded-md border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Name</TableHead>
              <TableHead>Max Tokens</TableHead>
              <TableHead>API Key Required</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {models.map((model) => (
              <TableRow key={model.id}>
                <TableCell>{model.name}</TableCell>
                <TableCell>{model.max_tokens}</TableCell>
                <TableCell>{model.api_key_required ? 'Yes' : 'No'}</TableCell>
                <TableCell>{model.is_active ? 'Active' : 'Inactive'}</TableCell>
                <TableCell>
                  <Switch
                    checked={model.is_active}
                    onCheckedChange={() => handleToggleActive(model.id, model.is_active)}
                  />
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
