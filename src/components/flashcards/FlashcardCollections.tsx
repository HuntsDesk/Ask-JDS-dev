import React, { useState, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { supabase } from '@/lib/supabase';
import { Plus, Search, BookOpen, Trash2, Filter, Library } from 'lucide-react';
import Card from './Card';
import EmptyState from './EmptyState';
import LoadingSpinner from './LoadingSpinner';
import ErrorMessage from './ErrorMessage';
import DeleteConfirmation from './DeleteConfirmation';
import useToast from '@/hooks/useFlashcardToast';
import Toast from './Toast';
import useFlashcardAuth from '@/hooks/useFlashcardAuth';

interface FlashcardCollection {
  id: string;
  title: string;
  description: string;
  created_at: string;
  card_count?: number;
  is_official?: boolean;
  subject: {
    id: string;
    name: string;
  };
  mastered_count: number;
}

interface Subject {
  id: string;
  name: string;
}

export default function FlashcardCollections() {
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const { toast, showToast, hideToast } = useToast();
  const { user } = useFlashcardAuth();
  
  const [collections, setCollections] = useState<FlashcardCollection[]>([]);
  const [subjects, setSubjects] = useState<Subject[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [collectionToDelete, setCollectionToDelete] = useState<FlashcardCollection | null>(null);
  
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedSubjectId, setSelectedSubjectId] = useState<string>('');

  useEffect(() => {
    Promise.all([
      loadCollections(),
      loadSubjects()
    ]).finally(() => {
      setLoading(false);
    });
    
    // Check if a subject filter was provided in the URL
    const subjectId = searchParams.get('subject');
    if (subjectId) {
      setSelectedSubjectId(subjectId);
    }
  }, [searchParams]);

  async function loadCollections() {
    try {
      let query = supabase
        .from('flashcard_collections')
        .select(`
          id,
          title,
          description,
          created_at,
          is_official,
          subject:subject_id(id, name)
        `)
        .order('created_at', { ascending: false });
      
      // Apply subject filter if selected
      const subjectId = searchParams.get('subject');
      if (subjectId) {
        query = query.eq('subject_id', subjectId);
      }
      
      const { data, error } = await query;
      
      if (error) throw error;
      
      // Get card counts and mastered counts for each collection
      const collectionsWithCounts = await Promise.all(
        (data || []).map(async (collection) => {
          // Get total card count
          const { count: totalCount, error: countError } = await supabase
            .from('flashcards')
            .select('*', { count: 'exact', head: true })
            .eq('collection_id', collection.id);
            
          if (countError) throw countError;
          
          // Get mastered card count
          const { count: masteredCount, error: masteredError } = await supabase
            .from('flashcards')
            .select('*', { count: 'exact', head: true })
            .eq('collection_id', collection.id)
            .eq('is_mastered', true);
            
          if (masteredError) throw masteredError;
          
          return {
            ...collection,
            card_count: totalCount || 0,
            mastered_count: masteredCount || 0
          };
        })
      );
      
      setCollections(collectionsWithCounts);
    } catch (err: any) {
      console.error('Error loading collections:', err);
      setError(err.message);
    }
  }

  async function loadSubjects() {
    try {
      const { data, error } = await supabase
        .from('subjects')
        .select('id, name')
        .order('name');
      
      if (error) throw error;
      
      setSubjects(data || []);
    } catch (err: any) {
      console.error('Error loading subjects:', err);
    }
  }

  async function handleDeleteCollection() {
    if (!collectionToDelete) return;
    
    try {
      // Delete flashcards first
      const { error: flashcardsError } = await supabase
        .from('flashcards')
        .delete()
        .eq('collection_id', collectionToDelete.id);
      
      if (flashcardsError) throw flashcardsError;
      
      // Then delete the collection
      const { error: collectionError } = await supabase
        .from('flashcard_collections')
        .delete()
        .eq('id', collectionToDelete.id);
      
      if (collectionError) throw collectionError;
      
      setCollections(collections.filter(c => c.id !== collectionToDelete.id));
      setCollectionToDelete(null);
      showToast('Collection deleted successfully', 'success');
    } catch (err: any) {
      console.error('Error deleting collection:', err);
      showToast(`Error: ${err.message}`, 'error');
    }
  }

  function handleSubjectFilter(subjectId: string) {
    if (subjectId === selectedSubjectId) {
      // Clear filter
      setSelectedSubjectId('');
      setSearchParams({});
    } else {
      // Apply filter
      setSelectedSubjectId(subjectId);
      setSearchParams({ subject: subjectId });
    }
  }

  function handleSearch(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    // This would be implemented with a proper search in a real app
    // For now, we'll just filter the collections client-side
  }

  // Filter collections based on search query
  const filteredCollections = collections.filter(collection => {
    const matchesSearch = searchQuery 
      ? collection.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
        (collection.description && collection.description.toLowerCase().includes(searchQuery.toLowerCase()))
      : true;
    
    return matchesSearch;
  });

  // Separate official and user collections
  const officialCollections = filteredCollections.filter(c => c.is_official);
  const userCollections = filteredCollections.filter(c => !c.is_official);

  if (loading) {
    return <LoadingSpinner />;
  }

  if (error) {
    return <ErrorMessage message={error} />;
  }

  const selectedSubject = subjects.find(s => s.id === selectedSubjectId);

  return (
    <div className="max-w-6xl mx-auto">
      <DeleteConfirmation
        isOpen={!!collectionToDelete}
        onClose={() => setCollectionToDelete(null)}
        onConfirm={handleDeleteCollection}
        title="Delete Collection"
        message="Are you sure you want to delete this collection? All flashcards in this collection will be permanently deleted."
        itemName={collectionToDelete?.title}
      />

      {toast && (
        <Toast 
          message={toast.message} 
          type={toast.type} 
          onClose={hideToast} 
        />
      )}

      <div className="flex justify-between items-center mb-8">
        <h1 className="text-3xl font-bold text-gray-900 dark:text-white">
          {selectedSubject ? `${selectedSubject.name} Collections` : 'My Collections'}
        </h1>
        <div className="relative">
          <select
            value={selectedSubjectId}
            onChange={(e) => handleSubjectFilter(e.target.value)}
            className="w-40 pl-10 pr-4 py-2 border border-gray-300 dark:border-gray-600 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500 dark:bg-gray-700 dark:text-white appearance-none"
          >
            <option value="">All Subjects</option>
            {subjects.map(subject => (
              <option key={subject.id} value={subject.id}>
                {subject.name}
              </option>
            ))}
          </select>
          <Filter className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400 dark:text-gray-300" />
        </div>
      </div>
      
      <div className="mb-8">
        {userCollections.length === 0 && officialCollections.length === 0 ? (
          <div className="text-center py-12 bg-white dark:bg-gray-800 rounded-lg shadow-sm">
            <Library className="h-16 w-16 text-gray-400 dark:text-gray-500 mx-auto mb-4" />
            <h3 className="text-xl font-semibold text-gray-600 dark:text-gray-300 mb-2">No collections found</h3>
            <p className="text-gray-500 dark:text-gray-400 mb-4">
              Create your first collection using the New Collection button in the navigation bar.
            </p>
          </div>
        ) : (
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
            {userCollections.map(collection => (
              <Card 
                key={collection.id}
                title={collection.title}
                description={collection.description}
                tag={collection.subject.name}
                count={collection.card_count || 0}
                masteredCount={collection.mastered_count || 0}
                link={`/flashcards/study/${collection.id}`}
                onDelete={() => setCollectionToDelete(collection)}
                collectionId={collection.id}
                isOfficial={false}
                subjectId={collection.subject.id}
              />
            ))}
            {officialCollections.map(collection => (
              <Card 
                key={collection.id}
                title={collection.title}
                description={collection.description}
                tag={collection.subject.name}
                count={collection.card_count || 0}
                masteredCount={collection.mastered_count || 0}
                link={`/flashcards/study/${collection.id}`}
                collectionId={collection.id}
                isOfficial={true}
                subjectId={collection.subject.id}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  );
} 