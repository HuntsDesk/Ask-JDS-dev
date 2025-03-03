import React from 'react';
import { BookOpen, Lock, PlusCircle, Edit, Trash2 } from 'lucide-react';
import { Link } from 'react-router-dom';
import Tooltip from './Tooltip';

interface SubjectCardProps {
  id: string;
  name: string;
  description: string;
  isOfficial: boolean;
  collectionCount: number;
  onStudy: () => void;
  onDelete?: () => void;
  showDeleteButton: boolean;
}

export default function SubjectCard({
  id,
  name,
  description,
  isOfficial,
  collectionCount,
  onStudy,
  onDelete,
  showDeleteButton
}: SubjectCardProps) {
  return (
    <div className="bg-white rounded-lg shadow-md overflow-hidden">
      <div className="p-6">
        <div className="flex items-center gap-2 mb-2">
          <BookOpen className="h-5 w-5 text-[#F37022]" />
          <span className="text-sm font-medium text-[#F37022] flex items-center gap-1">
            {name}
            {isOfficial && <Lock className="h-4 w-4 text-gray-400 ml-1" />}
          </span>
        </div>
        <h3 className="text-xl font-semibold text-gray-900 mb-2 hover:text-[#F37022] transition-colors">
          {description || `All ${name} flashcards`}
        </h3>
        <p className="text-gray-600 mb-4">
          {collectionCount} {collectionCount === 1 ? 'collection' : 'collections'} available
        </p>
        <div className="flex justify-between items-center">
          <div className="flex gap-2">
            <Tooltip text="Create Flashcard Collection">
              <Link
                to={`/flashcards/create?subject=${id}`}
                className="text-gray-600 hover:text-[#F37022]"
              >
                <PlusCircle className="h-5 w-5" />
              </Link>
            </Tooltip>
            {!isOfficial && (
              <>
                <Tooltip text="Edit Subject">
                  <Link
                    to={`/flashcards/edit-subject/${id}`}
                    className="text-gray-600 hover:text-[#F37022]"
                  >
                    <Edit className="h-5 w-5" />
                  </Link>
                </Tooltip>
                {showDeleteButton && onDelete && (
                  <Tooltip text="Delete Subject">
                    <button
                      onClick={onDelete}
                      className="text-gray-600 hover:text-red-600"
                    >
                      <Trash2 className="h-5 w-5" />
                    </button>
                  </Tooltip>
                )}
              </>
            )}
          </div>
          <button
            onClick={onStudy}
            className="bg-[#F37022]/10 text-[#F37022] px-4 py-2 rounded-md hover:bg-[#F37022]/20"
          >
            Study Now
          </button>
        </div>
      </div>
    </div>
  );
} 