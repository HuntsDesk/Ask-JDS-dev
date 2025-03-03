import React from 'react';
import { Link } from 'react-router-dom';
import { BookOpen, Trash2, PlusCircle, Edit } from 'lucide-react';

interface CardProps {
  title: string;
  description?: string;
  tag?: string;
  count: number;
  link: string;
  onDelete?: () => void;
  collectionId?: string;
  isOfficial?: boolean;
  subjectId?: string;
}

export default function Card({
  title,
  description,
  tag,
  count,
  link,
  onDelete,
  collectionId,
  isOfficial = false,
  subjectId
}: CardProps) {
  return (
    <div className="bg-white rounded-lg shadow-md overflow-hidden">
      <div className="p-6">
        <div className="flex items-center gap-2 mb-2">
          <BookOpen className="h-5 w-5 text-indigo-600" />
          {subjectId ? (
            <Link 
              to={`/flashcards/subjects/${subjectId}`}
              className="text-sm font-medium text-indigo-600 hover:text-indigo-800 hover:underline"
            >
              {tag}
            </Link>
          ) : (
            <span className="text-sm font-medium text-indigo-600">{tag}</span>
          )}
        </div>
        
        <Link to={link} className="block mb-2">
          <h3 className="text-xl font-semibold text-gray-900 mb-2 hover:text-indigo-600 transition-colors">
            {title}
          </h3>
        </Link>
        
        {description && (
          <p className="text-gray-600 mb-4 line-clamp-2">
            {description}
          </p>
        )}
        
        <div className="flex justify-between items-center">
          {!isOfficial && (
            <div className="flex gap-2">
              <Link
                to={`/flashcards/add-card/${collectionId}`}
                className="text-gray-600 hover:text-indigo-600"
                title="Add Card"
              >
                <PlusCircle className="h-5 w-5" />
              </Link>
              <Link
                to={`/flashcards/edit/${collectionId}`}
                className="text-gray-600 hover:text-indigo-600"
                title="Edit Collection"
              >
                <Edit className="h-5 w-5" />
              </Link>
              {onDelete && (
                <button
                  onClick={onDelete}
                  className="text-gray-600 hover:text-red-600"
                  title="Delete Collection"
                >
                  <Trash2 className="h-5 w-5" />
                </button>
              )}
            </div>
          )}
          <div className={!isOfficial ? "" : "ml-auto"}>
            <Link
              to={link}
              className="bg-indigo-100 text-indigo-700 px-4 py-2 rounded-md hover:bg-indigo-200"
            >
              Study Now
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
} 