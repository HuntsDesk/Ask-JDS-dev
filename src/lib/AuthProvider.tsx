import { type ReactNode } from 'react';
import { AuthContext } from '@/lib/auth';
import type { AuthContextType } from '@/types';

interface AuthProviderProps {
  children: ReactNode;
  value: AuthContextType;
}

export function AuthProvider({ children, value }: AuthProviderProps) {
  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
}