import { Navigate } from 'react-router-dom';
import { useAuth } from '@/lib/auth';

// 7. Handle auth state properly
export function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const { user } = useAuth();

  if (!user) {
    return <Navigate to="/auth/signin" />;
  }

  return <>{children}</>;
} 