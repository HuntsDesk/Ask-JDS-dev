import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import { Library, Plus, BookOpen, PlusCircle, Edit, Trash2 } from 'lucide-react';
import DeleteConfirmation from '../components/DeleteConfirmation';

interface FlashcardCollection {
  id: string;
  title: string;
  description: string;
  created_at: string;
  is_official: boolean;
  subject_id: string;
  subject: {
    name: string;
  };
}

interface Subject {
  id: string;
  name: string;
}

export default function FlashcardCollections() {
  const navigate = useNavigate();
  const [collections, setCollections] = useState<FlashcardCollection[]>([]);
  const [subjects, setSubjects] = useState<Subject[]>([]);
  const [selectedSubject, setSelectedSubject] = useState<string>('all');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [collectionToDelete, setCollectionToDelete] = useState<FlashcardCollection | null>(null);

  useEffect(() => {
    loadData();
  }, []);

  async function loadData() {
    try {
      setLoading(true);
      // Load subjects
      const { data: subjectsData, error: subjectsError } = await supabase
        .from('subjects')
        .select('*')
        .order('name');

      if (subjectsError) throw subjectsError;
      setSubjects(subjectsData || []);

      // Load flashcard collections with subject information
      const { data: collectionsData, error: collectionsError } = await supabase
        .from('flashcard_collections')
        .select(`
          *,
          subject:subject_id (
            name
          )
        `)
        .order('is_official', { ascending: false })
        .order('created_at', { ascending: false });

      if (collectionsError) throw collectionsError;
      setCollections(collectionsData || []);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  const handleDeleteCollection = async () => {
    if (!collectionToDelete) return;
    
    try {
      const { error } = await supabase
        .from('flashcard_collections')
        .delete()
        .eq('id', collectionToDelete.id);

      if (error) throw error;
      
      // Update the collections list
      setCollections(collections.filter(c => c.id !== collectionToDelete.id));
      setCollectionToDelete(null);
    } catch (err) {
      setError(err.message);
    }
  };

  const filteredCollections = selectedSubject === 'all'
    ? collections
    : collections.filter(collection => collection.subject_id === selectedSubject);

  const handleSubjectClick = (subjectId: string) => {
    navigate(`/subject/${subjectId}`);
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center min-h-[50vh]">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-indigo-600"></div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded">
        Error loading flashcard collections: {error}
      </div>
    );
  }

  const officialCollections = filteredCollections.filter(c => c.is_official);
  const userCollections = filteredCollections.filter(c => !c.is_official);

  return (
    <div className="max-w-6xl mx-auto">
      <DeleteConfirmation
        isOpen={!!collectionToDelete}
        onClose={() => setCollectionToDelete(null)}
        onConfirm={handleDeleteCollection}
        title="Delete Collection"
        message="Are you sure you want to delete this collection? All flashcards in this collection will also be deleted."
        itemName={collectionToDelete?.title}
      />

      <div className="flex justify-between items-center mb-8">
        <div className="flex items-center gap-4">
          <h1 className="text-3xl font-bold text-gray-900">Flashcard Collections</h1>
          <select
            value={selectedSubject}
            onChange={(e) => setSelectedSubject(e.target.value)}
            className="rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500"
          >
            <option value="all">All Subjects</option>
            {subjects.map((subject) => (
              <option key={subject.id} value={subject.id}>
                {subject.name}
              </option>
            ))}
          </select>
        </div>
        <div>
          <Link
            to="/create"
            className="flex items-center gap-2 bg-indigo-600 text-white px-4 py-2 rounded-md hover:bg-indigo-700"
          >
            <Plus className="h-5 w-5" />
            Create New Collection
          </Link>
        </div>
      </div>

      {officialCollections.length > 0 && (
        <div className="mb-12">
          <h2 className="text-2xl font-semibold text-gray-900 mb-6">Official Collections</h2>
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
            {officialCollections.map((collection) => (
              <CollectionCard 
                key={collection.id} 
                collection={collection} 
                onSubjectClick={handleSubjectClick}
                onDeleteClick={() => {}} // No delete for official collections
              />
            ))}
          </div>
        </div>
      )}

      <div>
        <h2 className="text-2xl font-semibold text-gray-900 mb-6">My Collections</h2>
        {userCollections.length === 0 ? (
          <div className="text-center py-12 bg-white rounded-lg shadow-sm">
            <Library className="h-16 w-16 text-gray-400 mx-auto mb-4" />
            <h3 className="text-xl font-semibold text-gray-600 mb-2">No collections yet</h3>
            <p className="text-gray-500 mb-4">
              Create your first collection to start studying
            </p>
            <Link
              to="/create"
              className="inline-flex items-center gap-2 bg-indigo-600 text-white px-6 py-2 rounded-md hover:bg-indigo-700"
            >
              <Plus className="h-5 w-5" />
              Create Collection
            </Link>
          </div>
        ) : (
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
            {userCollections.map((collection) => (
              <CollectionCard 
                key={collection.id} 
                collection={collection} 
                onSubjectClick={handleSubjectClick}
                onDeleteClick={() => setCollectionToDelete(collection)}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

function CollectionCard({ collection, onSubjectClick, onDeleteClick }: { 
  collection: FlashcardCollection, 
  onSubjectClick: (subjectId: string) => void,
  onDeleteClick: () => void
}) {
  return (
    <div className="bg-white rounded-lg shadow-md overflow-hidden">
      <div className="p-6">
        <div className="flex items-center gap-2 mb-2">
          <BookOpen className="h-5 w-5 text-indigo-600" />
          <button 
            className="text-sm font-medium text-indigo-600 hover:text-indigo-800 hover:underline"
            onClick={() => onSubjectClick(collection.subject_id)}
          >
            {collection.subject.name}
          </button>
        </div>
        <Link to={`/study/${collection.id}`}>
          <h3 className="text-xl font-semibold text-gray-900 mb-2 hover:text-indigo-600 transition-colors">{collection.title}</h3>
        </Link>
        <p className="text-gray-600 mb-4 line-clamp-2">{collection.description}</p>
        <div className="flex justify-between items-center">
          {!collection.is_official && (
            <div className="flex gap-2">
              <Link
                to={`/add-card/${collection.id}`}
                className="text-gray-600 hover:text-indigo-600"
                title="Add Card"
              >
                <PlusCircle className="h-5 w-5" />
              </Link>
              <Link
                to={`/edit/${collection.id}`}
                className="text-gray-600 hover:text-indigo-600"
                title="Edit Collection"
              >
                <Edit className="h-5 w-5" />
              </Link>
              <button
                onClick={onDeleteClick}
                className="text-gray-600 hover:text-red-600"
                title="Delete Collection"
              >
                <Trash2 className="h-5 w-5" />
              </button>
            </div>
          )}
          <Link
            to={`/study/${collection.id}`}
            className="bg-indigo-100 text-indigo-700 px-4 py-2 rounded-md hover:bg-indigo-200"
          >
            Study Now
          </Link>
        </div>
      </div>
    </div>
  );
}