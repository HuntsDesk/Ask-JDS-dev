import React, { useState } from 'react';

interface TooltipProps {
  children: React.ReactNode;
  text: string;
  position?: 'top' | 'bottom' | 'left' | 'right';
}

export default function Tooltip({ 
  children, 
  text, 
  position = 'top' 
}: TooltipProps) {
  const [isVisible, setIsVisible] = useState(false);

  const getPositionClasses = () => {
    switch (position) {
      case 'top':
        return 'bottom-full left-1/2 transform -translate-x-1/2 mb-1';
      case 'bottom':
        return 'top-full left-1/2 transform -translate-x-1/2 mt-1';
      case 'left':
        return 'right-full top-1/2 transform -translate-y-1/2 mr-1';
      case 'right':
        return 'left-full top-1/2 transform -translate-y-1/2 ml-1';
      default:
        return 'bottom-full left-1/2 transform -translate-x-1/2 mb-1';
    }
  };

  return (
    <div 
      className="relative inline-flex"
      onMouseEnter={() => setIsVisible(true)}
      onMouseLeave={() => setIsVisible(false)}
    >
      {isVisible && (
        <div 
          className={`absolute z-10 px-2 py-1 text-xs font-medium text-white bg-gray-800 rounded shadow-sm whitespace-nowrap ${getPositionClasses()}`}
        >
          {text}
          <div 
            className={`absolute w-2 h-2 bg-gray-800 transform rotate-45 ${
              position === 'top' ? 'top-full -translate-y-1/2 left-1/2 -translate-x-1/2' :
              position === 'bottom' ? 'bottom-full translate-y-1/2 left-1/2 -translate-x-1/2' :
              position === 'left' ? 'left-full -translate-x-1/2 top-1/2 -translate-y-1/2' :
              'right-full translate-x-1/2 top-1/2 -translate-y-1/2'
            }`}
          />
        </div>
      )}
      {children}
    </div>
  );
} 