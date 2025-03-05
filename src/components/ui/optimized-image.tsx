import React, { useState, useEffect } from 'react';
import { cn } from '@/lib/utils';

interface OptimizedImageProps extends React.ImgHTMLAttributes<HTMLImageElement> {
  src: string;
  alt: string;
  width?: number;
  height?: number;
  placeholderSrc?: string;
  fallbackSrc?: string;
  className?: string;
  containerClassName?: string;
  priority?: boolean;
  loadingMode?: 'lazy' | 'eager';
}

export function OptimizedImage({
  src,
  alt,
  width,
  height,
  placeholderSrc,
  fallbackSrc,
  className,
  containerClassName,
  priority = false,
  loadingMode,
  ...props
}: OptimizedImageProps) {
  const [loaded, setLoaded] = useState(false);
  const [error, setError] = useState(false);
  const [currentSrc, setCurrentSrc] = useState(placeholderSrc || src);
  
  // Set up loading mode
  const loading = priority ? 'eager' : loadingMode || 'lazy';
  
  // Set current source when src prop changes
  useEffect(() => {
    if (!placeholderSrc) {
      setCurrentSrc(src);
    }
  }, [src, placeholderSrc]);
  
  // Handle successful load
  const handleLoad = () => {
    if (currentSrc === src) {
      setLoaded(true);
    }
  };
  
  // Handle load error
  const handleError = () => {
    if (currentSrc === src) {
      setError(true);
      if (fallbackSrc) {
        setCurrentSrc(fallbackSrc);
      }
    }
  };
  
  // Switch from placeholder to actual image after component mounts
  useEffect(() => {
    if (placeholderSrc && currentSrc === placeholderSrc) {
      // Preload the actual image
      const img = new Image();
      img.src = src;
      img.onload = () => {
        setCurrentSrc(src);
      };
      img.onerror = handleError;
    }
  }, [placeholderSrc, currentSrc, src]);
  
  return (
    <div
      className={cn(
        'relative overflow-hidden',
        containerClassName
      )}
      style={{
        width: width ? `${width}px` : 'auto',
        height: height ? `${height}px` : 'auto',
        transition: 'opacity 0.3s ease-in-out',
      }}
    >
      <img
        src={currentSrc}
        alt={alt}
        width={width}
        height={height}
        loading={loading}
        decoding="async"
        onLoad={handleLoad}
        onError={handleError}
        className={cn(
          'transition-opacity duration-300',
          {
            'opacity-0': placeholderSrc && !loaded && currentSrc === placeholderSrc,
            'opacity-100': !placeholderSrc || loaded || currentSrc !== placeholderSrc,
          },
          className
        )}
        {...props}
      />
      
      {/* If using a placeholder and not loaded yet, show a loading visual cue */}
      {placeholderSrc && !loaded && !error && (
        <div className="absolute inset-0 flex items-center justify-center bg-gray-100 dark:bg-gray-800">
          <div className="animate-pulse w-8 h-8 rounded-full bg-gray-200 dark:bg-gray-700" />
        </div>
      )}
      
      {/* Show error state if image failed to load and no fallback is available or fallback also failed */}
      {error && (!fallbackSrc || currentSrc === fallbackSrc) && (
        <div className="absolute inset-0 flex items-center justify-center bg-gray-100 dark:bg-gray-800 text-gray-400 text-sm">
          Image failed to load
        </div>
      )}
    </div>
  );
} 