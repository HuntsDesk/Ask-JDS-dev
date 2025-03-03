import React, { useState, useEffect } from 'react';
import { X } from 'lucide-react';

interface DeleteConfirmationProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
  title: string;
  message: string;
  itemName?: string;
}

export default function DeleteConfirmation({
  isOpen,
  onClose,
  onConfirm,
  title,
  message,
  itemName
}: DeleteConfirmationProps) {
  const [dontShowAgain, setDontShowAgain] = useState(false);
  
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = 'auto';
    }
    
    return () => {
      document.body.style.overflow = 'auto';
    };
  }, [isOpen]);
  
  if (!isOpen) return null;
  
  const handleConfirm = () => {
    if (dontShowAgain) {
      localStorage.setItem('skipDeleteConfirmation', 'true');
    }
    onConfirm();
  };
  
  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-lg shadow-xl max-w-md w-full">
        <div className="flex justify-between items-center p-4 border-b">
          <h3 className="text-lg font-semibold text-gray-900">{title}</h3>
          <button 
            onClick={onClose}
            className="text-gray-400 hover:text-gray-500"
          >
            <X className="h-5 w-5" />
          </button>
        </div>
        
        <div className="p-6">
          <p className="text-gray-600 mb-4">{message}</p>
          {itemName && (
            <p className="font-medium text-gray-800 mb-4">"{itemName}"</p>
          )}
          <p className="text-red-600 text-sm mb-6">This action cannot be undone.</p>
          
          <div className="flex items-center mb-4">
            <input
              type="checkbox"
              id="dontShowAgain"
              checked={dontShowAgain}
              onChange={(e) => setDontShowAgain(e.target.checked)}
              className="h-4 w-4 text-indigo-600 focus:ring-indigo-500 border-gray-300 rounded"
            />
            <label htmlFor="dontShowAgain" className="ml-2 text-sm text-gray-600">
              Don't show this warning again
            </label>
          </div>
          
          <div className="flex justify-end gap-3">
            <button
              onClick={onClose}
              className="px-4 py-2 bg-gray-100 hover:bg-gray-200 text-gray-800 rounded-md"
            >
              Cancel
            </button>
            <button
              onClick={handleConfirm}
              className="px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-md"
            >
              Delete
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}