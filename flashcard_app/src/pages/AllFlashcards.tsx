import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import { FileText, Check, EyeOff, Eye, Trash2, Filter, BookOpen, Library, FileEdit } from 'lucide-react';
import DeleteConfirmation from '../components/DeleteConfirmation';
import LoadingSpinner from '../components/LoadingSpinner';
import Toast from '../components/Toast';
import EmptyState from '../components/EmptyState';
import Card from '../components/Card';
import useAuth from '../hooks/useAuth';
import useToast from '../hooks/useToast';

interface Flashcard {
  id: string;
  question: string;
  answer: string;
  is_mastered: boolean;
  collection_id: string;
  collection: {
    title: string;
    subject: {
      name: string;
      id: string;
    }
  };
}

export default function AllFlashcards() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { toast, showToast, hideToast } = useToast();
  const [cards, setCards] = useState<Flashcard[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showMastered, setShowMastered] = useState(false);
  const [cardToDelete, setCardToDelete] = useState<Flashcard | null>(null);
  const [filterSubject, setFilterSubject] = useState<string>('all');
  const [filterCollection, setFilterCollection] = useState<string>('all');
  const [subjects, setSubjects] = useState<{id: string, name: string}[]>([]);
  const [collections, setCollections] = useState<{id: string, title: string, subject_id: string}[]>([]);
  const [showFilters, setShowFilters] = useState(false);

  useEffect(() => {
    loadData();
  }, [showMastered, filterSubject, filterCollection]);

  async function loadData() {
    try {
      setLoading(true);
      
      // Load subjects
      const { data: subjectsData, error: subjectsError } = await supabase
        .from('subjects')
        .select('id, name')
        .order('name');
      
      if (subjectsError) throw subjectsError;
      setSubjects(subjectsData || []);
      
      // Load collections
      const { data: collectionsData, error: collectionsError } = await supabase
        .from('flashcard_collections')
        .select('id, title, subject_id')
        .order('title');
      
      if (collectionsError) throw collectionsError;
      setCollections(collectionsData || []);
      
      // Build flashcards query
      let query = supabase
        .from('flashcards')
        .select(`
          *,
          collection:collection_id (
            title,
            subject:subject_id (
              name,
              id
            )
          )
        `)
        .order('created_at', { ascending: false });
      
      // Apply filters
      if (!showMastered) {
        query = query.eq('is_mastered', false);
      }
      
      if (filterSubject !== 'all') {
        // Get all collections in this subject
        const subjectCollections = collectionsData
          .filter(c => c.subject_id === filterSubject)
          .map(c => c.id);
        
        if (subjectCollections.length > 0) {
          query = query.in('collection_id', subjectCollections);
        } else {
          // No collections in this subject, return empty result
          setCards([]);
          setLoading(false);
          return;
        }
      }
      
      if (filterCollection !== 'all') {
        query = query.eq('collection_id', filterCollection);
      }
      
      const { data: cardsData, error: cardsError } = await query;
      
      if (cardsError) throw cardsError;
      setCards(cardsData || []);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  const toggleMastered = async (card: Flashcard) => {
    if (!user) {
      showToast('Please sign in to mark cards as mastered', 'error');
      return;
    }
    
    try {
      const newMasteredState = !card.is_mastered;
      
      const { error } = await supabase
        .from('flashcards')
        .update({ is_mastered: newMasteredState })
        .eq('id', card.id);

      if (error) throw error;
      
      // Update local state
      setCards(cards.map(c => 
        c.id === card.id ? { ...c, is_mastered: newMasteredState } : c
      ));
      
      // Show toast notification
      showToast(
        newMasteredState 
          ? 'Card marked as mastered' 
          : 'Card unmarked as mastered',
        'success'
      );
      
      // If we're not showing mastered cards, remove it from the list
      if (!showMastered && newMasteredState) {
        setCards(cards.filter(c => c.id !== card.id));
      }
    } catch (err) {
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
      
      // Update local state
      setCards(cards.filter(card => card.id !== cardToDelete.id));
      
      // Show toast notification
      showToast('Card deleted successfully', 'success');
      setCardToDelete(null);
    } catch (err) {
      showToast(`Error: ${err.message}`, 'error');
    }
  };

  const getFilteredCollections = () => {
    if (filterSubject === 'all') {
      return collections;
    }
    return collections.filter(c => c.subject_id === filterSubject);
  };

  const handleEditCard = (card: Flashcard) => {
    navigate(`/manage-cards/${card.collection_id}`);
  };

  if (loading) {
    return <LoadingSpinner />;
  }

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
      
      <div className="flex justify-between items-center mb-6">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">All Flashcards</h1>
          <p className="text-gray-600">
            {cards.length} {cards.length === 1 ? 'card' : 'cards'} {!showMastered ? 'to study' : ''}
          </p>
        </div>
        
        <div className="flex items-center gap-3">
          <button
            onClick={() => setShowFilters(!showFilters)}
            className="flex items-center gap-2 bg-white border border-gray-300 text-gray-700 px-4 py-2 rounded-md hover:bg-gray-50"
          >
            <Filter className="h-5 w-5" />
            Filters
          </button>
          
          <button
            onClick={() => setShowMastered(!showMastered)}
            className="flex items-center gap-2 bg-white border border-gray-300 text-gray-700 px-4 py-2 rounded-md hover:bg-gray-50"
          >
            {showMastered ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
            {showMastered ? 'Hide Mastered' : 'Show All'}
          </button>
        </div>
      </div>
      
      {showFilters && (
        <div className="bg-white p-4 rounded-lg shadow-md mb-6">
          <div className="grid md:grid-cols-2 gap-4">
            <div>
              <label htmlFor="subject-filter" className="block text-sm font-medium text-gray-700 mb-1">
                Filter by Subject
              </label>
              <select
                id="subject-filter"
                value={filterSubject}
                onChange={(e) => {
                  setFilterSubject(e.target.value);
                  setFilterCollection('all'); // Reset collection filter when subject changes
                }}
                className="w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500"
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
              <label htmlFor="collection-filter" className="block text-sm font-medium text-gray-700 mb-1">
                Filter by Collection
              </label>
              <select
                id="collection-filter"
                value={filterCollection}
                onChange={(e) => setFilterCollection(e.target.value)}
                className="w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500"
              >
                <option value="all">All Collections</option>
                {getFilteredCollections().map((collection) => (
                  <option key={collection.id} value={collection.id}>
                    {collection.title}
                  </option>
                ))}
              </select>
            </div>
          </div>
        </div>
      )}
      
      {cards.length === 0 ? (
        <EmptyState
          title="No flashcards found"
          description={showMastered 
            ? 'No flashcards match your current filters.' 
            : 'You have mastered all cards or no cards match your current filters.'}
          icon="file"
          actions={
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              {!showMastered && (
                <button
                  onClick={() => setShowMastered(true)}
                  className="bg-indigo-600 text-white px-4 py-2 rounded-md hover:bg-indigo-700"
                >
                  Show Mastered Cards
                </button>
              )}
              
              {user ? (
                <Link
                  to="/create"
                  className="bg-green-600 text-white px-4 py-2 rounded-md hover:bg-green-700"
                >
                  Create New Collection
                </Link>
              ) : (
                <Link
                  to="/auth"
                  className="bg-green-600 text-white px-4 py-2 rounded-md hover:bg-green-700"
                >
                  Sign In to Create Collections
                </Link>
              )}
            </div>
          }
        />
      ) : (
        <div className="grid gap-4">
          {cards.map((card) => (
            <div key={card.id} className={`bg-white rounded-lg shadow-md overflow-hidden ${card.is_mastered ? 'border-l-4 border-green-500' : ''}`}>
              <div className="p-4">
                <div className="flex justify-between items-start mb-2">
                  <div className="flex items-center gap-2">
                    <FileText className="h-5 w-5 text-indigo-600" />
                    <div>
                      <div className="flex items-center gap-2">
                        <Link 
                          to={`/study/${card.collection_id}`}
                          className="text-sm font-medium text-indigo-600 hover:text-indigo-800 hover:underline"
                        >
                          {card.collection.title}
                        </Link>
                        <span className="text-gray-400">•</span>
                        <Link
                          to={`/subject/${card.collection.subject.id}`}
                          className="text-sm text-gray-600 hover:text-indigo-600 hover:underline"
                        >
                          {card.collection.subject.name}
                        </Link>
                      </div>
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
                
                <div className="mt-4 flex justify-end">
                  {user ? (
                    <Link
                      to={`/manage-cards/${card.collection_id}`}
                      className="text-indigo-600 hover:text-indigo-800 text-sm font-medium"
                    >
                      Edit this card →
                    </Link>
                  ) : (
                    <Link
                      to={`/study/${card.collection_id}`}
                      className="text-indigo-600 hover:text-indigo-800 text-sm font-medium"
                    >
                      Study this collection →
                    </Link>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}