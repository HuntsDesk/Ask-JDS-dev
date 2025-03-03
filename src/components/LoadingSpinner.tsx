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
        <div className={cn(
          'animate-spin rounded-full border-t-2 border-b-2 border-[#F37022]',
          sizeClasses[size],
          className
        )}></div>
      </div>
    );
  }

  return (
    <div className="flex justify-center items-center">
      <div className={cn(
        'animate-spin rounded-full border-t-2 border-b-2 border-[#F37022]',
        sizeClasses[size],
        className
      )}></div>
    </div>
  );
}