import React, { useState, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { Plus, Trash2, Save } from 'lucide-react';
import { supabase } from '../lib/supabase';
import LoadingSpinner from '../components/LoadingSpinner';
import ErrorMessage from '../components/ErrorMessage';
import useToast from '../hooks/useToast';
import Toast from '../components/Toast';

interface Flashcard {
  question: string;
  answer: string;
}

interface Subject {
  id: string;
  name: string;
  description: string;
}

export default function CreateSet() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const preselectedSubjectId = searchParams.get('subject');
  const { toast, showToast, hideToast } = useToast();
  
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [subjectId, setSubjectId] = useState('');
  const [subjects, setSubjects] = useState<Subject[]>([]);
  const [cards, setCards] = useState<Flashcard[]>([{ question: '', answer: '' }]);
  const [loading, setLoading] = useState(false);
  const [initialLoading, setInitialLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function loadSubjects() {
      try {
        setInitialLoading(true);
        const { data, error } = await supabase
          .from('subjects')
          .select('*')
          .order('name');
        
        if (error) {
          setError(error.message);
        } else {
          setSubjects(data || []);
          
          // If we have a preselected subject ID from URL params, use it
          if (preselectedSubjectId && data) {
            const subjectExists = data.some(subject => subject.id === preselectedSubjectId);
            if (subjectExists) {
              setSubjectId(preselectedSubjectId);
            } else if (data.length > 0) {
              setSubjectId(data[0].id);
            }
          } else if (data && data.length > 0) {
            setSubjectId(data[0].id);
          }
        }
      } catch (err) {
        setError(err.message);
      } finally {
        setInitialLoading(false);
      }
    }

    loadSubjects();
  }, [preselectedSubjectId]);

  const addCard = () => {
    setCards([...cards, { question: '', answer: '' }]);
  };

  const removeCard = (index: number) => {
    setCards(cards.filter((_, i) => i !== index));
  };

  const updateCard = (index: number, field: keyof Flashcard, value: string) => {
    const newCards = [...cards];
    newCards[index] = { ...newCards[index], [field]: value };
    setCards(newCards);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      // Validate inputs
      if (!title.trim()) {
        throw new Error("Title is required");
      }
      
      if (!subjectId) {
        throw new Error("Subject is required");
      }
      
      // Validate cards
      const validCards = cards.filter(card => card.question.trim() && card.answer.trim());
      if (validCards.length === 0) {
        throw new Error("At least one card with question and answer is required");
      }

      // Create the flashcard collection
      const { data: collectionData, error: collectionError } = await supabase
        .from('flashcard_collections')
        .insert([
          {
            title,
            description,
            subject_id: subjectId,
          },
        ])
        .select()
        .single();

      if (collectionError) throw collectionError;

      // Create the flashcards
      const { error: cardsError } = await supabase.from('flashcards').insert(
        validCards.map((card) => ({
          collection_id: collectionData.id,
          question: card.question,
          answer: card.answer,
        }))
      );

      if (cardsError) throw cardsError;

      showToast('Collection created successfully!', 'success');
      setTimeout(() => {
        navigate('/sets');
      }, 1500);
    } catch (err) {
      setError(err.message);
      showToast(`Error: ${err.message}`, 'error');
    } finally {
      setLoading(false);
    }
  };

  if (initialLoading) {
    return <LoadingSpinner />;
  }

  if (error && !subjects.length) {
    return (
      <ErrorMessage 
        message={`Error loading subjects: ${error}`} 
        backLink={{
          to: "/sets",
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
      
      <h1 className="text-3xl font-bold text-gray-900 mb-8">Create New Flashcard Collection</h1>

      {error && (
        <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded mb-4">
          {error}
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-6">
        <div className="bg-white p-6 rounded-lg shadow-md">
          <div className="mb-4">
            <label htmlFor="subject" className="block text-sm font-medium text-gray-700 mb-1">
              Subject Area
            </label>
            <select
              id="subject"
              value={subjectId}
              onChange={(e) => setSubjectId(e.target.value)}
              className="w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500"
              required
            >
              <option value="" disabled>Select a subject</option>
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
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              className="w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500"
              required
            />
          </div>

          <div className="mb-4">
            <label htmlFor="description" className="block text-sm font-medium text-gray-700 mb-1">
              Description
            </label>
            <textarea
              id="description"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              className="w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500"
              rows={3}
            />
          </div>
        </div>

        <div className="space-y-4">
          {cards.map((card, index) => (
            <div key={index} className="bg-white p-6 rounded-lg shadow-md">
              <div className="flex justify-between items-center mb-4">
                <h3 className="text-lg font-medium text-gray-900">Card {index + 1}</h3>
                {cards.length > 1 && (
                  <button
                    type="button"
                    onClick={() => removeCard(index)}
                    className="text-red-600 hover:text-red-700"
                  >
                    <Trash2 className="h-5 w-5" />
                  </button>
                )}
              </div>

              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Question</label>
                  <input
                    type="text"
                    value={card.question}
                    onChange={(e) => updateCard(index, 'question', e.target.value)}
                    className="w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500"
                    required
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Answer</label>
                  <textarea
                    value={card.answer}
                    onChange={(e) => updateCard(index, 'answer', e.target.value)}
                    className="w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500"
                    rows={4}
                    required
                  />
                  <p className="text-xs text-gray-500 mt-1">
                    You can provide a detailed explanation for this answer.
                  </p>
                </div>
              </div>
            </div>
          ))}
        </div>

        <div className="flex justify-between">
          <button
            type="button"
            onClick={addCard}
            className="flex items-center gap-2 text-indigo-600 hover:text-indigo-700"
          >
            <Plus className="h-5 w-5" />
            Add Card
          </button>

          <button
            type="submit"
            disabled={loading}
            className="flex items-center gap-2 bg-indigo-600 text-white px-6 py-2 rounded-md hover:bg-indigo-700 disabled:opacity-50"
          >
            <Save className="h-5 w-5" />
            {loading ? 'Saving...' : 'Save Collection'}
          </button>
        </div>
      </form>
    </div>
  );
}