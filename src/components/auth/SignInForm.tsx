import { useState, useEffect, useCallback } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { useAuth } from '@/lib/auth';
import { useToast } from '@/hooks/use-toast';
import { Card, CardContent, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import { Checkbox } from '@/components/ui/checkbox';
import { LoadingSpinner } from '@/components/LoadingSpinner';

export function SignInForm() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const { signIn, loading: authLoading, user } = useAuth();
  const { toast } = useToast();
  const navigate = useNavigate();

  // Check if user is already authenticated
  useEffect(() => {
    if (user) {
      console.log('User already authenticated, navigating to /chat');
      navigate('/chat', { replace: true });
    }
  }, [user, navigate]);

  // Add a safety timeout to prevent getting stuck in loading state
  useEffect(() => {
    let timeoutId: NodeJS.Timeout | null = null;
    
    if (isLoading) {
      console.log('Sign in loading state started, setting safety timeout');
      timeoutId = setTimeout(() => {
        console.log('Sign in safety timeout triggered after 5 seconds');
        setIsLoading(false);
        toast({
          title: 'Sign In Timeout',
          description: 'The sign in process is taking longer than expected. Please try again.',
          variant: 'destructive',
        });
      }, 5000); // Increased from 3 seconds to 5 seconds
    }
    
    return () => {
      if (timeoutId) {
        console.log('Clearing sign in safety timeout');
        clearTimeout(timeoutId);
      }
    };
  }, [isLoading, toast]);

  // Monitor auth state changes
  useEffect(() => {
    if (user && isLoading) {
      // User is authenticated and we were loading, navigate to chat
      console.log('User authenticated during sign-in process, navigating to /chat');
      setIsLoading(false);
      navigate('/chat', { replace: true });
    }
  }, [user, isLoading, navigate]);

  const handleSubmit = useCallback(async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!email || !password) {
      toast({
        title: 'Missing Information',
        description: 'Please enter both email and password.',
        variant: 'destructive',
      });
      return;
    }
    
    setIsLoading(true);

    try {
      console.log('Attempting to sign in with email:', email);
      const { error } = await signIn(email, password);
      
      if (error) {
        console.error('Sign in returned error:', error);
        throw error;
      }
      
      console.log('Sign in successful, waiting for auth state to update');
      
      // Note: Navigation is now handled by the useEffect that monitors user state
      
    } catch (error) {
      console.error('Sign in error:', error);
      
      // Get a more specific error message if possible
      let errorMessage = 'Invalid email or password';
      
      if (error instanceof Error) {
        if (error.message.includes('Invalid login')) {
          errorMessage = 'Invalid email or password.';
        } else if (error.message.includes('network')) {
          errorMessage = 'Network error. Please check your connection.';
        } else if (error.message.includes('timeout')) {
          errorMessage = 'Request timed out. Please try again.';
        } else {
          errorMessage = error.message;
        }
      }
      
      toast({
        title: 'Sign In Failed',
        description: errorMessage,
        variant: 'destructive',
      });
      
      // Make sure to reset loading state on error
      setIsLoading(false);
    }
  }, [email, password, signIn, toast, navigate]);

  return (
    <Card className="w-full max-w-md mx-auto mt-8">
      <CardHeader>
        <CardTitle>Sign In</CardTitle>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <label htmlFor="email" className="text-sm font-medium">
              Email
            </label>
            <Input
              id="email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="Enter your email"
              required
              autoComplete="email"
              disabled={isLoading}
            />
          </div>
          <div className="space-y-2">
            <label htmlFor="password" className="text-sm font-medium">
              Password
            </label>
            <Input
              id="password"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Enter your password"
              required
              autoComplete="current-password"
              disabled={isLoading}
            />
          </div>
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-2">
              <Checkbox id="remember" />
              <label
                htmlFor="remember"
                className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
              >
                Remember me
              </label>
            </div>
            <Link
              to="/auth/forgot-password"
              className="text-sm font-medium text-primary hover:underline"
            >
              Forgot password?
            </Link>
          </div>
          <Button
            type="submit"
            className="w-full"
            disabled={isLoading}
          >
            {isLoading ? (
              <LoadingSpinner size="sm" className="mr-2" />
            ) : (
              'Sign In'
            )}
          </Button>
        </form>
      </CardContent>
      <CardFooter className="flex justify-center">
        <p className="text-sm text-muted-foreground">
          Don&apos;t have an account?{' '}
          <Link to="/auth/signup" className="text-primary hover:underline">
            Sign up
          </Link>
        </p>
      </CardFooter>
    </Card>
  );
} 