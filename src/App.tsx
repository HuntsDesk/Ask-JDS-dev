import React from 'react';
import { AuthProvider } from '@/lib/auth';
import { Toaster } from '@/components/ui/toaster';
import { ChatLayout } from '@/components/chat/ChatLayout';
import { ErrorBoundary } from '@/components/ErrorBoundary';
import { OfflineIndicator } from '@/components/OfflineIndicator';
import { HomePage } from '@/components/HomePage';
import { AuthPage } from '@/components/auth/AuthPage';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { ProtectedRoute } from '@/components/ProtectedRoute';
import { SignInForm } from '@/components/auth/SignInForm';
import { SignUpForm } from '@/components/auth/SignUpForm';

export default function App() {
  return (
    <ErrorBoundary fallback={<div>Something went wrong</div>}>
      <AuthProvider>
        <Router>
          <Routes>
            <Route path="/" element={<HomePage />} />
            <Route path="/auth" element={<AuthPage />}>
              <Route index element={<Navigate to="/auth/signin" replace />} />
              <Route path="signin" element={<SignInForm />} />
              <Route path="signup" element={<SignUpForm />} />
            </Route>
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