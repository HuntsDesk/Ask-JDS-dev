import React, { useEffect, useState, createContext, useContext } from 'react';
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
import { QueryClientProvider } from '@tanstack/react-query';
import { queryClient } from '@/lib/query-client';

// Create a context for the selected thread
export const SelectedThreadContext = createContext<{
  selectedThreadId: string | null;
  setSelectedThreadId: (id: string | null) => void;
}>({
  selectedThreadId: null,
  setSelectedThreadId: () => {},
});

// Create a context for the sidebar
export const SidebarContext = createContext<{
  isExpanded: boolean;
  setIsExpanded: (expanded: boolean) => void;
}>({
  isExpanded: false,
  setIsExpanded: () => {},
});

// Provider component for the selected thread
function SelectedThreadProvider({ children }: { children: React.ReactNode }) {
  const [selectedThreadId, setSelectedThreadId] = useState<string | null>(null);
  
  // Log changes to the selected thread for debugging
  useEffect(() => {
    console.log('Global thread selection changed to:', selectedThreadId);
  }, [selectedThreadId]);
  
  return (
    <SelectedThreadContext.Provider value={{ selectedThreadId, setSelectedThreadId }}>
      {children}
    </SelectedThreadContext.Provider>
  );
}

// Provider component for sidebar state
function SidebarProvider({ children }: { children: React.ReactNode }) {
  const [isExpanded, setIsExpanded] = useState<boolean>(false);
  
  return (
    <SidebarContext.Provider value={{ 
      isExpanded, 
      setIsExpanded 
    }}>
      {children}
    </SidebarContext.Provider>
  );
}

// Create router with future flags
const router = createBrowserRouter(
  createRoutesFromElements(
    <>
      <Route path="/" element={<HomePage />} />
      <Route path="/auth" element={<AuthPage />} />
      <Route 
        path="/chat/:id" 
        element={
          <ProtectedRoute>
            <ChatLayout key="chat-with-id" />
          </ProtectedRoute>
        } 
      />
      <Route 
        path="/chat" 
        element={
          <ProtectedRoute>
            <ChatLayout key="chat-without-id" />
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

// Wrapper function for the entire app
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
    <QueryClientProvider client={queryClient}>
      <ErrorBoundary
        fallback={
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
        }
      >
        <AuthProvider>
          <SelectedThreadProvider>
            <SidebarProvider>
              <RouterProvider router={router} />
              <Toaster />
              <OfflineIndicator />
            </SidebarProvider>
          </SelectedThreadProvider>
        </AuthProvider>
      </ErrorBoundary>
    </QueryClientProvider>
  );
}

export default App;