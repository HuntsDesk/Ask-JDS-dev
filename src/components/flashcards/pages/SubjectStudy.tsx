import React, { useState, useEffect } from 'react';
import { Link, useParams } from 'react-router-dom';
import { supabase } from '@/lib/supabase';
import useFlashcardAuth from '@/hooks/useFlashcardAuth';
import LoadingSpinner from '../LoadingSpinner';
import ErrorMessage from '../ErrorMessage';
import Toast from '../Toast';
import { 
  ArrowLeft, 
  ArrowRight, 
  Check, 
  Edit, 
  Eye, 
  EyeOff, 
  FileEdit, 
  PlusCircle, 
  Rotate3D, 
  Shuffle, 
  ChevronLeft 
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
}

export default function SubjectStudy() {
  const { id } = useParams<{ id: string }>();
  const { user } = useFlashcardAuth();
  
  const [subject, setSubject] = useState<Subject | null>(null);
  const [collections, setCollections] = useState<any[]>([]);
  const [cards, setCards] = useState<Flashcard[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [showAnswer, setShowAnswer] = useState(false);
  const [showMastered, setShowMastered] = useState(true);
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' } | null>(null);

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

  if (loading) {
    return <LoadingSpinner />;
  }

  if (error || !subject) {
    return (
      <ErrorMessage message={error || 'Subject not found'}>
        <Link to="/flashcards/subjects" className="text-[#F37022] hover:text-[#E36012]">
          Back to Subjects
        </Link>
      </ErrorMessage>
    );
  }

  if (collections.length === 0) {
    return (
      <div className="max-w-3xl mx-auto text-center py-12">
        <h1 className="text-2xl font-bold text-gray-900 mb-4">{subject.name}</h1>
        {subject.description && (
          <p className="text-gray-600 mb-6">{subject.description}</p>
        )}
        <p className="text-gray-700 mb-6">No collections in this subject yet.</p>
        <Link
          to={`/flashcards/create?subject=${id}`}
          className="bg-indigo-600 text-white px-4 py-2 rounded-md hover:bg-indigo-700"
        >
          Create Your First Collection
        </Link>
      </div>
    );
  }

  if (cards.length === 0) {
    return (
      <div className="max-w-3xl mx-auto text-center py-12">
        <h1 className="text-2xl font-bold text-gray-900 mb-4">{subject.name}</h1>
        {subject.description && (
          <p className="text-gray-600 mb-6">{subject.description}</p>
        )}
        {!showMastered ? (
          <div>
            <p className="text-gray-700 mb-6">All cards have been mastered! 🎉</p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <button
                onClick={() => setShowMastered(true)}
                className="bg-indigo-600 text-white px-4 py-2 rounded-md hover:bg-indigo-700"
              >
                Show Mastered Cards
              </button>
              
              <Link
                to={`/flashcards/create?subject=${id}`}
                className="bg-green-600 text-white px-4 py-2 rounded-md hover:bg-green-700"
              >
                Create New Collection
              </Link>
            </div>
          </div>
        ) : (
          <div>
            <p className="text-gray-700 mb-6">No flashcards in this subject yet.</p>
            <Link
              to={`/flashcards/create?subject=${id}`}
              className="bg-indigo-600 text-white px-4 py-2 rounded-md hover:bg-indigo-700"
            >
              Add Cards
            </Link>
          </div>
        )}
      </div>
    );
  }

  const currentCard = cards[currentIndex];

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
      
      <div className="flex justify-between items-center mb-6">
        <div>
          <Link to={`/flashcards/subjects`} className="text-indigo-600 hover:text-indigo-700">
            <h1 className="text-2xl font-bold text-gray-900 hover:text-indigo-600 transition-colors">{subject.name}</h1>
          </Link>
          {subject.description && (
            <p className="text-gray-600 mt-1">{subject.description}</p>
          )}
          <p className="text-sm text-gray-500 mt-2">
            {collections.length} {collections.length === 1 ? 'collection' : 'collections'} • 
            {cards.length} {cards.length === 1 ? 'card' : 'cards'} • 
            {currentIndex + 1} of {cards.length}
          </p>
        </div>
        
        <div className="text-right">
          <Link to={`/flashcards/study/${currentCard.collection_id}`} className="text-indigo-600 font-medium mb-2 hover:underline block">
            {currentCard.collection_title}
          </Link>
          
          <div className="flex items-center gap-3 justify-end">
            <Link
              to={`/flashcards/create?subject=${id}`}
              className="text-gray-600 hover:text-indigo-600"
              title="Create new collection in this subject"
            >
              <PlusCircle className="h-5 w-5" />
            </Link>
            {user && (
              <Link 
                to={`/flashcards/edit/${currentCard.collection_id}`} 
                className="text-gray-600 hover:text-indigo-600" 
                title="Edit Collection"
              >
                <Edit className="h-5 w-5" />
              </Link>
            )}
            {user && (
              <Link 
                to={`/flashcards/manage-cards/${currentCard.collection_id}`} 
                className="text-gray-600 hover:text-indigo-600" 
                title="Edit Cards"
              >
                <FileEdit className="h-5 w-5" />
              </Link>
            )}
            <button
              onClick={() => setShowMastered(!showMastered)}
              className="text-gray-600 hover:text-indigo-600"
              title={showMastered ? "Hide mastered cards" : "Show all cards"}
            >
              {showMastered ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
            </button>
            <button
              onClick={shuffleCards}
              className="text-gray-600 hover:text-indigo-600"
              title="Shuffle cards"
            >
              <Shuffle className="h-5 w-5" />
            </button>
          </div>
        </div>
      </div>

      <div className="bg-white rounded-lg shadow-lg overflow-hidden">
        <div className="p-8">
          <div
            className="min-h-[250px] flex items-center justify-center cursor-pointer"
            onClick={toggleAnswer}
          >
            <div className="text-center w-full">
              <h2 className="text-2xl font-semibold text-gray-900 mb-4">
                {showAnswer ? currentCard.answer : currentCard.question}
              </h2>
            </div>
          </div>
          
          <div className="text-center mt-4">
            <button
              className="text-indigo-600 hover:text-indigo-700 flex items-center gap-2 mx-auto"
              onClick={toggleAnswer}
            >
              <Rotate3D className="h-5 w-5" />
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
              disabled={currentCard.is_mastered}
              className={`flex items-center gap-1 px-3 py-1 rounded-md ${
                currentCard.is_mastered
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
    </div>
  );
} 