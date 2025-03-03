import React from 'react';
import { Link } from 'react-router-dom';
import { Check, Trash2, FileText } from 'lucide-react';

interface CardProps {
  id: string;
  question: string;
  answer: string;
  isMastered: boolean;
  collectionId: string;
  collectionTitle: string;
  subjectName: string;
  subjectId: string;
  onToggleMastered: () => void;
  onDelete?: () => void;
  showDeleteButton: boolean;
}

export default function Card({
  id,
  question,
  answer,
  isMastered,
  collectionId,
  collectionTitle,
  subjectName,
  subjectId,
  onToggleMastered,
  onDelete,
  showDeleteButton
}: CardProps) {
  return (
    <div 
      className={`bg-white rounded-lg shadow-md overflow-hidden ${isMastered ? 'border-l-4 border-green-500' : ''}`}
    >
      <div className="p-4">
        <div className="flex justify-between items-start mb-2">
          <div className="flex items-center gap-2">
            <FileText className="h-5 w-5 text-indigo-600" />
            <div>
              <div className="flex items-center gap-2">
                <Link 
                  to={`/study/${collectionId}`}
                  className="text-sm font-medium text-indigo-600 hover:text-indigo-800 hover:underline"
                >
                  {collectionTitle}
                </Link>
                <span className="text-gray-400">•</span>
                <Link
                  to={`/subject/${subjectId}`}
                  className="text-sm text-gray-600 hover:text-indigo-600 hover:underline"
                >
                  {subjectName}
                </Link>
              </div>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={onToggleMastered}
              className={`p-1 rounded-full ${
                isMastered 
                  ? 'bg-green-100 text-green-600 hover:bg-green-200'
                  : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
              }`}
              title={isMastered ? 'Unmark as mastered' : 'Mark as mastered'}
            >
              <Check className="h-5 w-5" />
            </button>
            {showDeleteButton && onDelete && (
              <button
                onClick={onDelete}
                className="p-1 rounded-full text-gray-600 hover:text-red-600 hover:bg-red-100"
                title="Delete card"
              >
                <Trash2 className="h-5 w-5" />
              </button>
            )}
          </div>
        </div>
        
        <div className="mt-2">
          <h3 className="text-lg font-medium text-gray-900 mb-2">{question}</h3>
          <div className="bg-gray-50 p-3 rounded-md">
            <p className="text-gray-700">{answer}</p>
          </div>
        </div>
        
        <div className="mt-4 flex justify-end">
          <Link
            to={`/study/${collectionId}`}
            className="text-indigo-600 hover:text-indigo-800 text-sm font-medium"
          >
            Study this collection →
          </Link>
        </div>
      </div>
    </div>
  );
}