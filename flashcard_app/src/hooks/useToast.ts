import { useState } from 'react';

type ToastType = 'success' | 'error';

interface ToastState {
  message: string;
  type: ToastType;
}

export default function useToast(duration = 3000) {
  const [toast, setToast] = useState<ToastState | null>(null);

  const showToast = (message: string, type: ToastType) => {
    setToast({ message, type });
    
    setTimeout(() => {
      setToast(null);
    }, duration);
  };

  const hideToast = () => {
    setToast(null);
  };

  return {
    toast,
    showToast,
    hideToast
  };
}