import { useState, useEffect } from 'react';
import { getAllUsers, setUserAsAdmin, removeUserAdmin } from '@/lib/admin-client';
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

export function UserManager() {
  const [users, setUsers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const { toast } = useToast();

  useEffect(() => {
    loadUsers();
  }, []);

  async function loadUsers() {
    try {
      const users = await getAllUsers();
      setUsers(users);
    } catch (error) {
      toast({
        title: 'Error',
        description: 'Failed to load users',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  }

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
    } catch (error) {
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
                {user.raw_user_meta_data?.is_admin ? 'Admin' : 'User'}
              </TableCell>
              <TableCell>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => handleToggleAdmin(user.id, user.raw_user_meta_data?.is_admin)}
                >
                  {user.raw_user_meta_data?.is_admin ? (
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