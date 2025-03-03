import React, { useEffect, useState } from 'react';
import { AlertTriangle, X } from 'lucide-react';

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
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden';
      setTimeout(() => setIsVisible(true), 10);
    } else {
      setIsVisible(false);
      document.body.style.overflow = '';
    }

    return () => {
      document.body.style.overflow = '';
    };
  }, [isOpen]);

  const handleClose = () => {
    setIsVisible(false);
    setTimeout(onClose, 300);
  };

  const handleConfirm = () => {
    onConfirm();
    handleClose();
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto">
      <div className="fixed inset-0 bg-black bg-opacity-50 transition-opacity duration-300"
        style={{ opacity: isVisible ? 1 : 0 }}
        onClick={handleClose}
      />
      
      <div className="flex items-center justify-center min-h-screen p-4">
        <div 
          className={`bg-white rounded-lg shadow-xl max-w-md w-full transform transition-all duration-300 ${
            isVisible ? 'opacity-100 scale-100' : 'opacity-0 scale-95'
          }`}
        >
          <div className="flex justify-between items-start p-4 border-b border-gray-200">
            <div className="flex items-center text-red-600">
              <AlertTriangle className="h-6 w-6 mr-2" />
              <h3 className="text-lg font-medium">{title}</h3>
            </div>
            <button
              onClick={handleClose}
              className="text-gray-400 hover:text-gray-500"
            >
              <X className="h-5 w-5" />
            </button>
          </div>
          
          <div className="p-6">
            <p className="text-gray-700 mb-4">{message}</p>
            
            {itemName && (
              <div className="bg-gray-100 p-3 rounded-md text-gray-800 font-medium mb-4">
                "{itemName}"
              </div>
            )}
            
            <div className="flex justify-end gap-3 mt-6">
              <button
                onClick={handleClose}
                className="px-4 py-2 bg-gray-200 text-gray-800 rounded-md hover:bg-gray-300"
              >
                Cancel
              </button>
              <button
                onClick={handleConfirm}
                className="px-4 py-2 bg-red-600 text-white rounded-md hover:bg-red-700"
              >
                Delete
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
} 