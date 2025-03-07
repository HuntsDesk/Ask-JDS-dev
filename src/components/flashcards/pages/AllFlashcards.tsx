import React, { useState, useEffect, useMemo } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { FileText, Check, EyeOff, Eye, Trash2, Filter, BookOpen, FileEdit, Lock } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import useAuth from '@/hooks/useFlashcardAuth';
import useToast from '@/hooks/useFlashcardToast';
import LoadingSpinner from '../LoadingSpinner';
import Toast from '../Toast';
import EmptyState from '../EmptyState';
import ErrorMessage from '../ErrorMessage';
import DeleteConfirmation from '../DeleteConfirmation';
import { usePersistedState } from '@/hooks/use-persisted-state';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { hasActiveSubscription } from '@/lib/subscription';

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
  const [subjects, setSubjects] = useState<{id: string, name: string}[]>([]);
  const [collections, setCollections] = useState<{id: string, title: string, subject_id: string}[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [cardToDelete, setCardToDelete] = useState<Flashcard | null>(null);
  const [searchParams, setSearchParams] = useSearchParams();
  const [hasSubscription, setHasSubscription] = useState<boolean>(false);

  // Replace regular state with persisted state
  const [showMastered, setShowMastered] = usePersistedState<boolean>('flashcards-show-mastered', true);
  const [filterSubject, setFilterSubject] = usePersistedState<string>('flashcards-filter-subject', 'all');
  const [filterCollection, setFilterCollection] = usePersistedState<string>('flashcards-filter-collection', 'all');
  const [showFilters, setShowFilters] = usePersistedState<boolean>('flashcards-show-filters', false);
  const [filter, setFilter] = useState<'all' | 'official' | 'my'>('all');

  useEffect(() => {
    loadData();
    checkSubscription();
    
    // Check if there's a filter in the URL
    const filterParam = searchParams.get('filter');
    if (filterParam && ['all', 'official', 'my'].includes(filterParam)) {
      setFilter(filterParam as 'all' | 'official' | 'my');
    }
  }, [showMastered, filterSubject, filterCollection, filter]);

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
      
      // Load collections with is_official flag
      const { data: collectionsData, error: collectionsError } = await supabase
        .from('flashcard_collections')
        .select('id, title, subject_id, is_official, user_id')
        .order('title');
      
      if (collectionsError) throw collectionsError;
      
      // Filter collections based on the official/my filter
      let filteredCollectionsData = collectionsData;
      if (filter === 'official') {
        filteredCollectionsData = collectionsData.filter(c => c.is_official);
      } else if (filter === 'my' && user) {
        filteredCollectionsData = collectionsData.filter(c => !c.is_official && c.user_id === user.id);
      }
      
      setCollections(filteredCollectionsData || []);
      
      // Get all collection IDs that match our filter
      const collectionIds = filteredCollectionsData.map(c => c.id);
      
      // If no collections match our filter, return empty result
      if (collectionIds.length === 0) {
        setCards([]);
        setLoading(false);
        return;
      }
      
      // Build flashcards query
      let query = supabase
        .from('flashcards')
        .select(`
          *,
          collection:collection_id (
            title,
            is_official,
            user_id,
            subject:subject_id (
              name,
              id
            )
          )
        `)
        .in('collection_id', collectionIds)
        .order('created_at', { ascending: false });
      
      // Apply filters
      if (!showMastered) {
        query = query.eq('is_mastered', false);
      }
      
      if (filterSubject !== 'all') {
        // Get all collections in this subject
        const subjectCollections = filteredCollectionsData
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
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  const checkSubscription = async () => {
    if (user) {
      try {
        console.log("AllFlashcards: Checking subscription status...");
        const hasAccess = await hasActiveSubscription(user.id);
        console.log("AllFlashcards: Subscription status:", hasAccess);
        setHasSubscription(hasAccess);
      } catch (error) {
        console.error("Error checking subscription:", error);
        setHasSubscription(false);
      }
    } else {
      console.log("AllFlashcards: No user logged in, setting hasSubscription to false");
      setHasSubscription(false);
    }
  };

  // Memoize the filtered collections list
  const filteredCollections = useMemo(() => {
    if (filterSubject === 'all') {
      return collections;
    }
    return collections.filter(c => c.subject_id === filterSubject);
  }, [collections, filterSubject]);

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

  function handleFilterChange(value: string) {
    const newFilter = value as 'all' | 'official' | 'my';
    setFilter(newFilter);
    
    // Update URL params
    searchParams.set('filter', newFilter);
    setSearchParams(searchParams);
  }

  // Force premium content protection for testing
  const forcePremiumTest = true; // Set to true for testing premium protection

  // Check if a card is from a premium collection
  const isCardPremium = (card: any) => {
    return (card.collection?.is_official || false) && (!hasSubscription || forcePremiumTest);
  };

  if (loading) {
    return <LoadingSpinner />;
  }

  if (error) {
    return <ErrorMessage message={error} />;
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
      
      <div className="flex flex-col space-y-4 mb-6">
        <div className="flex justify-between items-center">
          <div className="flex items-center gap-4">
            <div>
              <h1 className="text-3xl font-bold text-gray-900">All Flashcards</h1>
              <p className="text-gray-600">
                {cards.length} {cards.length === 1 ? 'card' : 'cards'} {!showMastered ? 'to study' : ''}
              </p>
            </div>
            
            {/* Controls moved to the left of the slider */}
            <div className="flex items-center gap-3 ml-4">
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
                aria-label={showMastered ? "Hide mastered cards" : "Show all cards"}
              >
                {showMastered ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
                {showMastered ? "Hide Mastered" : "Show All"}
              </button>
            </div>
          </div>
          
          {/* Filter tabs */}
          <div>
            <Tabs value={filter} onValueChange={handleFilterChange}>
              <TabsList className="grid grid-cols-3" style={{ backgroundColor: '#f8f8f8' }}>
                <TabsTrigger 
                  value="all"
                  className="data-[state=active]:bg-[#F37022] data-[state=active]:text-white"
                >
                  All
                </TabsTrigger>
                <TabsTrigger 
                  value="official"
                  className="data-[state=active]:bg-[#F37022] data-[state=active]:text-white"
                >
                  Premium
                </TabsTrigger>
                <TabsTrigger 
                  value="my"
                  className="data-[state=active]:bg-[#F37022] data-[state=active]:text-white"
                >
                  My Flashcards
                </TabsTrigger>
              </TabsList>
            </Tabs>
          </div>
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
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-[#F37022] focus:border-[#F37022]"
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
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-[#F37022] focus:border-[#F37022]"
              >
                <option value="all">All Collections</option>
                {filteredCollections.map((collection) => (
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
          description={
            !showMastered 
              ? 'You have mastered all cards or no cards match your current filters.'
              : filter === 'official'
                ? 'No premium flashcards match your current filters.'
                : filter === 'my' 
                  ? 'You haven\'t created any flashcards yet, or none match your current filters.'
                  : 'No flashcards match your current filters.'
          }
          icon={<FileText className="h-12 w-12 text-gray-400" />}
          actionText={!showMastered ? "Show Mastered Cards" : undefined}
          actionLink={!showMastered ? "#" : undefined}
          onActionClick={!showMastered ? () => setShowMastered(true) : undefined}
        />
      ) : (
        <div className="grid grid-cols-1 gap-4">
          {cards.map((card) => {
            const isPremium = isCardPremium(card);
            
            return (
              <div key={card.id} className={`bg-white rounded-lg shadow-md overflow-hidden ${card.is_mastered ? 'border-l-4 border-green-500' : ''} ${isPremium ? 'border-orange-500 border' : ''}`}>
                {isPremium && (
                  <div className="bg-orange-500 text-white text-center py-1 font-bold">
                    PREMIUM CONTENT
                  </div>
                )}
                <div className="p-4">
                  <div className="flex justify-between mb-2">
                    <div>
                      <Link 
                        to={`/flashcards/study/${card.collection_id}`}
                        className="text-sm font-medium text-[#F37022] hover:underline"
                      >
                        {card.collection.title}
                      </Link>
                      <div className="flex items-center text-sm text-gray-500 mt-1">
                        <BookOpen className="h-4 w-4 mr-1" />
                        <Link 
                          to={`/flashcards/subjects/${card.collection.subject.id}`}
                          className="hover:text-[#F37022] hover:underline"
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
                        disabled={isPremium}
                      >
                        <Check className="h-5 w-5" />
                      </button>
                      {user && !isPremium && (
                        <>
                          <button
                            onClick={() => handleEditCard(card)}
                            className="p-1 rounded-full text-gray-600 hover:text-[#F37022] hover:bg-[#F37022]/10"
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
                    {isPremium ? (
                      <div className="premium-content-placeholder">
                        <div className="bg-orange-100 p-4 rounded-lg">
                          <div className="flex items-center gap-3">
                            <Lock className="h-10 w-10 text-orange-500" />
                            <div>
                              <h3 className="text-lg font-semibold text-orange-800">Premium Flashcard</h3>
                              <p className="text-orange-700">
                                Upgrade your account to access premium flashcard content.
                              </p>
                            </div>
                          </div>
                        </div>
                      </div>
                    ) : (
                      <>
                        <h3 className="text-lg font-medium text-gray-900 mb-2">{card.question}</h3>
                        <div className="bg-gray-50 p-3 rounded-md">
                          <p className="text-gray-700">{card.answer}</p>
                        </div>
                      </>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
} 