import React, { useState, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { Plus, Trash2, Save } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import LoadingSpinner from '../LoadingSpinner';
import ErrorMessage from '../ErrorMessage';
import useToast from '@/hooks/useFlashcardToast';
import Toast from '../Toast';

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
  const initialSubjectId = searchParams.get('subject');
  
  const { toast, showToast, hideToast } = useToast();
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [subjectId, setSubjectId] = useState(initialSubjectId || '');
  const [newSubjectName, setNewSubjectName] = useState('');
  const [newSubjectDescription, setNewSubjectDescription] = useState('');
  const [showNewSubjectForm, setShowNewSubjectForm] = useState(false);
  const [cards, setCards] = useState<Flashcard[]>([
    { question: '', answer: '' }
  ]);
  const [subjects, setSubjects] = useState<Subject[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    loadSubjects();
  }, []);

  async function loadSubjects() {
    try {
      setLoading(true);
      
      const { data, error } = await supabase
        .from('subjects')
        .select('*')
        .order('name');
      
      if (error) throw error;
      
      setSubjects(data || []);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  const toggleNewSubjectForm = () => {
    setShowNewSubjectForm(!showNewSubjectForm);
    if (!showNewSubjectForm) {
      setSubjectId('');
    } else {
      setNewSubjectName('');
      setNewSubjectDescription('');
    }
  };

  const validateForm = () => {
    if (!title.trim()) return 'Please enter a title for your flashcard set';
    if (!subjectId && !newSubjectName) return 'Please select or create a subject';
    if (cards.length === 0) return 'Please add at least one flashcard';
    
    for (const [index, card] of cards.entries()) {
      if (!card.question.trim()) return `Card ${index + 1} is missing a question`;
      if (!card.answer.trim()) return `Card ${index + 1} is missing an answer`;
    }
    
    return null;
  };

  const addCard = () => {
    setCards([...cards, { question: '', answer: '' }]);
  };

  const removeCard = (index: number) => {
    if (cards.length > 1) {
      setCards(cards.filter((_, i) => i !== index));
    }
  };

  const updateCard = (index: number, field: keyof Flashcard, value: string) => {
    const newCards = [...cards];
    newCards[index][field] = value;
    setCards(newCards);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    const validationError = validateForm();
    if (validationError) {
      showToast(validationError, 'error');
      return;
    }
    
    try {
      setSaving(true);
      
      let finalSubjectId = subjectId;
      
      // If creating a new subject
      if (!subjectId && newSubjectName) {
        const { data: newSubject, error: subjectError } = await supabase
          .from('subjects')
          .insert([{ 
            name: newSubjectName, 
            description: newSubjectDescription,
            is_official: false
          }])
          .select()
          .single();
        
        if (subjectError) throw subjectError;
        finalSubjectId = newSubject.id;
      }
      
      // Create the flashcard collection
      const { data: collection, error: collectionError } = await supabase
        .from('flashcard_collections')
        .insert([{
          title,
          description,
          subject_id: finalSubjectId,
          is_official: false
        }])
        .select()
        .single();
      
      if (collectionError) throw collectionError;
      
      // Add the flashcards
      const flashcardsToInsert = cards.map((card, index) => ({
        question: card.question,
        answer: card.answer,
        collection_id: collection.id,
        position: index
      }));
      
      const { error: cardsError } = await supabase
        .from('flashcards')
        .insert(flashcardsToInsert);
      
      if (cardsError) throw cardsError;
      
      showToast('Flashcard set created successfully!', 'success');
      navigate(`/flashcards/study/${collection.id}`);
      
    } catch (err) {
      setError(err.message);
      showToast(`Error: ${err.message}`, 'error');
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return <LoadingSpinner />;
  }

  return (
    <div className="max-w-3xl mx-auto">
      {/* Toast notification */}
      {toast && (
        <Toast 
          message={toast.message} 
          type={toast.type} 
          onClose={hideToast} 
        />
      )}
      
      {error && <ErrorMessage message={error} />}
      
      <h1 className="text-3xl font-bold text-gray-900 mb-6">Create Flashcard Set</h1>
      
      <form onSubmit={handleSubmit} className="bg-white rounded-lg shadow-md overflow-hidden mb-8">
        <div className="p-6">
          <div className="mb-6">
            <label htmlFor="title" className="block text-sm font-medium text-gray-700 mb-1">
              Set Title*
            </label>
            <input
              type="text"
              id="title"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-indigo-500 focus:border-indigo-500"
              placeholder="e.g. Biology Midterm"
              required
            />
          </div>
          
          <div className="mb-6">
            <label htmlFor="description" className="block text-sm font-medium text-gray-700 mb-1">
              Description
            </label>
            <textarea
              id="description"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-indigo-500 focus:border-indigo-500"
              placeholder="Optional description of this flashcard set"
              rows={3}
            />
          </div>
          
          <div className="mb-8">
            <div className="flex justify-between items-center mb-1">
              <label htmlFor="subject" className="block text-sm font-medium text-gray-700">
                Subject*
              </label>
              <button
                type="button"
                onClick={toggleNewSubjectForm}
                className="text-sm text-indigo-600 hover:text-indigo-800"
              >
                {showNewSubjectForm ? 'Select Existing Subject' : 'Create New Subject'}
              </button>
            </div>
            
            {showNewSubjectForm ? (
              <div className="space-y-4">
                <div>
                  <input
                    type="text"
                    value={newSubjectName}
                    onChange={(e) => setNewSubjectName(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-indigo-500 focus:border-indigo-500"
                    placeholder="Subject Name"
                    required
                  />
                </div>
                <div>
                  <textarea
                    value={newSubjectDescription}
                    onChange={(e) => setNewSubjectDescription(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-indigo-500 focus:border-indigo-500"
                    placeholder="Subject Description (optional)"
                    rows={2}
                  />
                </div>
              </div>
            ) : (
              <select
                id="subject"
                value={subjectId}
                onChange={(e) => setSubjectId(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-indigo-500 focus:border-indigo-500"
                required={!showNewSubjectForm}
              >
                <option value="">Select a Subject</option>
                {subjects.map((subject) => (
                  <option key={subject.id} value={subject.id}>
                    {subject.name}
                  </option>
                ))}
              </select>
            )}
          </div>
          
          <div className="mb-4">
            <h2 className="text-xl font-semibold text-gray-900 mb-2">Flashcards</h2>
            <p className="text-gray-600 mb-4">Add questions and answers for your flashcard set.</p>
          </div>
          
          {cards.map((card, index) => (
            <div key={index} className="bg-gray-50 p-4 rounded-lg mb-4">
              <div className="flex justify-between items-center mb-3">
                <h3 className="font-medium">Card {index + 1}</h3>
                <button
                  type="button"
                  onClick={() => removeCard(index)}
                  className="text-red-600 hover:text-red-800"
                  disabled={cards.length === 1}
                >
                  <Trash2 className="h-5 w-5" />
                </button>
              </div>
              
              <div className="mb-3">
                <label htmlFor={`question-${index}`} className="block text-sm font-medium text-gray-700 mb-1">
                  Question*
                </label>
                <textarea
                  id={`question-${index}`}
                  value={card.question}
                  onChange={(e) => updateCard(index, 'question', e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-indigo-500 focus:border-indigo-500"
                  placeholder="Enter your question"
                  rows={2}
                  required
                />
              </div>
              
              <div>
                <label htmlFor={`answer-${index}`} className="block text-sm font-medium text-gray-700 mb-1">
                  Answer*
                </label>
                <textarea
                  id={`answer-${index}`}
                  value={card.answer}
                  onChange={(e) => updateCard(index, 'answer', e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-indigo-500 focus:border-indigo-500"
                  placeholder="Enter your answer"
                  rows={3}
                  required
                />
              </div>
            </div>
          ))}
          
          <button
            type="button"
            onClick={addCard}
            className="flex items-center justify-center w-full py-3 border-2 border-dashed border-gray-300 rounded-lg text-gray-600 hover:text-indigo-600 hover:border-indigo-500 transition-colors"
          >
            <Plus className="h-5 w-5 mr-2" />
            Add Another Card
          </button>
        </div>
        
        <div className="bg-gray-50 px-6 py-4 flex justify-end">
          <button
            type="submit"
            disabled={saving}
            className="flex items-center bg-indigo-600 text-white px-6 py-2 rounded-md hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
          >
            {saving ? (
              <>Saving...</>
            ) : (
              <>
                <Save className="h-5 w-5 mr-2" />
                Create Flashcard Set
              </>
            )}
          </button>
        </div>
      </form>
    </div>
  );
} 