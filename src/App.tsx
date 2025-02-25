import React from 'react';
import { AuthProvider } from '@/lib/auth';
import { Toaster } from '@/components/ui/toaster';
import { ChatLayout } from '@/components/chat/ChatLayout';
import { ErrorBoundary } from '@/components/ErrorBoundary';
import { OfflineIndicator } from '@/components/OfflineIndicator';
import { HomePage } from '@/components/HomePage';
import { SignInPage } from '@/components/auth/SignInPage';
import { SignUpPage } from '@/components/auth/SignUpPage';
import { AuthPage } from '@/components/auth/AuthPage';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import { ProtectedRoute } from '@/components/ProtectedRoute';

export default function App() {
  return (
    <ErrorBoundary fallback={<div>Something went wrong</div>}>
      <AuthProvider>
        <Router>
          <Routes>
            <Route path="/" element={<HomePage />} />
            <Route path="/auth" element={<AuthPage />} />
            <Route path="/auth/signin" element={<SignInPage />} />
            <Route path="/auth/signup" element={<SignUpPage />} />
            <Route 
              path="/chat" 
              element={
                <ProtectedRoute>
                  <ChatLayout />
                </ProtectedRoute>
              } 
            />
          </Routes>
        </Router>
        <Toaster />
        <OfflineIndicator />
      </AuthProvider>
    </ErrorBoundary>
  );
}