import { Route, Routes } from 'react-router-dom';
import { SignInForm } from '@/components/auth/SignInForm';
import { SignUpForm } from '@/components/auth/SignUpForm';

export function AuthRoutes() {
  return (
    <Routes>
      <Route path="signin" element={<SignInForm />} />
      <Route path="signup" element={<SignUpForm />} />
    </Routes>
  );
} 