import { useState, useCallback } from 'react';

export type ToastType = 'success' | 'error' | 'info' | 'warning';

interface Toast {
  message: string;
  type: ToastType;
  id?: string;
}

export default function useToast() {
  const [toast, setToast] = useState<Toast | null>(null);

  const showToast = useCallback((message: string, type: ToastType = 'info') => {
    const id = Math.random().toString(36).substring(2, 9);
    setToast({ message, type, id });
    
    // Auto-hide after 5 seconds
    setTimeout(() => {
      hideToast(id);
    }, 5000);
  }, []);

  const hideToast = useCallback((id?: string) => {
    setToast(current => {
      if (id && current?.id !== id) return current;
      return null;
    });
  }, []);

  return { toast, showToast, hideToast };
} 