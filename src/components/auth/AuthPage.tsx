import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { SignInPage } from './SignInPage';
import { useAuth } from '@/lib/auth';

export function AuthPage() {
  const { user } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    if (user) {
      navigate('/');
    }
  }, [user, navigate]);

  return <SignInPage />;
} 