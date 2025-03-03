import React, { useEffect, useState } from 'react';
import { AuthProvider, useAuth } from '@/lib/auth';
import { Toaster } from '@/components/ui/toaster';
import { ChatLayout } from '@/components/chat/ChatLayout';
import { ErrorBoundary } from '@/components/ErrorBoundary';
import { OfflineIndicator } from '@/components/OfflineIndicator';
import { HomePage } from '@/components/HomePage';
import { AuthPage } from '@/components/auth/AuthPage';
import { 
  BrowserRouter as Router, 
  Routes, 
  Route, 
  Navigate,
  createRoutesFromElements,
  createBrowserRouter,
  RouterProvider
} from 'react-router-dom';
import { ProtectedRoute } from '@/components/ProtectedRoute';
import { SettingsPage } from '@/components/settings/SettingsPage';
import { LoadingSpinner } from '@/components/LoadingSpinner';
import { Button } from '@/components/ui/button';
import FlashcardsPage from '@/components/flashcards/FlashcardsPage';
import { AlertTriangle } from 'lucide-react';

// Create router with future flags
const router = createBrowserRouter(
  createRoutesFromElements(
    <>
      <Route path="/" element={<HomePage />} />
      <Route path="/auth" element={<AuthPage />} />
      <Route 
        path="/chat" 
        element={
          <ProtectedRoute>
            <ChatLayout />
          </ProtectedRoute>
        } 
      />
      <Route 
        path="/settings" 
        element={
          <ProtectedRoute>
            <SettingsPage />
          </ProtectedRoute>
        } 
      />
      <Route 
        path="/flashcards/*" 
        element={
          <ProtectedRoute>
            <FlashcardsPage />
          </ProtectedRoute>
        } 
      />
    </>
  ),
  {
    // Add future flags to fix warnings
    future: {
      v7_startTransition: true,
      v7_normalizeFormMethod: true
    }
  }
);

// Wrapper component to handle auth state
function AppRoutes() {
  const { user, loading, authInitialized } = useAuth();
  const [loadingTimeout, setLoadingTimeout] = useState(false);
  const [error, setError] = useState<Error | null>(null);
  const [networkStatus, setNetworkStatus] = useState<'online' | 'offline'>(
    typeof navigator !== 'undefined' && navigator.onLine ? 'online' : 'offline'
  );
  
  // Monitor network status
  useEffect(() => {
    const handleOnline = () => {
      console.log('Network is now online');
      setNetworkStatus('online');
    };
    
    const handleOffline = () => {
      console.log('Network is now offline');
      setNetworkStatus('offline');
    };
    
    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);
    
    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);
  
  // Add a safety timeout to prevent getting stuck in loading state
  useEffect(() => {
    let timeoutId: NodeJS.Timeout | null = null;
    
    if ((loading || !authInitialized) && !loadingTimeout) {
      console.log('AppRoutes: Setting loading safety timeout');
      timeoutId = setTimeout(() => {
        console.log('AppRoutes: Loading safety timeout triggered');
        setLoadingTimeout(true);
        
        // If we still don't have auth initialized, force a refresh
        if (!authInitialized && typeof window !== 'undefined') {
          console.log('AppRoutes: Auth still not initialized after timeout, checking browser storage');
          
          // Check if we have a session in local storage
          const hasSession = localStorage.getItem('ask-jds-auth-storage') !== null;
          console.log('AppRoutes: Session in local storage:', hasSession);
        }
      }, 8000); // Increase to 8 seconds to give auth more time
    }
    
    return () => {
      if (timeoutId) {
        console.log('AppRoutes: Clearing loading safety timeout');
        clearTimeout(timeoutId);
      }
    };
  }, [loading, authInitialized, loadingTimeout]);
  
  useEffect(() => {
    console.log('AppRoutes: Auth state', { 
      user: user?.email, 
      loading, 
      authInitialized,
      loadingTimeout,
      networkStatus
    });
    
    // Force check session if we're stuck in loading
    if (loadingTimeout && (loading || !authInitialized)) {
      console.log('AppRoutes: Forcing route rendering due to timeout');
    }
  }, [user, loading, authInitialized, loadingTimeout, networkStatus]);
  
  // Show a network error message if offline
  if (networkStatus === 'offline') {
    return (
      <>
        <div className="fixed inset-0 flex items-center justify-center bg-background z-50">
          <div className="bg-card p-6 rounded-lg shadow-lg max-w-md w-full text-center">
            <h2 className="text-xl font-bold mb-4">Network Connection Issue</h2>
            <p className="mb-4">
              You appear to be offline. Please check your internet connection and try again.
            </p>
            <Button 
              onClick={() => window.location.reload()}
              className="w-full"
            >
              Retry Connection
            </Button>
          </div>
        </div>
        <OfflineIndicator />
      </>
    );
  }

  if (error) {
    return (
      <div className="fixed inset-0 flex items-center justify-center bg-background z-50">
        <div className="bg-card p-6 rounded-lg shadow-lg max-w-md w-full text-center">
          <h2 className="text-xl font-bold mb-4">Something went wrong</h2>
          <p className="mb-4 text-red-500">{error.message}</p>
          <pre className="bg-gray-100 p-2 rounded text-left overflow-auto max-h-40 mb-4">{error.stack}</pre>
          <Button 
            onClick={() => window.location.reload()}
            className="w-full"
          >
            Reload Application
          </Button>
        </div>
      </div>
    );
  }
  
  try {
    // Render the app immediately without waiting for auth to initialize
    return (
      <>
        <RouterProvider router={router} />
        <Toaster />
        <OfflineIndicator />
      </>
    );
  } catch (err) {
    console.error('Error rendering app:', err);
    setError(err instanceof Error ? err : new Error(String(err)));
    return null;
  }
}

function App() {
  const [loading, setLoading] = useState(true);
  const auth = useAuth();
  
  // Check if we're waiting for auth to initialize
  useEffect(() => {
    console.log('App mounted, checking auth status:', auth.loading, auth.authInitialized);
    
    // Wait for auth to initialize or set a safety timeout
    const safetyTimeoutId = setTimeout(() => {
      if (loading) {
        console.warn('Auth initialization safety timeout triggered after 8 seconds');
        
        // Directly check local storage for session as a fallback
        const hasSessionInStorage = localStorage.getItem('supabase.auth.token') !== null;
        console.log('Session in local storage:', hasSessionInStorage ? 'Yes' : 'No');
        
        setLoading(false);
      }
    }, 8000);
    
    // When auth is initialized, we can proceed
    if (!auth.loading && auth.authInitialized) {
      console.log('Auth initialized:', auth.user ? 'User present' : 'No user');
      setLoading(false);
    }
    
    return () => {
      clearTimeout(safetyTimeoutId);
    };
  }, [auth.loading, auth.authInitialized, loading]);
  
  // Render a loading spinner while waiting for auth
  if (loading && auth.loading) {
    return (
      <div className="flex flex-col justify-center items-center h-screen w-screen bg-white">
        <div className="animate-spin rounded-full h-16 w-16 border-t-2 border-b-2 border-blue-500"></div>
        <p className="mt-4 text-gray-600">Loading application...</p>
      </div>
    );
  }
  
  // Check if online
  const isOnline = typeof navigator !== 'undefined' ? navigator.onLine : true;
  
  // Show offline warning if needed
  if (!isOnline) {
    return (
      <div className="flex flex-col justify-center items-center h-screen w-screen bg-red-50 p-8">
        <AlertTriangle className="h-16 w-16 text-red-500 mb-4" />
        <h2 className="text-2xl font-bold text-red-700 mb-2">You're offline</h2>
        <p className="text-center text-red-600 mb-4">
          Please check your internet connection and try again.
        </p>
        <button
          onClick={() => window.location.reload()}
          className="px-4 py-2 bg-red-600 text-white rounded-md hover:bg-red-700"
        >
          Retry
        </button>
      </div>
    );
  }
  
  return (
    <ErrorBoundary fallback={
      <div className="fixed inset-0 flex items-center justify-center bg-background">
        <div className="bg-card p-6 rounded-lg shadow-lg max-w-md w-full text-center">
          <h2 className="text-xl font-bold mb-4">Application Error</h2>
          <p className="mb-4">
            The application encountered an unexpected error. Please try refreshing the page.
          </p>
          <Button 
            onClick={() => window.location.reload()}
            className="w-full"
          >
            Reload Application
          </Button>
        </div>
      </div>
    }>
      <AuthProvider>
        <AppRoutes />
      </AuthProvider>
    </ErrorBoundary>
  );
}

export default App;