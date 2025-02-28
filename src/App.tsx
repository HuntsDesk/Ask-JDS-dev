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
      }, 3000);
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
  
  // Render the app immediately without waiting for auth to initialize
  return (
    <>
      <RouterProvider router={router} />
      <Toaster />
      <OfflineIndicator />
    </>
  );
}

export default function App() {
  return (
    <ErrorBoundary fallback={<div>Something went wrong</div>}>
      <AuthProvider>
        <AppRoutes />
      </AuthProvider>
    </ErrorBoundary>
  );
}