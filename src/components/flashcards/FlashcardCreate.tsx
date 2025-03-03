import React, { useState, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { supabase } from '@/lib/supabase';
import useFlashcardAuth from '@/hooks/useFlashcardAuth';
import { Plus, Trash2, Save, ArrowLeft, BookOpen } from 'lucide-react';
import LoadingSpinner from './LoadingSpinner';
import useToast from '@/hooks/useFlashcardToast';
import Toast from './Toast';

interface Subject {
  id: string;
  name: string;
}

interface FlashcardInput {
  id: string;
  question: string;
  answer: string;
}

export default function FlashcardCreate() {
  const { user } = useFlashcardAuth();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { toast, showToast, hideToast } = useToast();
  
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [selectedSubjectId, setSelectedSubjectId] = useState<string>('');
  const [subjects, setSubjects] = useState<Subject[]>([]);
  const [flashcards, setFlashcards] = useState<FlashcardInput[]>([
    { id: '1', question: '', answer: '' },
    { id: '2', question: '', answer: '' }
  ]);
  
  const [newSubjectName, setNewSubjectName] = useState('');
  const [newSubjectDescription, setNewSubjectDescription] = useState('');
  const [showNewSubjectForm, setShowNewSubjectForm] = useState(false);
  
  const [loading, setLoading] = useState(false);
  const [savingSubject, setSavingSubject] = useState(false);
  const [loadingSubjects, setLoadingSubjects] = useState(true);

  useEffect(() => {
    loadSubjects();
    
    // Check if we should show the new subject form
    const newSubject = searchParams.get('newSubject');
    if (newSubject === 'true') {
      setShowNewSubjectForm(true);
    }
    
    // Check if a subject ID was provided
    const subjectId = searchParams.get('subject');
    if (subjectId) {
      setSelectedSubjectId(subjectId);
    }
  }, [searchParams]);

  async function loadSubjects() {
    try {
      setLoadingSubjects(true);
      
      const { data, error } = await supabase
        .from('subjects')
        .select('id, name')
        .order('name');
      
      if (error) throw error;
      
      setSubjects(data || []);
    } catch (err: any) {
      console.error('Error loading subjects:', err);
      showToast('Failed to load subjects', 'error');
    } finally {
      setLoadingSubjects(false);
    }
  }

  function handleFlashcardChange(id: string, field: 'question' | 'answer', value: string) {
    setFlashcards(cards => 
      cards.map(card => 
        card.id === id ? { ...card, [field]: value } : card
      )
    );
  }

  function addFlashcard() {
    const newId = (flashcards.length + 1).toString();
    setFlashcards([...flashcards, { id: newId, question: '', answer: '' }]);
  }

  function removeFlashcard(id: string) {
    if (flashcards.length <= 2) {
      showToast('You need at least 2 flashcards', 'error');
      return;
    }
    setFlashcards(flashcards.filter(card => card.id !== id));
  }

  async function handleCreateSubject() {
    if (!user) {
      showToast('You must be logged in to create a subject', 'error');
      return;
    }
    
    if (!newSubjectName.trim()) {
      showToast('Subject name is required', 'error');
      return;
    }
    
    try {
      setSavingSubject(true);
      
      const { data, error } = await supabase
        .from('subjects')
        .insert([
          { 
            name: newSubjectName.trim(),
            description: newSubjectDescription.trim(),
            is_official: false
          }
        ])
        .select()
        .single();
      
      if (error) throw error;
      
      showToast('Subject created successfully', 'success');
      setNewSubjectName('');
      setNewSubjectDescription('');
      setShowNewSubjectForm(false);
      
      // Add the new subject to the list and select it
      setSubjects([...subjects, { id: data.id, name: data.name }]);
      setSelectedSubjectId(data.id);
    } catch (err: any) {
      console.error('Error creating subject:', err);
      showToast('Failed to create subject', 'error');
    } finally {
      setSavingSubject(false);
    }
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    
    if (!user) {
      showToast('You must be logged in to create flashcards', 'error');
      return;
    }
    
    if (!title.trim()) {
      showToast('Title is required', 'error');
      return;
    }
    
    if (!selectedSubjectId) {
      showToast('Please select a subject', 'error');
      return;
    }
    
    // Validate flashcards
    const validFlashcards = flashcards.filter(
      card => card.question.trim() && card.answer.trim()
    );
    
    if (validFlashcards.length < 2) {
      showToast('You need at least 2 complete flashcards', 'error');
      return;
    }
    
    try {
      setLoading(true);
      
      // Create the collection
      const { data: collection, error: collectionError } = await supabase
        .from('flashcard_collections')
        .insert([
          { 
            title: title.trim(),
            description: description.trim(),
            subject_id: selectedSubjectId,
            user_id: user.id
          }
        ])
        .select()
        .single();
      
      if (collectionError) throw collectionError;
      
      // Create the flashcards
      const flashcardsToInsert = validFlashcards.map(card => ({
        question: card.question.trim(),
        answer: card.answer.trim(),
        collection_id: collection.id,
        is_mastered: false
      }));
      
      const { error: flashcardsError } = await supabase
        .from('flashcards')
        .insert(flashcardsToInsert);
      
      if (flashcardsError) throw flashcardsError;
      
      showToast('Flashcard collection created successfully', 'success');
      
      // Navigate to the collections page
      navigate('/flashcards/collections');
    } catch (err: any) {
      console.error('Error creating flashcards:', err);
      showToast('Failed to create flashcards', 'error');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="max-w-4xl mx-auto">
      {toast && (
        <Toast 
          message={toast.message} 
          type={toast.type} 
          onClose={hideToast} 
        />
      )}
      
      <div className="flex items-center mb-8">
        <button
          onClick={() => navigate(-1)}
          className="mr-4 text-gray-500 hover:text-gray-700"
        >
          <ArrowLeft className="h-5 w-5" />
        </button>
        <h1 className="text-3xl font-bold text-gray-900">Create Flashcards</h1>
      </div>
      
      <form onSubmit={handleSubmit} className="space-y-8">
        {/* Collection Details */}
        <div className="bg-white rounded-xl shadow-sm p-6 border border-gray-100">
          <h2 className="text-xl font-semibold text-gray-900 mb-4">Collection Details</h2>
          
          <div className="space-y-4">
            <div>
              <label htmlFor="title" className="block text-sm font-medium text-gray-700 mb-1">
                Title *
              </label>
              <input
                id="title"
                type="text"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="e.g., Biology 101, Spanish Verbs"
                className="w-full px-4 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500"
                required
              />
            </div>
            
            <div>
              <label htmlFor="description" className="block text-sm font-medium text-gray-700 mb-1">
                Description
              </label>
              <textarea
                id="description"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Brief description of this flashcard collection"
                className="w-full px-4 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500 h-24"
              />
            </div>
            
            <div>
              <label htmlFor="subject" className="block text-sm font-medium text-gray-700 mb-1">
                Subject *
              </label>
              
              {loadingSubjects ? (
                <div className="flex items-center space-x-2">
                  <LoadingSpinner size="sm" />
                  <span className="text-sm text-gray-500">Loading subjects...</span>
                </div>
              ) : (
                <>
                  {!showNewSubjectForm ? (
                    <div className="flex items-center space-x-2">
                      <select
                        id="subject"
                        value={selectedSubjectId}
                        onChange={(e) => setSelectedSubjectId(e.target.value)}
                        className="flex-1 px-4 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500"
                        required
                      >
                        <option value="">Select a subject</option>
                        {subjects.map(subject => (
                          <option key={subject.id} value={subject.id}>
                            {subject.name}
                          </option>
                        ))}
                      </select>
                      
                      <button
                        type="button"
                        onClick={() => setShowNewSubjectForm(true)}
                        className="bg-gray-100 text-gray-700 px-4 py-2 rounded-md hover:bg-gray-200 flex items-center"
                      >
                        <Plus className="h-4 w-4 mr-1" />
                        New Subject
                      </button>
                    </div>
                  ) : (
                    <div className="space-y-4 border border-gray-200 rounded-md p-4 bg-gray-50">
                      <div>
                        <label htmlFor="newSubjectName" className="block text-sm font-medium text-gray-700 mb-1">
                          Subject Name *
                        </label>
                        <input
                          id="newSubjectName"
                          type="text"
                          value={newSubjectName}
                          onChange={(e) => setNewSubjectName(e.target.value)}
                          placeholder="e.g., Mathematics, Biology, Programming"
                          className="w-full px-4 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500"
                          required
                        />
                      </div>
                      
                      <div>
                        <label htmlFor="newSubjectDescription" className="block text-sm font-medium text-gray-700 mb-1">
                          Subject Description
                        </label>
                        <textarea
                          id="newSubjectDescription"
                          value={newSubjectDescription}
                          onChange={(e) => setNewSubjectDescription(e.target.value)}
                          placeholder="Brief description of this subject"
                          className="w-full px-4 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500 h-20"
                        />
                      </div>
                      
                      <div className="flex justify-end space-x-2">
                        <button
                          type="button"
                          onClick={() => setShowNewSubjectForm(false)}
                          className="bg-gray-100 text-gray-700 px-4 py-2 rounded-md hover:bg-gray-200"
                          disabled={savingSubject}
                        >
                          Cancel
                        </button>
                        <button
                          type="button"
                          onClick={handleCreateSubject}
                          className="bg-indigo-600 text-white px-4 py-2 rounded-md hover:bg-indigo-700 flex items-center"
                          disabled={savingSubject}
                        >
                          {savingSubject ? (
                            <>
                              <LoadingSpinner size="sm" className="mr-2" />
                              Saving...
                            </>
                          ) : (
                            <>
                              <Save className="h-4 w-4 mr-1" />
                              Save Subject
                            </>
                          )}
                        </button>
                      </div>
                    </div>
                  )}
                </>
              )}
            </div>
          </div>
        </div>
        
        {/* Flashcards */}
        <div className="bg-white rounded-xl shadow-sm p-6 border border-gray-100">
          <div className="flex justify-between items-center mb-4">
            <h2 className="text-xl font-semibold text-gray-900">Flashcards</h2>
            <div className="flex items-center text-sm text-gray-500">
              <BookOpen className="h-4 w-4 mr-1" />
              {flashcards.length} cards
            </div>
          </div>
          
          <div className="space-y-6">
            {flashcards.map((card, index) => (
              <div key={card.id} className="border border-gray-200 rounded-md p-4">
                <div className="flex justify-between items-center mb-3">
                  <h3 className="font-medium text-gray-700">Card {index + 1}</h3>
                  <button
                    type="button"
                    onClick={() => removeFlashcard(card.id)}
                    className="text-red-600 hover:text-red-800"
                  >
                    <Trash2 className="h-5 w-5" />
                  </button>
                </div>
                
                <div className="space-y-4">
                  <div>
                    <label htmlFor={`question-${card.id}`} className="block text-sm font-medium text-gray-700 mb-1">
                      Question
                    </label>
                    <textarea
                      id={`question-${card.id}`}
                      value={card.question}
                      onChange={(e) => handleFlashcardChange(card.id, 'question', e.target.value)}
                      placeholder="Enter the question"
                      className="w-full px-4 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500 h-20"
                    />
                  </div>
                  
                  <div>
                    <label htmlFor={`answer-${card.id}`} className="block text-sm font-medium text-gray-700 mb-1">
                      Answer
                    </label>
                    <textarea
                      id={`answer-${card.id}`}
                      value={card.answer}
                      onChange={(e) => handleFlashcardChange(card.id, 'answer', e.target.value)}
                      placeholder="Enter the answer"
                      className="w-full px-4 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500 h-20"
                    />
                  </div>
                </div>
              </div>
            ))}
            
            <button
              type="button"
              onClick={addFlashcard}
              className="w-full bg-gray-100 text-gray-700 px-4 py-3 rounded-md hover:bg-gray-200 flex items-center justify-center"
            >
              <Plus className="h-5 w-5 mr-2" />
              Add Another Card
            </button>
          </div>
        </div>
        
        {/* Submit Button */}
        <div className="flex justify-end">
          <button
            type="submit"
            className="bg-indigo-600 text-white px-6 py-3 rounded-md hover:bg-indigo-700 flex items-center"
            disabled={loading}
          >
            {loading ? (
              <>
                <LoadingSpinner size="sm" className="mr-2" />
                Creating...
              </>
            ) : (
              <>
                <Save className="h-5 w-5 mr-2" />
                Create Collection
              </>
            )}
          </button>
        </div>
      </form>
    </div>
  );
} 