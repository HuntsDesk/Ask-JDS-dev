import React, { useState, useEffect } from 'react';
import { useNavigate, useSearchParams, Link } from 'react-router-dom';
import { supabase } from '@/lib/supabase';
import { Plus, Search, BookOpen, Trash2, Filter, Library, Book } from 'lucide-react';
import Card from './Card';
import EmptyState from './EmptyState';
import LoadingSpinner from './LoadingSpinner';
import ErrorMessage from './ErrorMessage';
import DeleteConfirmation from './DeleteConfirmation';
import useToast from '@/hooks/useFlashcardToast';
import Toast from './Toast';
import useFlashcardAuth from '@/hooks/useFlashcardAuth';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';

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
  const [filter, setFilter] = useState<'all' | 'official' | 'my'>('all');

  useEffect(() => {
    Promise.all([
      loadCollections(),
      loadSubjects()
    ]).then(() => {
      // Check if there's a filter in the URL
      const filterParam = searchParams.get('filter');
      if (filterParam && ['all', 'official', 'my'].includes(filterParam)) {
        setFilter(filterParam as 'all' | 'official' | 'my');
      }
    });
  }, []);

  async function loadCollections() {
    try {
      setLoading(true);
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
      
      // Get card counts and mastered counts for each collection - using Promise.all
      const collectionsWithCounts = await Promise.all(
        (data || []).map(async (collection) => {
          try {
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
            
            // Ensure subject is properly formatted as an object, not an array
            const formattedSubject = Array.isArray(collection.subject) 
              ? { id: collection.subject[0]?.id || '', name: collection.subject[0]?.name || '' }
              : collection.subject;
            
            return {
              ...collection,
              card_count: totalCount || 0,
              mastered_count: masteredCount || 0,
              subject: formattedSubject
            } as FlashcardCollection;
          } catch (err) {
            console.error('Error processing collection:', err);
            return {
              ...collection,
              card_count: 0,
              mastered_count: 0,
              subject: Array.isArray(collection.subject) 
                ? { id: collection.subject[0]?.id || '', name: collection.subject[0]?.name || '' }
                : collection.subject
            } as FlashcardCollection;
          }
        })
      );
      
      setCollections(collectionsWithCounts);
    } catch (err: any) {
      console.error('Error loading collections:', err);
      setError(err.message);
    } finally {
      setLoading(false);
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

  function handleFilterChange(value: string) {
    const newFilter = value as 'all' | 'official' | 'my';
    setFilter(newFilter);
    
    // Update URL params
    searchParams.set('filter', newFilter);
    setSearchParams(searchParams);
  }

  // Filter collections based on search query and filter type
  const filteredCollections = collections.filter(collection => {
    const matchesSearch = searchQuery 
      ? collection.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
        (collection.description && collection.description.toLowerCase().includes(searchQuery.toLowerCase()))
      : true;
    
    // Apply filter type
    const matchesFilter = 
      filter === 'all' ? true :
      filter === 'official' ? collection.is_official :
      filter === 'my' ? !collection.is_official :
      true;
    
    return matchesSearch && matchesFilter;
  });

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

      <div className="flex flex-col space-y-4 mb-6">
        <div className="flex justify-between items-center">
          <div className="flex items-center gap-4">
            <h1 className="text-3xl font-bold text-gray-900 dark:text-white">
              {selectedSubject ? `${selectedSubject.name} Collections` : 'Collections'}
            </h1>
            
            {/* Subject filter moved to the left of the slider */}
            <div className="relative">
              <select
                className="pl-8 pr-4 py-2 border rounded-md bg-white"
                value={selectedSubjectId}
                onChange={(e) => handleSubjectFilter(e.target.value)}
              >
                <option value="">All Subjects</option>
                {subjects.map((subject) => (
                  <option key={subject.id} value={subject.id}>
                    {subject.name}
                  </option>
                ))}
              </select>
              <Book className="absolute left-2 top-1/2 transform -translate-y-1/2 text-gray-500 h-5 w-5" />
            </div>
          </div>
          
          {/* Filter tabs */}
          <div>
            <Tabs value={filter} onValueChange={handleFilterChange}>
              <TabsList className="grid grid-cols-3" style={{ backgroundColor: '#f8f8f8' }}>
                <TabsTrigger 
                  value="all"
                  className="data-[state=active]:bg-[#F37022] data-[state=active]:text-white"
                >
                  All
                </TabsTrigger>
                <TabsTrigger 
                  value="official"
                  className="data-[state=active]:bg-[#F37022] data-[state=active]:text-white"
                >
                  Premium
                </TabsTrigger>
                <TabsTrigger 
                  value="my"
                  className="data-[state=active]:bg-[#F37022] data-[state=active]:text-white"
                >
                  My Collections
                </TabsTrigger>
              </TabsList>
            </Tabs>
          </div>
        </div>
      </div>

      {/* Collections grid */}
      <div className="mb-8">
        {filteredCollections.length === 0 ? (
          <div className="text-center py-12 bg-white dark:bg-gray-800 rounded-lg shadow-sm">
            <Library className="h-16 w-16 text-gray-400 dark:text-gray-500 mx-auto mb-4" />
            <h3 className="text-xl font-semibold text-gray-600 dark:text-gray-300 mb-2">No collections found</h3>
            <p className="text-gray-500 dark:text-gray-400 mb-4">
              {filter === 'my' 
                ? "You haven't created any collections yet. Create your first collection using the New Collection button."
                : filter === 'official'
                ? "No official collections available for this filter."
                : "No collections found. Try adjusting your filters or create a new collection."}
            </p>
          </div>
        ) : (
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredCollections.map(collection => (
              <Card 
                key={collection.id}
                title={collection.title}
                description={collection.description}
                tag={collection.subject.name}
                count={collection.card_count || 0}
                masteredCount={collection.mastered_count || 0}
                link={`/flashcards/study/${collection.id}`}
                onDelete={!collection.is_official ? () => setCollectionToDelete(collection) : undefined}
                collectionId={collection.id}
                isOfficial={collection.is_official || false}
                subjectId={collection.subject.id}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  );
} 