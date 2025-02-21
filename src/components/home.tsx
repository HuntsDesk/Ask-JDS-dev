import { useAuth } from '@/lib/auth';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { LogOut, Plus } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { useState } from 'react';
import { useToast } from '@/hooks/use-toast';

export function Home() {
  const { user, signOut } = useAuth();
  const { toast } = useToast();
  const [isCreating, setIsCreating] = useState(false);

  const handleSignOut = async () => {
    try {
      await signOut();
    } catch (error) {
      console.error('Error signing out:', error);
    }
  };

  const createTestThread = async () => {
    if (!user) return;
    
    setIsCreating(true);
    try {
      const { data, error } = await supabase
        .from('threads')
        .insert({
          title: 'Test Thread',
          user_id: user.id
        })
        .select()
        .single();

      if (error) throw error;

      toast({
        title: 'Success',
        description: `Created test thread with ID: ${data.id}`,
      });
    } catch (error) {
      console.error('Error creating thread:', error);
      toast({
        title: 'Error',
        description: error instanceof Error ? error.message : 'Failed to create test thread',
        variant: 'destructive',
      });
    } finally {
      setIsCreating(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-background p-4">
      <Card className="w-full max-w-md">
        <CardHeader>
          <CardTitle>Welcome {user?.email}</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <p className="text-muted-foreground">
              You are successfully logged in.
            </p>
            <Button
              className="w-full"
              onClick={createTestThread}
              disabled={isCreating}
            >
              <Plus className="w-4 h-4 mr-2" />
              Create Test Thread
            </Button>
            <Button
              variant="outline"
              className="w-full"
              onClick={handleSignOut}
            >
              <LogOut className="w-4 h-4 mr-2" />
              Sign Out
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}