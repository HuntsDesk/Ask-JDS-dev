import React, { useEffect, useState } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { Save, ArrowLeft, Trash2, PlusCircle, ChevronLeft } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import DeleteConfirmation from '../DeleteConfirmation';
import Toast from '../Toast';
import useToast from '@/hooks/useFlashcardToast';
import LoadingSpinner from '../LoadingSpinner';
import ErrorMessage from '../ErrorMessage';

interface Collection {
  id: string;
  title: string;
  description: string;
  subject_id: string;
}

interface Subject {
  id: string;
  name: string;
}

export default function EditCollection() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { toast, showToast, hideToast } = useToast();
  const [collection, setCollection] = useState<Collection | null>(null);
  const [originalCollection, setOriginalCollection] = useState<Collection | null>(null);
  const [subjects, setSubjects] = useState<Subject[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [cardCount, setCardCount] = useState(0);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);

  useEffect(() => {
    async function loadData() {
      try {
        // Load collection details
        const { data: collectionData, error: collectionError } = await supabase
          .from('flashcard_collections')
          .select('*')
          .eq('id', id)
          .single();

        if (collectionError) throw collectionError;
        setCollection(collectionData);
        setOriginalCollection(JSON.parse(JSON.stringify(collectionData))); // Deep copy

        // Load subjects
        const { data: subjectsData, error: subjectsError } = await supabase
          .from('subjects')
          .select('*')
          .order('name');

        if (subjectsError) throw subjectsError;
        setSubjects(subjectsData || []);

        // Get card count
        const { count, error: countError } = await supabase
          .from('flashcards')
          .select('*', { count: 'exact', head: true })
          .eq('collection_id', id);

        if (countError) throw countError;
        setCardCount(count || 0);
      } catch (err: any) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
    }

    loadData();
  }, [id]);

  // Check for unsaved changes
  useEffect(() => {
    if (collection && originalCollection) {
      const isDifferent = 
        collection.title !== originalCollection.title ||
        collection.description !== originalCollection.description ||
        collection.subject_id !== originalCollection.subject_id;
      
      setHasUnsavedChanges(isDifferent);
    }
  }, [collection, originalCollection]);

  const saveChanges = async () => {
    if (!collection || !hasUnsavedChanges) return true;

    setSaving(true);
    setError(null);

    try {
      // Update collection details
      const { error: updateError } = await supabase
        .from('flashcard_collections')
        .update({
          title: collection.title,
          description: collection.description,
          subject_id: collection.subject_id,
        })
        .eq('id', id);

      if (updateError) throw updateError;
      
      // Update the original collection to match the current state
      setOriginalCollection(JSON.parse(JSON.stringify(collection)));
      setHasUnsavedChanges(false);
      showToast('Changes saved successfully', 'success');
      
      return true;
    } catch (err: any) {
      setError(err.message);
      showToast(`Error: ${err.message}`, 'error');
      return false;
    } finally {
      setSaving(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    await saveChanges();
  };

  const handleDeleteCollection = async () => {
    try {
      const { error } = await supabase
        .from('flashcard_collections')
        .delete()
        .eq('id', id);

      if (error) throw error;
      navigate('/flashcards/collections');
    } catch (err: any) {
      setError(err.message);
      showToast(`Error: ${err.message}`, 'error');
    }
  };

  const handleNavigation = async (path: string) => {
    if (hasUnsavedChanges) {
      const confirmed = window.confirm('You have unsaved changes. Save before continuing?');
      if (confirmed) {
        const saved = await saveChanges();
        if (saved) {
          navigate(path);
        }
      } else {
        navigate(path);
      }
    } else {
      navigate(path);
    }
  };

  if (loading) {
    return <LoadingSpinner />;
  }

  if (error || !collection) {
    return (
      <ErrorMessage 
        message={error || 'Collection not found'} 
        backLink={{
          to: "/flashcards/collections",
          label: "Back to Collections"
        }}
      />
    );
  }

  return (
    <div className="max-w-3xl mx-auto">
      <DeleteConfirmation
        isOpen={showDeleteConfirm}
        onClose={() => setShowDeleteConfirm(false)}
        onConfirm={handleDeleteCollection}
        title="Delete Collection"
        message="Are you sure you want to delete this collection? All flashcards in this collection will also be deleted."
        itemName={collection.title}
      />

      {toast && (
        <Toast 
          message={toast.message} 
          type={toast.type} 
          onClose={hideToast} 
        />
      )}

      <div className="flex items-center justify-between mb-8">
        <div>
          <Link to="/flashcards/collections" className="text-[#F37022] hover:text-[#E36012] flex items-center gap-2">
            <ChevronLeft className="h-5 w-5" />
            Back to Collections
          </Link>
          <h1 className="text-3xl font-bold text-gray-900 mt-4">Edit Collection</h1>
        </div>
        <button
          onClick={() => setShowDeleteConfirm(true)}
          className="flex items-center gap-2 bg-red-600 text-white px-4 py-2 rounded-md hover:bg-red-700"
        >
          <Trash2 className="h-5 w-5" />
          Delete Collection
        </button>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        <div className="bg-white p-6 rounded-lg shadow-md">
          <div className="mb-4">
            <label htmlFor="subject" className="block text-sm font-medium text-gray-700 mb-1">
              Subject Area
            </label>
            <select
              id="subject"
              value={collection.subject_id}
              onChange={(e) => setCollection({ ...collection, subject_id: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-[#F37022] focus:border-[#F37022]"
              required
            >
              {subjects.map((subject) => (
                <option key={subject.id} value={subject.id}>
                  {subject.name}
                </option>
              ))}
            </select>
          </div>

          <div className="mb-4">
            <label htmlFor="title" className="block text-sm font-medium text-gray-700 mb-1">
              Title
            </label>
            <input
              type="text"
              id="title"
              value={collection.title}
              onChange={(e) => setCollection({ ...collection, title: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-[#F37022] focus:border-[#F37022]"
              required
            />
          </div>

          <div className="mb-4">
            <label htmlFor="description" className="block text-sm font-medium text-gray-700 mb-1">
              Description
            </label>
            <textarea
              id="description"
              value={collection.description}
              onChange={(e) => setCollection({ ...collection, description: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-[#F37022] focus:border-[#F37022]"
              rows={3}
            />
          </div>
        </div>

        <div className="bg-white p-6 rounded-lg shadow-md">
          <div className="flex justify-between items-center mb-4">
            <h2 className="text-xl font-semibold text-gray-900">Flashcards</h2>
            <span className="text-gray-600">{cardCount} cards</span>
          </div>
          
          <div className="space-y-4">
            <div className="flex flex-col sm:flex-row gap-4">
              <button
                type="button"
                onClick={() => handleNavigation(`/flashcards/add-card/${id}`)}
                className="flex items-center justify-center gap-2 bg-[#F37022] text-white px-4 py-2 rounded-md hover:bg-[#E36012] flex-1"
              >
                <PlusCircle className="h-5 w-5" />
                Add New Card
              </button>
              
              <button
                type="button"
                onClick={() => handleNavigation(`/flashcards/manage-cards/${id}`)}
                className="flex items-center justify-center gap-2 bg-white border border-gray-300 text-gray-700 px-4 py-2 rounded-md hover:bg-gray-50 flex-1"
              >
                Manage Collection Cards
              </button>
            </div>
          </div>
        </div>

        <div className="flex justify-end">
          <button
            type="submit"
            disabled={saving || !hasUnsavedChanges}
            className={`flex items-center gap-2 px-6 py-2 rounded-md ${
              hasUnsavedChanges 
                ? 'bg-[#F37022] text-white hover:bg-[#E36012]' 
                : 'bg-gray-300 text-gray-500 cursor-not-allowed'
            }`}
          >
            <Save className="h-5 w-5" />
            {saving ? 'Saving...' : 'Save & Close'}
          </button>
        </div>
      </form>
    </div>
  );
} 