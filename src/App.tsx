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

function App(): React.ReactElement {
  return (
    <ErrorBoundary>
      <Router>
        <AuthProvider>
          <Routes>
            <Route path="/auth" element={<AuthForm />} />
            <Route
              path="/"
              element={
                <PrivateRoute>
                  <ChatLayout />
                </PrivateRoute>
              }
            />
          </Routes>
          <Toaster />
          <OfflineIndicator />
        </AuthProvider>
      </Router>
    </ErrorBoundary>
  );
}

export default App;