import { useState, useEffect, useCallback } from 'react';
import { setUserAsAdmin, removeUserAdmin } from '@/lib/admin-client';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { Shield, ShieldOff } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/lib/supabase';

interface User {
  id: string;
  email: string;
  created_at: string;
  user_metadata: {
    is_admin?: boolean;
  };
}

export function UserManager() {
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const { toast } = useToast();

  const loadUsers = useCallback(async () => {
    try {
      const { data, error: loadError } = await supabase.from('users').select('*');
      if (loadError) {
        console.error('Failed to load users:', loadError);
        toast({
          title: 'Error',
          description: 'Failed to load users'
        });
        return;
      }
      setUsers(data || []);
    } catch (err) {
      console.error('Error loading users:', err);
    } finally {
      setLoading(false);
    }
  }, [toast]);

  useEffect(() => {
    loadUsers();
  }, [loadUsers]);

  async function handleToggleAdmin(userId: string, isCurrentlyAdmin: boolean) {
    try {
      if (isCurrentlyAdmin) {
        await removeUserAdmin(userId);
      } else {
        await setUserAsAdmin(userId);
      }
      await loadUsers();
      toast({
        title: 'Success',
        description: `User admin status updated`,
      });
    } catch (err) {
      console.error('Failed to update user admin status:', err);
      toast({
        title: 'Error',
        description: 'Failed to update user admin status',
        variant: 'destructive',
      });
    }
  }

  if (loading) {
    return <div>Loading...</div>;
  }

  return (
    <div className="rounded-md border">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Email</TableHead>
            <TableHead>Created At</TableHead>
            <TableHead>Last Sign In</TableHead>
            <TableHead>Admin Status</TableHead>
            <TableHead>Actions</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {users.map((user) => (
            <TableRow key={user.id}>
              <TableCell>{user.email}</TableCell>
              <TableCell>{new Date(user.created_at).toLocaleDateString()}</TableCell>
              <TableCell>
                {user.last_sign_in_at
                  ? new Date(user.last_sign_in_at).toLocaleDateString()
                  : 'Never'}
              </TableCell>
              <TableCell>
                {user.user_metadata?.is_admin ? 'Admin' : 'User'}
              </TableCell>
              <TableCell>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => handleToggleAdmin(user.id, user.user_metadata?.is_admin)}
                >
                  {user.user_metadata?.is_admin ? (
                    <ShieldOff className="h-4 w-4" />
                  ) : (
                    <Shield className="h-4 w-4" />
                  )}
                </Button>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}