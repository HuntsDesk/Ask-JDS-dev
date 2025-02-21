import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider } from '@/lib/auth';
import { AuthForm } from '@/components/auth-form';
import { useAuth } from '@/lib/auth';
import { Toaster } from '@/components/ui/toaster';
import { ChatLayout } from '@/components/chat/ChatLayout';
import { ErrorBoundary } from '@/components/ErrorBoundary';
import { OfflineIndicator } from '@/components/OfflineIndicator';
import { LoadingSpinner } from '@/components/LoadingSpinner';
import { HomePage } from '@/components/HomePage';
import { SignInPage } from '@/components/auth/SignInPage';
import { SignUpPage } from '@/components/auth/SignUpPage';
import { AuthPage } from '@/components/auth/AuthPage';
import { createBrowserRouter, RouterProvider, BrowserRouter } from 'react-router-dom';

function PrivateRoute({ children }: { children: React.ReactNode }) {
  const { user, loading } = useAuth();

  if (loading) {
    return <LoadingSpinner fullScreen />;
  }

  if (!user) {
    return <Navigate to="/auth" />;
  }

  return children;
}

function AuthenticatedRoutes() {
  const { user } = useAuth();
  
  return (
    <Routes>
      {/* Public routes */}
      <Route path="/" element={<HomePage />} />
      <Route 
        path="/auth" 
        element={user ? <Navigate to="/chat" /> : <AuthForm />} 
      />
      
      {/* Protected routes */}
      <Route
        path="/chat"
        element={
          <PrivateRoute>
            <ChatLayout />
          </PrivateRoute>
        }
      />
    </Routes>
  );
}

const router = createBrowserRouter([
  {
    path: "/",
    element: <HomePage />,
    errorElement: <ErrorBoundary />,
  },
  {
    path: "/auth",
    element: <AuthPage />,
  },
  {
    path: "/auth/signin",
    element: <SignInPage />,
  },
  {
    path: "/auth/signup",
    element: <SignUpPage />,
  },
  {
    path: "/chat",
    element: <ChatLayout />,
  }
]);

export default function App() {
  return (
    <ErrorBoundary>
      <AuthProvider>
        <RouterProvider router={router} />
        <Toaster />
        <OfflineIndicator />
      </AuthProvider>
    </ErrorBoundary>
  );
}