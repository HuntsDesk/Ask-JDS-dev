import React from 'react';
import { AlertTriangle } from 'lucide-react';

interface ErrorMessageProps {
  message: string;
}

export default function ErrorMessage({ message }: ErrorMessageProps) {
  return (
    <div className="bg-red-100 border border-red-400 text-red-700 px-6 py-4 rounded-md flex items-start">
      <AlertTriangle className="h-5 w-5 mr-3 mt-0.5 flex-shrink-0" />
      <div>
        <h3 className="font-medium mb-1">Error</h3>
        <p>{message}</p>
      </div>
    </div>
  );
} 