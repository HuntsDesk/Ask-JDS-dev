import { useAuth as useAppAuth } from '@/lib/auth';

export default function useAuth() {
  const auth = useAppAuth();
  
  return {
    user: auth.user,
    isAuthenticated: !!auth.user,
    isLoading: auth.loading,
    signOut: auth.signOut
  };
} 