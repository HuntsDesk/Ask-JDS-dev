import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { CheckCircle2, XCircle, LogIn } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/lib/auth';

export function SupabaseTest() {
  const [connectionStatus, setConnectionStatus] = useState<'testing' | 'success' | 'error'>('testing');
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const navigate = useNavigate();
  const { user } = useAuth();

  useEffect(() => {
    async function testConnection() {
      try {
        setConnectionStatus('testing');
        setErrorMessage(null);

        // First test: Check authentication
        const { data: authData, error: authError } = await supabase.auth.getUser();
        if (authError) throw authError;
        if (!authData.user) throw new Error('Please sign in to test the connection');

        // Second test: Try to access public schema with detailed error logging
        const { data, error: dbError } = await supabase
          .from('threads')
          .select('id')
          .limit(1)
          .single();

        if (dbError) {
          console.error('Database error details:', {
            code: dbError.code,
            message: dbError.message,
            details: dbError.details,
            hint: dbError.hint
          });
          
          // Check for specific error types
          if (dbError.code === 'PGRST116') {
            throw new Error('No access to the threads table. Please check RLS policies.');
          } else if (dbError.code === '42P01') {
            throw new Error('Table "threads" does not exist. Please check the database schema.');
          } else {
            throw new Error(`Database error: ${dbError.message}`);
          }
        }

        setConnectionStatus('success');
      } catch (error) {
        console.error('Connection test error:', error);
        setConnectionStatus('error');
        setErrorMessage(error instanceof Error ? error.message : 'An unknown error occurred');
      }
    }

    if (user) {
      testConnection();
    }
  }, [user]);

  const handleRetry = () => {
    setConnectionStatus('testing');
    setErrorMessage(null);
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-background p-4">
      <Card className="w-full max-w-md">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            Supabase Connection Test
            {connectionStatus === 'testing' && (
              <span className="animate-spin">⌛</span>
            )}
            {connectionStatus === 'success' && (
              <CheckCircle2 className="text-green-500" />
            )}
            {connectionStatus === 'error' && (
              <XCircle className="text-red-500" />
            )}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div className="space-y-2">
              <p className="text-sm font-medium">
                Status: {connectionStatus.charAt(0).toUpperCase() + connectionStatus.slice(1)}
              </p>
              {errorMessage && (
                <p className="text-sm text-red-500">{errorMessage}</p>
              )}
              {connectionStatus === 'success' && (
                <p className="text-sm text-green-500">
                  Successfully connected to Supabase!
                </p>
              )}
            </div>

            {!user && (
              <Button
                className="w-full"
                onClick={() => navigate('/auth')}
              >
                <LogIn className="w-4 h-4 mr-2" />
                Sign in to test connection
              </Button>
            )}

            {user && connectionStatus === 'error' && (
              <Button
                className="w-full"
                onClick={handleRetry}
              >
                Retry Connection Test
              </Button>
            )}

            {user && (
              <div className="mt-4 p-4 bg-muted rounded-lg">
                <p className="text-xs font-mono">User ID: {user.id}</p>
                <p className="text-xs font-mono">Email: {user.email}</p>
              </div>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}