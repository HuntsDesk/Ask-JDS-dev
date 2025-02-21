import { Navigate } from 'react-router-dom';
import { useAuth } from '@/lib/auth';

export function AdminRoute({ children }: { children: React.ReactNode }) {
  const { user, loading } = useAuth();

  if (loading) {
    return <div>Loading...</div>;
  }

  if (!user?.isAdmin) {
    return <Navigate to="/" />;
  }

  return children;
}