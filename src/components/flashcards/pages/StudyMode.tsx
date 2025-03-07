import React, { useEffect, useState } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { ArrowLeft, ArrowRight, Rotate3D as Rotate, BookOpen, Shuffle, Check, Edit, EyeOff, Eye, FileEdit, FolderCog, ChevronLeft, Settings, PlusCircle, FileText, Lock } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import useFlashcardAuth from '@/hooks/useFlashcardAuth';
import LoadingSpinner from '../LoadingSpinner';
import ErrorMessage from '../ErrorMessage';
import Toast from '../Toast';
import useToast from '@/hooks/useFlashcardToast';
import Tooltip from '../Tooltip';
import { hasActiveSubscription } from '@/lib/subscription';
import { FlashcardPaywall } from '@/components/FlashcardPaywall';
import { useAuth } from '@/lib/auth';

interface Flashcard {
  id: string;
  question: string;
  answer: string;
  is_mastered: boolean;
}

interface FlashcardCollection {
  id: string;
  title: string;
  description: string;
  subject: {
    name: string;
    id: string;
  };
}

export default function StudyMode() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { user } = useAuth();
  const { toast, showToast, hideToast } = useToast();
  const [collection, setCollection] = useState<FlashcardCollection | null>(null);
  const [cards, setCards] = useState<Flashcard[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [showAnswer, setShowAnswer] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showMastered, setShowMastered] = useState(false);
  const [hasSubscription, setHasSubscription] = useState<boolean | null>(null);
  const [showPaywall, setShowPaywall] = useState(false);
  const [isOfficialContent, setIsOfficialContent] = useState(false);

  useEffect(() => {
    const loadData = async () => {
      try {
        setLoading(true);
        
        // Check subscription status
        if (user) {
          const hasAccess = await hasActiveSubscription(user.id);
          console.log("StudyMode: User subscription status:", hasAccess);
          setHasSubscription(hasAccess);
        } else {
          console.log("StudyMode: No user logged in, setting hasSubscription to false");
          setHasSubscription(false);
        }
        
        // Load collection data
        const { data: collectionData, error: collectionError } = await supabase
          .from('flashcard_collections')
          .select(`
            *,
            subject:subject_id(id, name)
          `)
          .eq('id', id)
          .single();
        
        if (collectionError) throw collectionError;
        setCollection(collectionData);
        
        // Check if this is premium content
        const isOfficial = collectionData.is_official || false;
        console.log("StudyMode: Collection is_official:", isOfficial);
        setIsOfficialContent(isOfficial);
        
        // If it's premium content and user doesn't have subscription, show paywall immediately
        if (isOfficial && !hasSubscription) {
          console.log("Premium content detected - user has no subscription - showing paywall");
          setShowPaywall(true);
          // Still load the cards but they'll be blurred
        }
        
        // Load flashcards
        const { data: flashcardsData, error: flashcardsError } = await supabase
          .from('flashcards')
          .select('*')
          .eq('collection_id', id)
          .order('position', { ascending: true });
        
        if (flashcardsError) throw flashcardsError;
        setCards(flashcardsData || []);
        
      } catch (err: any) {
        console.error('Error loading study data:', err);
        setError(err.message);
      } finally {
        setLoading(false);
      }
    };
    
    loadData();
  }, [id, user]);

  const shuffleCards = () => {
    const shuffled = [...cards]
      .map(value => ({ value, sort: Math.random() }))
      .sort((a, b) => a.sort - b.sort)
      .map(({ value }) => value);
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
      showToast('Please sign in to mark cards as mastered', 'error');
      return;
    }
    
    if (cards.length === 0 || currentIndex >= cards.length) return;
    
    const currentCard = cards[currentIndex];
    
    try {
      const { error } = await supabase
        .from('flashcards')
        .update({ is_mastered: true })
        .eq('id', currentCard.id);

      if (error) throw error;
      
      // Show toast notification
      showToast('Card marked as mastered', 'success');
      
      // If we're not showing mastered cards, remove it from the list
      if (!showMastered) {
        const newCards = cards.filter((_, i) => i !== currentIndex);
        setCards(newCards);
        
        // Adjust current index if needed
        if (currentIndex >= newCards.length) {
          setCurrentIndex(Math.max(0, newCards.length - 1));
        }
      } else {
        // Just update the card in the array
        const newCards = [...cards];
        newCards[currentIndex] = { ...currentCard, is_mastered: true };
        setCards(newCards);
      }
    } catch (err) {
      showToast(`Error: ${err.message}`, 'error');
    }
  };

  const handleShowPaywall = () => {
    setShowPaywall(true);
  };
  
  const handleClosePaywall = () => {
    setShowPaywall(false);
    navigate('/flashcards/collections');
  };

  if (loading) {
    return <LoadingSpinner />;
  }

  if (error || !collection) {
    return (
      <ErrorMessage 
        message={error || 'Collection not found'} 
      />
    );
  }

  if (cards.length === 0) {
    return (
      <div className="max-w-3xl mx-auto">
        <div className="mb-8">
          <Link to="/flashcards/collections" className="text-[#F37022] hover:text-[#E36012]">
            <ChevronLeft className="h-4 w-4" />
          </Link>
          <div className="flex items-center gap-2 mt-4 mb-2">
            <BookOpen className="h-5 w-5 text-[#F37022]" />
            <span className="text-sm font-medium text-[#F37022]">{collection.subject.name}</span>
          </div>
          <h1 className="text-3xl font-bold text-gray-900">{collection.title}</h1>
        </div>
        
        <div className="bg-white p-8 rounded-lg shadow-md text-center">
          <h2 className="text-2xl font-bold text-gray-900 mb-4">
            {showMastered 
              ? 'No flashcards in this collection yet' 
              : 'All cards mastered!'}
          </h2>
          <p className="text-gray-600 mb-6">
            {showMastered 
              ? 'Add some cards to start studying' 
              : 'You have mastered all the cards in this collection.'}
          </p>
          
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            {!showMastered && (
              <button
                onClick={() => setShowMastered(true)}
                className="bg-[#F37022] text-white px-4 py-2 rounded-md hover:bg-[#E36012]"
              >
                Show Mastered Cards
              </button>
            )}
            
            {user ? (
              <Link
                to={`/flashcards/add-card/${id}`}
                className="bg-green-600 text-white px-4 py-2 rounded-md hover:bg-green-700"
              >
                Add More Cards
              </Link>
            ) : (
              <Link
                to="/auth"
                className="bg-green-600 text-white px-4 py-2 rounded-md hover:bg-green-700"
              >
                Sign In to Add Cards
              </Link>
            )}
          </div>
        </div>
      </div>
    );
  }

  const currentCard = cards[currentIndex];
  
  // Force premium content blurring for testing
  const forcePremiumTest = true; // Set to true for testing premium blurring
  const isPremiumBlurred = (isOfficialContent && !hasSubscription) || forcePremiumTest;
  
  console.log("StudyMode render - isPremiumBlurred:", isPremiumBlurred, "isOfficialContent:", isOfficialContent, "hasSubscription:", hasSubscription);

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
      
      {showPaywall && (
        <FlashcardPaywall onCancel={handleClosePaywall} />
      )}
      
      <div className="flex justify-between items-center mb-6">
        <div>
          <Link to="/flashcards/collections" className="text-[#F37022] hover:text-[#E36012]">
            <ChevronLeft className="h-4 w-4" />
          </Link>
          <h1 className="text-2xl font-bold text-gray-900 hover:text-[#F37022] transition-colors">{collection.title}</h1>
          {collection.description && (
            <p className="text-gray-600 mt-1">{collection.description}</p>
          )}
          <p className="text-sm text-gray-500 mt-2">
            {cards.length} {cards.length === 1 ? 'card' : 'cards'} • 
            {currentIndex + 1} of {cards.length}
          </p>
        </div>
        
        <div className="text-right">
          <Link to={`/flashcards/subjects/${collection.subject.id}`} className="text-[#F37022] font-medium mb-2 hover:underline block">
            {collection.subject.name}
          </Link>
          
          <div className="flex items-center gap-3 justify-end">
            {user && (
              <Tooltip text="Edit Collection">
                <Link 
                  to={`/flashcards/edit/${id}`} 
                  className="text-gray-600 hover:text-[#F37022]"
                >
                  <FolderCog className="h-5 w-5" />
                </Link>
              </Tooltip>
            )}
            {user && (
              <Tooltip text="Edit Cards">
                <Link 
                  to={`/flashcards/manage-cards/${id}`} 
                  className="text-gray-600 hover:text-[#F37022]"
                >
                  <FileEdit className="h-5 w-5" />
                </Link>
              </Tooltip>
            )}
            <Tooltip text={showMastered ? "Hide mastered cards" : "Show all cards"}>
              <button
                onClick={() => setShowMastered(!showMastered)}
                className="text-gray-600 hover:text-[#F37022]"
              >
                {showMastered ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
              </button>
            </Tooltip>
            <Tooltip text="Shuffle cards">
              <button
                onClick={shuffleCards}
                className="text-gray-600 hover:text-[#F37022]"
              >
                <Shuffle className="h-5 w-5" />
              </button>
            </Tooltip>
          </div>
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
                <h2 className="text-2xl font-semibold text-gray-900 mb-4">
                  {showAnswer ? currentCard.answer : currentCard.question}
                </h2>
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
            onClick={handleShowPaywall}
            className="bg-orange-500 hover:bg-orange-600 text-white px-6 py-3 rounded-lg font-medium"
          >
            Upgrade to Premium for Full Access
          </button>
        </div>
      )}
    </div>
  );
} 