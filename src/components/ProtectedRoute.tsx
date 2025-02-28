import { Navigate } from 'react-router-dom';
import { useAuth } from '@/lib/auth';
import { LoadingSpinner } from '@/components/LoadingSpinner';
import { useEffect, useState } from 'react';

// 7. Handle auth state properly
export function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const { user, loading, authInitialized } = useAuth();
  const [loadingTimeout, setLoadingTimeout] = useState(false);

  console.log('ProtectedRoute - Auth state:', { user, loading, authInitialized, loadingTimeout });

  // Add a safety timeout to prevent getting stuck in loading state
  useEffect(() => {
    let timeoutId: NodeJS.Timeout | null = null;
    
    // Only set timeout if we're still loading and haven't timed out yet
    if ((loading || !authInitialized) && !loadingTimeout) {
      console.log('ProtectedRoute: Setting loading safety timeout');
      timeoutId = setTimeout(() => {
        console.log('ProtectedRoute: Loading safety timeout triggered');
        setLoadingTimeout(true);
      }, 1000); // Short timeout for better UX
    }
    
    return () => {
      if (timeoutId) {
        console.log('ProtectedRoute: Clearing loading safety timeout');
        clearTimeout(timeoutId);
      }
    };
  }, [loading, authInitialized, loadingTimeout]);

  // If we have a user, render the protected content
  if (user) {
    console.log('ProtectedRoute - User authenticated, rendering content');
    return <>{children}</>;
  }

  // Show a brief loading spinner with branded colors, but not for too long
  if ((loading || !authInitialized) && !loadingTimeout) {
    console.log('ProtectedRoute - Showing loading spinner');
    return (
      <div className="fixed inset-0 flex flex-col items-center justify-center bg-white">
        <div className="flex flex-col items-center">
          <LoadingSpinner className="text-[#F37022] w-12 h-12" />
          <p className="mt-4 text-gray-600">Loading...</p>
        </div>
      </div>
    );
  }

  // If no user after checks, redirect to sign in
  console.log('ProtectedRoute - No user after checks, redirecting to sign in');
  return <Navigate to="/" replace />;
} 