import React, { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { ArrowRight, Library, Plus, PlusCircle } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import LoadingSpinner from '../LoadingSpinner';
import ErrorMessage from '../ErrorMessage';

interface Collection {
  id: string;
  title: string;
  subject: {
    name: string;
  };
}

export default function CreateFlashcardSelect() {
  const navigate = useNavigate();
  const [collections, setCollections] = useState<Collection[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedCollectionId, setSelectedCollectionId] = useState<string>('');

  useEffect(() => {
    async function loadCollections() {
      try {
        setLoading(true);
        const { data, error } = await supabase
          .from('flashcard_collections')
          .select(`
            id,
            title,
            subject:subject_id (
              name
            )
          `)
          .order('title');

        if (error) throw error;
        setCollections(data || []);
      } catch (err: any) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
    }

    loadCollections();
  }, []);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (selectedCollectionId) {
      navigate(`/flashcards/add-card/${selectedCollectionId}`);
    }
  };

  if (loading) {
    return <LoadingSpinner />;
  }

  if (error) {
    return <ErrorMessage message={error} />;
  }

  if (collections.length === 0) {
    return (
      <div className="max-w-3xl mx-auto text-center py-12">
        <h1 className="text-3xl font-bold text-gray-900 mb-6">Create a Flashcard</h1>
        <div className="bg-white p-8 rounded-lg shadow-md">
          <Library className="h-16 w-16 text-gray-400 mx-auto mb-4" />
          <h2 className="text-xl font-semibold text-gray-700 mb-4">No Collections Available</h2>
          <p className="text-gray-600 mb-6">
            You need to create a collection before you can add flashcards.
          </p>
          <Link
            to="/flashcards/collections"
            className="inline-flex items-center gap-2 bg-[#F37022] text-white px-6 py-2 rounded-md hover:bg-[#E36012]"
          >
            <Plus className="h-4 w-4" />
            Create New Collection
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-3xl mx-auto">
      <h1 className="text-3xl font-bold text-gray-900 mb-6">Create a Flashcard</h1>
      
      <div className="bg-white p-6 rounded-lg shadow-md">
        <form onSubmit={handleSubmit}>
          <div className="mb-6">
            <label htmlFor="collection" className="block text-sm font-medium text-gray-700 mb-2">
              Select a Collection
            </label>
            <p className="text-sm text-gray-600 mb-4">
              Choose which collection you want to add a new flashcard to.
            </p>
            <select
              id="collection"
              value={selectedCollectionId}
              onChange={(e) => setSelectedCollectionId(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-[#F37022] focus:border-[#F37022]"
              required
            >
              <option value="">Select a collection...</option>
              {collections.map(collection => (
                <option key={collection.id} value={collection.id}>
                  {collection.title} ({collection.subject.name})
                </option>
              ))}
            </select>
          </div>
          
          <div className="flex justify-end">
            <button
              type="submit"
              disabled={!selectedCollectionId}
              className="flex items-center gap-2 bg-[#F37022] text-white px-6 py-2 rounded-md hover:bg-[#E36012] disabled:opacity-50"
            >
              <PlusCircle className="h-5 w-5" />
              Create Flashcard
            </button>
          </div>
        </form>
      </div>
    </div>
  );
} 