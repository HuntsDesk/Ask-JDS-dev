import React, { useState, useEffect } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { Save, ArrowLeft, ExternalLink, ChevronLeft } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import LoadingSpinner from '../LoadingSpinner';
import ErrorMessage from '../ErrorMessage';
import Toast from '../Toast';
import useToast from '@/hooks/useFlashcardToast';

interface Collection {
  id: string;
  title: string;
  subject: {
    name: string;
  };
}

export default function AddCard() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { toast, showToast, hideToast } = useToast();
  const [collection, setCollection] = useState<Collection | null>(null);
  const [question, setQuestion] = useState('');
  const [answer, setAnswer] = useState('');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function loadCollection() {
      try {
        const { data, error } = await supabase
          .from('flashcard_collections')
          .select(`
            *,
            subject:subject_id (
              name
            )
          `)
          .eq('id', id)
          .single();

        if (error) throw error;
        setCollection(data);
      } catch (err: any) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
    }

    loadCollection();
  }, [id]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setError(null);

    try {
      const { error } = await supabase
        .from('flashcards')
        .insert([
          {
            collection_id: id,
            question,
            answer,
          },
        ]);

      if (error) throw error;

      // Clear form and show success message
      setQuestion('');
      setAnswer('');
      showToast('Card added successfully', 'success');
    } catch (err: any) {
      setError(err.message);
      showToast(`Error: ${err.message}`, 'error');
    } finally {
      setSaving(false);
    }
  };

  const handleSaveAndExit = async () => {
    // Don't save if fields are empty
    if (!question.trim() || !answer.trim()) {
      navigate(`/flashcards/study/${id}`);
      return;
    }
    
    setSaving(true);
    setError(null);

    try {
      const { error } = await supabase
        .from('flashcards')
        .insert([
          {
            collection_id: id,
            question,
            answer,
          },
        ]);

      if (error) throw error;
      
      showToast('Card added successfully', 'success');
      
      // Navigate to study mode after successful save
      navigate(`/flashcards/study/${id}`);
    } catch (err: any) {
      setError(err.message);
      showToast(`Error: ${err.message}`, 'error');
      setSaving(false);
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
      {toast && (
        <Toast 
          message={toast.message} 
          type={toast.type} 
          onClose={hideToast} 
        />
      )}
      
      <div className="mb-8">
        <Link to={`/flashcards/edit/${id}`} className="text-[#F37022] hover:text-[#E36012] flex items-center gap-2">
          <ChevronLeft className="h-5 w-5" />
          Back to Collection
        </Link>
        <h1 className="text-3xl font-bold text-gray-900 mt-4">Add Card to Collection</h1>
        <p className="text-gray-600">
          {collection.title} • {collection.subject.name}
        </p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        <div className="bg-white p-6 rounded-lg shadow-md">
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Question</label>
              <input
                type="text"
                value={question}
                onChange={(e) => setQuestion(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-[#F37022] focus:border-[#F37022]"
                required
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Answer</label>
              <textarea
                value={answer}
                onChange={(e) => setAnswer(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-[#F37022] focus:border-[#F37022]"
                rows={5}
                required
              />
              <p className="text-xs text-gray-500 mt-1">
                You can provide a detailed explanation for this answer.
              </p>
            </div>
          </div>
        </div>

        <div className="flex justify-between items-center">
          <div className="flex gap-3">
            <button
              type="submit"
              disabled={saving}
              className="flex items-center gap-2 bg-[#F37022] text-white px-6 py-2 rounded-md hover:bg-[#E36012] disabled:opacity-50"
            >
              <Save className="h-5 w-5" />
              {saving ? 'Saving...' : 'Save & Add Another'}
            </button>
            
            <button
              type="button"
              onClick={handleSaveAndExit}
              disabled={saving}
              className="flex items-center gap-2 bg-gray-100 text-gray-800 px-6 py-2 rounded-md hover:bg-gray-200 disabled:opacity-50"
            >
              <ExternalLink className="h-5 w-5" />
              Save & Exit
            </button>
          </div>
          
          {/* Extra spacing element for alignment */}
          <div></div>
        </div>
      </form>
    </div>
  );
} 