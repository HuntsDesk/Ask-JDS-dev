import { Route, Routes } from 'react-router-dom';
import { AuthPage } from '@/components/auth/AuthPage';

export function AuthRoutes() {
  return (
    <Routes>
      <Route path="/" element={<AuthPage />} />
    </Routes>
  );
} 