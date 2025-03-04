import React, { useState, useEffect } from 'react';
import { BookOpen, Lock, PlusCircle, Edit, Trash2, CheckCircle2, Layers } from 'lucide-react';
import { Link } from 'react-router-dom';
import Tooltip from './Tooltip';
import { supabase } from '@/lib/supabase';

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
  const [cardStats, setCardStats] = useState({ total: 0, mastered: 0 });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function loadCardStats() {
      try {
        setLoading(true);
        
        // First get all collections for this subject
        const { data: collections, error: collectionError } = await supabase
          .from('flashcard_collections')
          .select('id')
          .eq('subject_id', id);
          
        if (collectionError) throw collectionError;
        
        if (collections && collections.length > 0) {
          const collectionIds = collections.map(c => c.id);
          
          // Get total card count
          const { count: totalCount, error: totalError } = await supabase
            .from('flashcards')
            .select('*', { count: 'exact', head: true })
            .in('collection_id', collectionIds);
            
          if (totalError) throw totalError;
          
          // Get mastered card count
          const { count: masteredCount, error: masteredError } = await supabase
            .from('flashcards')
            .select('*', { count: 'exact', head: true })
            .in('collection_id', collectionIds)
            .eq('is_mastered', true);
            
          if (masteredError) throw masteredError;
          
          setCardStats({
            total: totalCount || 0,
            mastered: masteredCount || 0
          });
        }
      } catch (err) {
        console.error('Error loading card stats:', err);
      } finally {
        setLoading(false);
      }
    }
    
    loadCardStats();
  }, [id]);

  return (
    <div className="bg-white rounded-lg shadow-md overflow-hidden">
      <div className="p-6">
        <div className="flex items-center gap-2 mb-3">
          <BookOpen className="h-5 w-5 text-[#F37022]" />
          <h3 className="text-xl font-semibold text-gray-900 flex items-center gap-1">
            {name}
            {isOfficial && <Lock className="h-4 w-4 text-gray-400 ml-1" />}
          </h3>
        </div>
        
        {/* Only show description if it exists */}
        {description && (
          <p className="text-gray-700 mb-4">
            {description}
          </p>
        )}
        
        <div className="mb-5">
          <div className="flex flex-col space-y-2">
            <div className="flex items-center gap-2">
              <Layers className="h-4 w-4 text-indigo-500" />
              <span className="text-sm text-gray-600">
                <span className="font-medium">{collectionCount}</span> {collectionCount === 1 ? 'collection' : 'collections'}
              </span>
            </div>
            <div className="flex items-center gap-2">
              <BookOpen className="h-4 w-4 text-blue-500" />
              <span className="text-sm text-gray-600">
                <span className="font-medium">{cardStats.total}</span> cards
              </span>
            </div>
            <div className="flex items-center gap-2">
              <CheckCircle2 className="h-4 w-4 text-green-500" />
              <span className="text-sm text-gray-600">
                <span className="font-medium">{cardStats.mastered}</span> mastered
              </span>
            </div>
          </div>
        </div>
        
        <div className="flex justify-between items-center">
          <div className="flex gap-2">
            <Tooltip text="Create Flashcard Collection">
              <Link
                to={`/flashcards/create-collection?subject=${id}`}
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