import { Loader2 } from 'lucide-react';
import { cn } from '@/lib/utils';

interface LoadingSpinnerProps {
  className?: string;
  size?: 'sm' | 'md' | 'lg';
  fullScreen?: boolean;
}

export function LoadingSpinner({ 
  className,
  size = 'md',
  fullScreen = false
}: LoadingSpinnerProps) {
  const sizeClasses = {
    sm: 'w-4 h-4',
    md: 'w-8 h-8',
    lg: 'w-12 h-12'
  };

  if (fullScreen) {
    return (
      <div className="fixed inset-0 flex items-center justify-center bg-background/80 backdrop-blur-sm">
        <Loader2 className={cn(
          'animate-spin text-[#F37022]',
          sizeClasses[size],
          className
        )} />
      </div>
    );
  }

  return (
    <Loader2 className={cn(
      'animate-spin text-[#F37022]',
      sizeClasses[size],
      className
    )} />
  );
}