import React, { useState, useEffect } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { Save, ArrowLeft } from 'lucide-react';
import { supabase } from '../lib/supabase';

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
      } catch (err) {
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
      // Optionally, you could redirect back to the collection
      // navigate(`/edit/${id}`);
    } catch (err) {
      setError(err.message);
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center min-h-[50vh]">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-indigo-600"></div>
      </div>
    );
  }

  if (error || !collection) {
    return (
      <div className="max-w-3xl mx-auto">
        <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded">
          {error || 'Collection not found'}
        </div>
        <Link to="/sets" className="mt-4 inline-block text-indigo-600 hover:text-indigo-700">
          ← Back to Collections
        </Link>
      </div>
    );
  }

  return (
    <div className="max-w-3xl mx-auto">
      <div className="mb-8">
        <Link to={`/edit/${id}`} className="text-indigo-600 hover:text-indigo-700 flex items-center gap-2">
          <ArrowLeft className="h-5 w-5" />
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
                className="w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500"
                required
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Answer</label>
              <textarea
                value={answer}
                onChange={(e) => setAnswer(e.target.value)}
                className="w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500"
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
          <button
            type="submit"
            disabled={saving}
            className="flex items-center gap-2 bg-indigo-600 text-white px-6 py-2 rounded-md hover:bg-indigo-700 disabled:opacity-50"
          >
            <Save className="h-5 w-5" />
            {saving ? 'Saving...' : 'Save & Add Another'}
          </button>

          <Link
            to={`/edit/${id}`}
            className="text-gray-600 hover:text-gray-900"
          >
            Done Adding Cards
          </Link>
        </div>
      </form>
    </div>
  );
}