import React from 'react';
import { Link } from 'react-router-dom';
import { BookOpen, Trash2, PlusCircle, Edit, BookText, CheckCircle } from 'lucide-react';
import Tooltip from './Tooltip';

interface CardProps {
  title: string;
  description?: string;
  tag?: string;
  count: number;
  masteredCount: number;
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
  masteredCount = 0,
  link,
  onDelete,
  collectionId,
  isOfficial = false,
  subjectId
}: CardProps) {
  return (
    <div className="bg-white rounded-lg shadow-md overflow-hidden">
      <div className="p-6">
        <div className="flex justify-between items-center mb-2">
          <div className="flex items-center gap-2">
            <BookOpen className="h-5 w-5 text-[#F37022]" />
            {subjectId ? (
              <Link 
                to={`/flashcards/subjects/${subjectId}`}
                className="text-sm font-medium text-[#F37022] hover:text-[#E36012] hover:underline"
              >
                {tag}
              </Link>
            ) : (
              <span className="text-sm font-medium text-[#F37022]">{tag}</span>
            )}
          </div>
          
          <div className="flex flex-col items-end gap-1 text-sm">
            <div className="flex items-center gap-1 text-gray-500">
              <BookText className="h-4 w-4" />
              <span>{count} cards</span>
            </div>
            <div className="flex items-center gap-1 text-green-600">
              <CheckCircle className="h-4 w-4" />
              <span>{masteredCount} mastered</span>
            </div>
          </div>
        </div>
        
        <Link to={link}>
          <h3 className="text-xl font-semibold text-gray-900 mb-2 hover:text-[#F37022] transition-colors">
            {title}
          </h3>
        </Link>
        
        <div className="h-12 mb-4">
          {description ? (
            <p className="text-gray-600 line-clamp-2">
              {description}
            </p>
          ) : (
            <div className="text-transparent">&#8203;</div>
          )}
        </div>
        
        <div className="flex justify-between items-center">
          {!isOfficial && (
            <div className="flex gap-2">
              <Tooltip text="Add Card">
                <Link
                  to={`/flashcards/add-card/${collectionId}`}
                  className="text-gray-600 hover:text-[#F37022]"
                >
                  <PlusCircle className="h-5 w-5" />
                </Link>
              </Tooltip>
              <Tooltip text="Edit Collection">
                <Link
                  to={`/flashcards/edit/${collectionId}`}
                  className="text-gray-600 hover:text-[#F37022]"
                >
                  <Edit className="h-5 w-5" />
                </Link>
              </Tooltip>
              {onDelete && (
                <Tooltip text="Delete Collection">
                  <button
                    onClick={onDelete}
                    className="text-gray-600 hover:text-red-600"
                  >
                    <Trash2 className="h-5 w-5" />
                  </button>
                </Tooltip>
              )}
            </div>
          )}
          
          <Link
            to={link}
            className="bg-[#F37022]/10 text-[#F37022] px-4 py-2 rounded-md hover:bg-[#F37022]/20"
          >
            Study Now
          </Link>
        </div>
      </div>
    </div>
  );
} 