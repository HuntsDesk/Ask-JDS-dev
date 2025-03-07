import React, { useState, useEffect } from 'react';
import { Link, useParams, useNavigate } from 'react-router-dom';
import { supabase } from '@/lib/supabase';
import useFlashcardAuth from '@/hooks/useFlashcardAuth';
import LoadingSpinner from '../LoadingSpinner';
import ErrorMessage from '../ErrorMessage';
import Toast from '../Toast';
import { FlashcardPaywall } from '@/components/FlashcardPaywall';
import { hasActiveSubscription } from '@/lib/subscription';
import { 
  ArrowLeft, 
  ArrowRight, 
  Check, 
  Edit, 
  Eye, 
  EyeOff, 
  FileEdit, 
  PlusCircle, 
  Rotate3D as Rotate, 
  Shuffle, 
  ChevronLeft, 
  Plus,
  Lock
} from 'lucide-react';

interface Flashcard {
  id: string;
  question: string;
  answer: string;
  collection_id: string;
  collection_title: string;
  is_mastered: boolean;
}

interface Subject {
  id: string;
  name: string;
  description: string;
  created_at: string;
  user_id: string;
  is_official?: boolean;
}

export default function SubjectStudy() {
  const { id } = useParams<{ id: string }>();
  const { user } = useFlashcardAuth();
  const navigate = useNavigate();
  
  const [subject, setSubject] = useState<Subject | null>(null);
  const [collections, setCollections] = useState<any[]>([]);
  const [cards, setCards] = useState<Flashcard[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [showAnswer, setShowAnswer] = useState(false);
  const [showMastered, setShowMastered] = useState(true);
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' } | null>(null);
  const [hasSubscription, setHasSubscription] = useState<boolean>(false);
  const [showPaywall, setShowPaywall] = useState(false);
  const [isOfficialContent, setIsOfficialContent] = useState(false);

  useEffect(() => {
    if (id) {
      loadData();
    }
  }, [id, showMastered]);

  const hideToast = () => {
    setToast(null);
  };

  const loadData = async () => {
    setLoading(true);
    try {
      // Check subscription status first
      if (user) {
        const hasAccess = await hasActiveSubscription(user.id);
        console.log("SubjectStudy: User subscription status:", hasAccess);
        setHasSubscription(hasAccess);
      } else {
        console.log("SubjectStudy: No user logged in, setting hasSubscription to false");
        setHasSubscription(false);
      }
      
      // Fetch subject details
      const { data: subjectData, error: subjectError } = await supabase
        .from('subjects')
        .select('*')
        .eq('id', id)
        .single();

      if (subjectError) {
        throw new Error(subjectError.message);
      }

      if (!subjectData) {
        throw new Error('Subject not found');
      }

      setSubject(subjectData);
      
      // Check if this is premium content
      const isOfficial = subjectData.is_official || false;
      console.log("SubjectStudy: Subject is_official:", isOfficial);
      setIsOfficialContent(isOfficial);
      
      // If it's premium content and user doesn't have subscription, show paywall immediately
      if (isOfficial && !hasSubscription) {
        console.log("Premium subject detected - user has no subscription - showing paywall");
        setShowPaywall(true);
        // We'll continue loading the data but it will be restricted
      }

      // Fetch collections for this subject
      const { data: collectionsData, error: collectionsError } = await supabase
        .from('flashcard_collections')
        .select('*')
        .eq('subject_id', id)
        .order('created_at', { ascending: false });

      if (collectionsError) {
        throw new Error(collectionsError.message);
      }

      setCollections(collectionsData || []);

      if (collectionsData && collectionsData.length > 0) {
        // Get all collection IDs
        const collectionIds = collectionsData.map(c => c.id);

        // Build query for flashcards
        let query = supabase
          .from('flashcards')
          .select('*')
          .in('collection_id', collectionIds);

        // If not showing mastered cards, filter them out
        if (!showMastered) {
          query = query.eq('is_mastered', false);
        }

        const { data: cardsData, error: cardsError } = await query;

        if (cardsError) {
          throw new Error(cardsError.message);
        }

        // Transform cards to include collection title
        const transformedCards = cardsData.map((card: any) => {
          const collection = collectionsData.find(c => c.id === card.collection_id);
          return {
            ...card,
            collection_title: collection ? collection.title : 'Unknown Collection'
          };
        });

        setCards(transformedCards || []);
        setCurrentIndex(0);
        setShowAnswer(false);
      } else {
        setCards([]);
      }
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const shuffleCards = () => {
    const shuffled = [...cards].sort(() => Math.random() - 0.5);
    setCards(shuffled);
    setCurrentIndex(0);
    setShowAnswer(false);
  };

  const goToNextCard = () => {
    if (currentIndex < cards.length - 1) {
      setCurrentIndex(currentIndex + 1);
      setShowAnswer(false);
    }
  };

  const goToPreviousCard = () => {
    if (currentIndex > 0) {
      setCurrentIndex(currentIndex - 1);
      setShowAnswer(false);
    }
  };

  const toggleAnswer = () => {
    setShowAnswer(!showAnswer);
  };

  const markAsMastered = async () => {
    if (!user) {
      setToast({
        message: 'You need to be signed in to mark cards as mastered',
        type: 'error'
      });
      return;
    }

    const currentCard = cards[currentIndex];
    
    try {
      const { error } = await supabase
        .from('flashcards')
        .update({ is_mastered: true })
        .eq('id', currentCard.id);

      if (error) {
        throw new Error(error.message);
      }

      setToast({
        message: 'Card marked as mastered!',
        type: 'success'
      });

      // Update local state
      if (!showMastered) {
        // If not showing mastered cards, remove this card from the array
        const updatedCards = cards.filter((_, index) => index !== currentIndex);
        setCards(updatedCards);
        
        // Adjust current index if needed
        if (currentIndex >= updatedCards.length) {
          setCurrentIndex(Math.max(0, updatedCards.length - 1));
        }
      } else {
        // Just update the card in the array
        const updatedCards = [...cards];
        updatedCards[currentIndex] = {
          ...currentCard,
          is_mastered: true
        };
        setCards(updatedCards);
      }
    } catch (err: any) {
      setToast({
        message: `Error: ${err.message}`,
        type: 'error'
      });
    }
  };

  const handleClosePaywall = () => {
    setShowPaywall(false);
    navigate('/flashcards/subjects');
  };

  if (loading) {
    return <LoadingSpinner />;
  }

  if (error) {
    return <ErrorMessage message={error} />;
  }

  if (!subject) {
    return <ErrorMessage message="Subject not found" />;
  }

  // If no cards found for this subject
  if (cards.length === 0) {
    return (
      <div className="max-w-3xl mx-auto">
        <div className="bg-white rounded-lg shadow-lg p-8 text-center">
          <h2 className="text-2xl font-bold mb-4">No cards found</h2>
          <p className="text-gray-600 mb-6">
            There are no cards associated with this subject yet.
          </p>
          <Link 
            to="/flashcards/create-collection" 
            className="inline-flex items-center gap-2 bg-indigo-600 text-white px-4 py-2 rounded-md hover:bg-indigo-700"
          >
            <Plus className="h-5 w-5" />
            Create a Collection
          </Link>
        </div>
      </div>
    );
  }

  const currentCard = cards[currentIndex];
  
  // Force premium content blurring for testing
  const forcePremiumTest = true; // Set to true for testing premium blurring
  const isPremiumBlurred = (isOfficialContent && !hasSubscription) || forcePremiumTest;
  
  console.log("SubjectStudy render - isPremiumBlurred:", isPremiumBlurred, "isOfficialContent:", isOfficialContent, "hasSubscription:", hasSubscription);

  return (
    <div className="max-w-3xl mx-auto">
      {toast && (
        <Toast 
          message={toast.message} 
          type={toast.type} 
          onClose={hideToast} 
        />
      )}

      {showPaywall && (
        <FlashcardPaywall onCancel={handleClosePaywall} />
      )}
      
      <div className="flex justify-between items-center mb-6">
        <div>
          <Link to="/flashcards/subjects" className="text-[#F37022] hover:text-[#E36012]">
            <ChevronLeft className="h-4 w-4" />
          </Link>
          <h1 className="text-2xl font-bold text-gray-900">{subject.name}</h1>
          {subject.description && (
            <p className="text-gray-600 mt-1">{subject.description}</p>
          )}
          <p className="text-sm text-gray-500 mt-2">
            {cards.length} {cards.length === 1 ? 'card' : 'cards'} • 
            {currentIndex + 1} of {cards.length}
          </p>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={() => setShowMastered(!showMastered)}
            className="text-gray-600 hover:text-gray-900"
          >
            {showMastered ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
          </button>
          <button
            onClick={shuffleCards}
            className="text-gray-600 hover:text-gray-900"
          >
            <Shuffle className="h-5 w-5" />
          </button>
        </div>
      </div>

      <div className="bg-white rounded-lg shadow-lg overflow-hidden relative">
        {isPremiumBlurred && (
          <div className="absolute top-0 left-0 right-0 bg-orange-500 text-white text-center py-2 z-10 font-bold">
            PREMIUM CONTENT - SUBSCRIPTION REQUIRED
          </div>
        )}
        
        <div className="p-8">
          <div
            className="min-h-[250px] flex items-center justify-center cursor-pointer"
            onClick={toggleAnswer}
          >
            <div className="text-center w-full">
              {isPremiumBlurred ? (
                <div className="premium-content-placeholder">
                  <div className="bg-orange-100 p-6 rounded-lg">
                    <div className="flex flex-col items-center gap-4">
                      <Lock className="h-12 w-12 text-orange-500" />
                      <h2 className="text-2xl font-semibold text-orange-800">Premium Flashcard</h2>
                      <p className="text-orange-700 max-w-md mx-auto">
                        This {showAnswer ? "answer" : "question"} is only available to premium subscribers. 
                        Upgrade your account to access our curated library of expert flashcards.
                      </p>
                    </div>
                  </div>
                </div>
              ) : (
                <>
                  <h2 className="text-2xl font-semibold text-gray-900 mb-4">
                    {showAnswer ? currentCard.answer : currentCard.question}
                  </h2>
                  <div className="text-sm text-gray-500">
                    From collection: {currentCard.collection_title}
                  </div>
                </>
              )}
            </div>
          </div>
          
          <div className="text-center mt-4">
            <button
              className="text-indigo-600 hover:text-indigo-700 flex items-center gap-2 mx-auto"
              onClick={toggleAnswer}
              disabled={isPremiumBlurred}
            >
              <Rotate className="h-5 w-5" />
              {showAnswer ? 'Show Question' : 'Show Answer'}
            </button>
          </div>
        </div>

        <div className="bg-gray-50 px-8 py-4 flex justify-between items-center">
          <button
            onClick={goToPreviousCard}
            disabled={currentIndex === 0}
            className="flex items-center gap-2 text-gray-600 hover:text-gray-900 disabled:opacity-50"
          >
            <ArrowLeft className="h-5 w-5" />
            Previous
          </button>

          <div className="flex items-center gap-3">
            <button
              onClick={markAsMastered}
              disabled={currentCard.is_mastered || isPremiumBlurred}
              className={`flex items-center gap-1 px-3 py-1 rounded-md ${
                currentCard.is_mastered || isPremiumBlurred
                  ? 'bg-gray-100 text-gray-400 cursor-not-allowed'
                  : 'bg-green-100 text-green-700 hover:bg-green-200'
              }`}
            >
              <Check className="h-4 w-4" />
              {currentCard.is_mastered ? 'Mastered' : 'Mark Mastered'}
            </button>
          </div>

          <button
            onClick={goToNextCard}
            disabled={currentIndex === cards.length - 1}
            className="flex items-center gap-2 text-gray-600 hover:text-gray-900 disabled:opacity-50"
          >
            Next
            <ArrowRight className="h-5 w-5" />
          </button>
        </div>
      </div>

      {isPremiumBlurred && (
        <div className="mt-8 text-center">
          <div className="mb-4 p-4 bg-orange-100 text-orange-800 rounded-lg">
            <p className="font-medium mb-2">Premium Content</p>
            <p>Upgrade to premium to access our expertly-curated flashcards and track your progress.</p>
          </div>
          <button
            onClick={() => setShowPaywall(true)}
            className="bg-orange-500 hover:bg-orange-600 text-white px-6 py-3 rounded-lg font-medium"
          >
            Upgrade to Premium for Full Access
          </button>
        </div>
      )}
    </div>
  );
} 