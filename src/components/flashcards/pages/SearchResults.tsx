import React, { useState, useEffect } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { Library, BookOpen, FileText, ArrowLeft, Check, FileEdit, Trash2 } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import LoadingSpinner from '../LoadingSpinner';
import ErrorMessage from '../ErrorMessage';
import EmptyState from '../EmptyState';
import useFlashcardAuth from '@/hooks/useFlashcardAuth';
import useToast from '@/hooks/useFlashcardToast';
import Toast from '../Toast';
import DeleteConfirmation from '../DeleteConfirmation';

interface Collection {
  id: string;
  title: string;
  description: string;
  subject: {
    id: string;
    name: string;
  };
}

interface Subject {
  id: string;
  name: string;
  description: string;
}

interface Flashcard {
  id: string;
  question: string;
  answer: string;
  is_mastered: boolean;
  collection_id: string;
  collection: {
    title: string;
    subject: {
      id: string;
      name: string;
    };
  };
}

export default function SearchResults() {
  const location = useLocation();
  const navigate = useNavigate();
  const searchParams = new URLSearchParams(location.search);
  const query = searchParams.get('q') || '';
  const { user } = useFlashcardAuth();
  const { toast, showToast, hideToast } = useToast();

  const [collections, setCollections] = useState<Collection[]>([]);
  const [subjects, setSubjects] = useState<Subject[]>([]);
  const [cards, setCards] = useState<Flashcard[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [cardToDelete, setCardToDelete] = useState<Flashcard | null>(null);

  useEffect(() => {
    if (query) {
      performSearch();
    } else {
      navigate('/flashcards');
    }
  }, [query]);

  const performSearch = async () => {
    if (!query.trim()) return;
    
    setLoading(true);
    try {
      // Search collections
      const { data: collectionsData, error: collectionsError } = await supabase
        .from('flashcard_collections')
        .select(`
          id,
          title,
          description,
          subject:subject_id (
            id,
            name
          )
        `)
        .ilike('title', `%${query}%`)
        .order('title');

      if (collectionsError) throw collectionsError;
      setCollections(collectionsData || []);

      // Search subjects
      const { data: subjectsData, error: subjectsError } = await supabase
        .from('subjects')
        .select('id, name, description')
        .ilike('name', `%${query}%`)
        .order('name');

      if (subjectsError) throw subjectsError;
      setSubjects(subjectsData || []);

      // Search flashcards
      const { data: cardsData, error: cardsError } = await supabase
        .from('flashcards')
        .select(`
          id,
          question,
          answer,
          is_mastered,
          collection_id,
          collection:collection_id (
            title,
            subject:subject_id (
              id,
              name
            )
          )
        `)
        .or(`question.ilike.%${query}%, answer.ilike.%${query}%`)
        .order('created_at', { ascending: false });

      if (cardsError) throw cardsError;
      setCards(cardsData || []);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleEditCard = (card: Flashcard) => {
    navigate(`/flashcards/manage/${card.collection_id}`, { 
      state: { editCardId: card.id } 
    });
  };

  const toggleMastered = async (card: Flashcard) => {
    try {
      const { error } = await supabase
        .from('flashcards')
        .update({ is_mastered: !card.is_mastered })
        .eq('id', card.id);
      
      if (error) throw error;
      
      // Update the local state
      setCards(cards.map(c => 
        c.id === card.id ? { ...c, is_mastered: !card.is_mastered } : c
      ));
      
      showToast(
        card.is_mastered ? 'Card unmarked as mastered' : 'Card marked as mastered', 
        'success'
      );
    } catch (err: any) {
      showToast(`Error: ${err.message}`, 'error');
    }
  };

  const deleteCard = async () => {
    if (!cardToDelete) return;
    
    try {
      const { error } = await supabase
        .from('flashcards')
        .delete()
        .eq('id', cardToDelete.id);
      
      if (error) throw error;
      
      // Update the local state
      setCards(cards.filter(c => c.id !== cardToDelete.id));
      showToast('Card deleted successfully', 'success');
    } catch (err: any) {
      showToast(`Error: ${err.message}`, 'error');
    } finally {
      setCardToDelete(null);
    }
  };

  if (loading) {
    return <LoadingSpinner />;
  }

  if (error) {
    return <ErrorMessage message={error} />;
  }

  const hasResults = collections.length > 0 || subjects.length > 0 || cards.length > 0;

  return (
    <div className="max-w-6xl mx-auto">
      <DeleteConfirmation
        isOpen={!!cardToDelete}
        onClose={() => setCardToDelete(null)}
        onConfirm={deleteCard}
        title="Delete Flashcard"
        message="Are you sure you want to delete this flashcard?"
        itemName={cardToDelete?.question}
      />
      
      {/* Toast notification */}
      {toast && (
        <Toast 
          message={toast.message} 
          type={toast.type} 
          onClose={hideToast} 
        />
      )}
      
      <div className="mb-6">
        <Link to="/flashcards" className="flex items-center text-indigo-600 hover:text-indigo-800">
          <ArrowLeft className="h-4 w-4 mr-1" />
          Back to Flashcards
        </Link>
        <h1 className="text-3xl font-bold text-gray-900 mt-2">Search Results for "{query}"</h1>
      </div>
      
      {!hasResults ? (
        <EmptyState
          title="No results found"
          description={`We couldn't find any matches for "${query}". Try a different search term.`}
          icon={<FileText className="h-12 w-12 text-gray-400" />}
        />
      ) : (
        <div className="space-y-8">
          {/* Collections */}
          {collections.length > 0 && (
            <div>
              <h2 className="text-xl font-semibold text-gray-900 mb-4 flex items-center">
                <Library className="h-5 w-5 mr-2 text-indigo-600" />
                Collections ({collections.length})
              </h2>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {collections.map(collection => (
                  <div key={collection.id} className="bg-white rounded-lg shadow-md overflow-hidden">
                    <div className="p-4">
                      <Link 
                        to={`/flashcards/study/${collection.id}`}
                        className="text-lg font-medium text-indigo-600 hover:underline"
                      >
                        {collection.title}
                      </Link>
                      <div className="flex items-center text-sm text-gray-500 mt-1">
                        <BookOpen className="h-4 w-4 mr-1" />
                        <Link 
                          to={`/flashcards/subjects/${collection.subject.id}`}
                          className="hover:text-indigo-600 hover:underline"
                        >
                          {collection.subject.name}
                        </Link>
                      </div>
                      {collection.description && (
                        <p className="mt-2 text-gray-600">{collection.description}</p>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
          
          {/* Subjects */}
          {subjects.length > 0 && (
            <div>
              <h2 className="text-xl font-semibold text-gray-900 mb-4 flex items-center">
                <BookOpen className="h-5 w-5 mr-2 text-indigo-600" />
                Subjects ({subjects.length})
              </h2>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {subjects.map(subject => (
                  <div key={subject.id} className="bg-white rounded-lg shadow-md overflow-hidden">
                    <div className="p-4">
                      <Link 
                        to={`/flashcards/subjects/${subject.id}`}
                        className="text-lg font-medium text-indigo-600 hover:underline"
                      >
                        {subject.name}
                      </Link>
                      {subject.description && (
                        <p className="mt-2 text-gray-600">{subject.description}</p>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
          
          {/* Flashcards */}
          {cards.length > 0 && (
            <div>
              <h2 className="text-xl font-semibold text-gray-900 mb-4 flex items-center">
                <FileText className="h-5 w-5 mr-2 text-indigo-600" />
                Flashcards ({cards.length})
              </h2>
              
              <div className="grid grid-cols-1 gap-4">
                {cards.map(card => (
                  <div key={card.id} className={`bg-white rounded-lg shadow-md overflow-hidden ${card.is_mastered ? 'border-l-4 border-green-500' : ''}`}>
                    <div className="p-4">
                      <div className="flex justify-between mb-2">
                        <div>
                          <Link 
                            to={`/flashcards/study/${card.collection_id}`}
                            className="text-sm font-medium text-indigo-600 hover:underline"
                          >
                            {card.collection.title}
                          </Link>
                          <div className="flex items-center text-sm text-gray-500 mt-1">
                            <BookOpen className="h-4 w-4 mr-1" />
                            <Link 
                              to={`/flashcards/subjects/${card.collection.subject.id}`}
                              className="hover:text-indigo-600 hover:underline"
                            >
                              {card.collection.subject.name}
                            </Link>
                          </div>
                        </div>
                        
                        <div className="flex items-center gap-2">
                          <button
                            onClick={() => toggleMastered(card)}
                            className={`p-1 rounded-full ${
                              card.is_mastered 
                                ? 'bg-green-100 text-green-600 hover:bg-green-200'
                                : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                            }`}
                            title={card.is_mastered ? 'Unmark as mastered' : 'Mark as mastered'}
                          >
                            <Check className="h-5 w-5" />
                          </button>
                          {user && (
                            <>
                              <button
                                onClick={() => handleEditCard(card)}
                                className="p-1 rounded-full text-gray-600 hover:text-indigo-600 hover:bg-indigo-100"
                                title="Edit card"
                              >
                                <FileEdit className="h-5 w-5" />
                              </button>
                              <button
                                onClick={() => setCardToDelete(card)}
                                className="p-1 rounded-full text-gray-600 hover:text-red-600 hover:bg-red-100"
                                title="Delete card"
                              >
                                <Trash2 className="h-5 w-5" />
                              </button>
                            </>
                          )}
                        </div>
                      </div>
                      
                      <div className="mt-2">
                        <h3 className="text-lg font-medium text-gray-900 mb-2">{card.question}</h3>
                        <div className="bg-gray-50 p-3 rounded-md">
                          <p className="text-gray-700">{card.answer}</p>
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
} 