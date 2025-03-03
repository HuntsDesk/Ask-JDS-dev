import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { supabase } from '@/lib/supabase';
import { ArrowLeft, ArrowRight, Check, X, RotateCcw, BookOpen } from 'lucide-react';
import LoadingSpinner from './LoadingSpinner';
import EmptyState from './EmptyState';
import ErrorMessage from './ErrorMessage';
import useToast from '@/hooks/useFlashcardToast';
import Toast from './Toast';

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
    id: string;
    name: string;
  };
}

export default function FlashcardStudy() {
  const { collectionId } = useParams<{ collectionId: string }>();
  const navigate = useNavigate();
  const { toast, showToast, hideToast } = useToast();
  
  const [collection, setCollection] = useState<FlashcardCollection | null>(null);
  const [flashcards, setFlashcards] = useState<Flashcard[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [showAnswer, setShowAnswer] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [studyComplete, setStudyComplete] = useState(false);
  const [stats, setStats] = useState({
    correct: 0,
    incorrect: 0,
    remaining: 0,
    mastered: 0
  });

  useEffect(() => {
    if (collectionId) {
      loadFlashcards();
    }
  }, [collectionId]);

  useEffect(() => {
    if (flashcards.length > 0) {
      updateStats();
    }
  }, [flashcards, currentIndex]);

  async function loadFlashcards() {
    try {
      setLoading(true);
      
      // Get collection details
      const { data: collectionData, error: collectionError } = await supabase
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
        .eq('id', collectionId)
        .single();
      
      if (collectionError) throw collectionError;
      
      // Get flashcards for this collection
      const { data: cardsData, error: cardsError } = await supabase
        .from('flashcards')
        .select('*')
        .eq('collection_id', collectionId)
        .order('created_at');
      
      if (cardsError) throw cardsError;
      
      if (!cardsData || cardsData.length === 0) {
        setFlashcards([]);
      } else {
        // Shuffle the cards
        const shuffled = [...cardsData].sort(() => Math.random() - 0.5);
        setFlashcards(shuffled);
      }
      
      setCollection(collectionData);
    } catch (err: any) {
      console.error('Error loading flashcards:', err);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  function updateStats() {
    const mastered = flashcards.filter(card => card.is_mastered).length;
    const remaining = flashcards.length - currentIndex;
    
    setStats({
      ...stats,
      remaining,
      mastered
    });
  }

  function handleFlip() {
    setShowAnswer(!showAnswer);
  }

  function handleNext() {
    if (currentIndex < flashcards.length - 1) {
      setCurrentIndex(currentIndex + 1);
      setShowAnswer(false);
    } else {
      setStudyComplete(true);
    }
  }

  function handlePrevious() {
    if (currentIndex > 0) {
      setCurrentIndex(currentIndex - 1);
      setShowAnswer(false);
    }
  }

  async function handleMarkCorrect() {
    if (!showAnswer) {
      setShowAnswer(true);
      return;
    }
    
    try {
      const updatedCards = [...flashcards];
      const currentCard = updatedCards[currentIndex];
      
      // Update mastery status in database
      const { error } = await supabase
        .from('flashcards')
        .update({ is_mastered: true })
        .eq('id', currentCard.id);
      
      if (error) throw error;
      
      // Update local state
      currentCard.is_mastered = true;
      setFlashcards(updatedCards);
      setStats({
        ...stats,
        correct: stats.correct + 1,
        mastered: stats.mastered + (currentCard.is_mastered ? 0 : 1)
      });
      
      handleNext();
    } catch (err: any) {
      console.error('Error marking card as correct:', err);
      showToast('Failed to update card status', 'error');
    }
  }

  async function handleMarkIncorrect() {
    if (!showAnswer) {
      setShowAnswer(true);
      return;
    }
    
    try {
      const updatedCards = [...flashcards];
      const currentCard = updatedCards[currentIndex];
      
      // Update mastery status in database
      const { error } = await supabase
        .from('flashcards')
        .update({ is_mastered: false })
        .eq('id', currentCard.id);
      
      if (error) throw error;
      
      // Update local state
      currentCard.is_mastered = false;
      setFlashcards(updatedCards);
      setStats({
        ...stats,
        incorrect: stats.incorrect + 1,
        mastered: stats.mastered - (currentCard.is_mastered ? 1 : 0)
      });
      
      handleNext();
    } catch (err: any) {
      console.error('Error marking card as incorrect:', err);
      showToast('Failed to update card status', 'error');
    }
  }

  function handleRestartStudy() {
    // Shuffle the cards again
    const shuffled = [...flashcards].sort(() => Math.random() - 0.5);
    setFlashcards(shuffled);
    setCurrentIndex(0);
    setShowAnswer(false);
    setStudyComplete(false);
    setStats({
      correct: 0,
      incorrect: 0,
      remaining: flashcards.length,
      mastered: flashcards.filter(card => card.is_mastered).length
    });
  }

  if (loading) {
    return <LoadingSpinner />;
  }

  if (error) {
    return <ErrorMessage message={error} />;
  }

  if (!collection || flashcards.length === 0) {
    return (
      <EmptyState
        title="No flashcards found"
        description="This collection doesn't have any flashcards yet."
        icon={<BookOpen className="h-12 w-12 text-gray-400" />}
        actionText="Go Back"
        actionLink="/flashcards/collections"
      />
    );
  }

  if (studyComplete) {
    const totalAnswered = stats.correct + stats.incorrect;
    const score = totalAnswered > 0 ? Math.round((stats.correct / totalAnswered) * 100) : 0;
    
    return (
      <div className="max-w-4xl mx-auto">
        {toast && (
          <Toast 
            message={toast.message} 
            type={toast.type} 
            onClose={hideToast} 
          />
        )}
        
        <div className="bg-white rounded-xl shadow-md p-8 text-center">
          <div className="inline-flex justify-center items-center p-6 bg-green-100 rounded-full mb-6">
            <Check className="h-12 w-12 text-green-600" />
          </div>
          
          <h2 className="text-2xl font-bold text-gray-900 mb-2">Study Session Complete!</h2>
          <p className="text-gray-600 mb-8">You've completed studying all flashcards in this collection.</p>
          
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
            <div className="bg-blue-50 p-4 rounded-lg">
              <p className="text-2xl font-bold text-blue-700">{totalAnswered}</p>
              <p className="text-sm text-blue-600">Cards Studied</p>
            </div>
            <div className="bg-green-50 p-4 rounded-lg">
              <p className="text-2xl font-bold text-green-700">{stats.correct}</p>
              <p className="text-sm text-green-600">Correct</p>
            </div>
            <div className="bg-red-50 p-4 rounded-lg">
              <p className="text-2xl font-bold text-red-700">{stats.incorrect}</p>
              <p className="text-sm text-red-600">Incorrect</p>
            </div>
            <div className="bg-orange-50 p-4 rounded-lg">
              <p className="text-2xl font-bold text-[#F37022]">{score}%</p>
              <p className="text-sm text-[#F37022]">Score</p>
            </div>
          </div>
          
          <div className="flex flex-col md:flex-row gap-4 justify-center">
            <button
              onClick={handleRestartStudy}
              className="flex items-center justify-center gap-2 bg-[#F37022] text-white px-6 py-3 rounded-md hover:bg-[#E36012]"
            >
              <RotateCcw className="h-5 w-5" />
              Study Again
            </button>
            <button
              onClick={() => navigate('/flashcards/collections')}
              className="flex items-center justify-center gap-2 bg-gray-200 text-gray-800 px-6 py-3 rounded-md hover:bg-gray-300"
            >
              <ArrowLeft className="h-5 w-5" />
              Back to Collections
            </button>
          </div>
        </div>
      </div>
    );
  }

  const currentCard = flashcards[currentIndex];

  return (
    <div className="max-w-4xl mx-auto">
      {toast && (
        <Toast 
          message={toast.message} 
          type={toast.type} 
          onClose={hideToast} 
        />
      )}
      
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900">{collection.title}</h1>
        <p className="text-gray-600 mt-2">{collection.description}</p>
        <div className="flex items-center mt-2">
          <span className="text-sm bg-blue-100 text-blue-800 px-2 py-1 rounded">
            {collection.subject.name}
          </span>
          <span className="text-sm text-gray-500 ml-4">
            Card {currentIndex + 1} of {flashcards.length}
          </span>
        </div>
      </div>
      
      <div className="grid grid-cols-4 gap-4 mb-6">
        <div className="bg-blue-50 p-3 rounded-lg text-center">
          <p className="text-xl font-bold text-blue-700">{flashcards.length}</p>
          <p className="text-xs text-blue-600">Total</p>
        </div>
        <div className="bg-green-50 p-3 rounded-lg text-center">
          <p className="text-xl font-bold text-green-700">{stats.correct}</p>
          <p className="text-xs text-green-600">Correct</p>
        </div>
        <div className="bg-red-50 p-3 rounded-lg text-center">
          <p className="text-xl font-bold text-red-700">{stats.incorrect}</p>
          <p className="text-xs text-red-600">Incorrect</p>
        </div>
        <div className="bg-orange-50 p-3 rounded-lg text-center">
          <p className="text-xl font-bold text-[#F37022]">{stats.mastered}</p>
          <p className="text-xs text-[#F37022]">Mastered</p>
        </div>
      </div>
      
      <div 
        className={`bg-white rounded-xl shadow-md p-8 mb-6 min-h-[300px] flex items-center justify-center cursor-pointer transition-all duration-300 ${
          showAnswer ? 'bg-blue-50' : ''
        }`}
        onClick={handleFlip}
      >
        <div className="text-center">
          <h3 className="text-xl font-medium text-gray-900 mb-2">
            {showAnswer ? 'Answer:' : 'Question:'}
          </h3>
          <p className="text-2xl font-bold">
            {showAnswer ? currentCard.answer : currentCard.question}
          </p>
          {!showAnswer && (
            <p className="text-gray-500 mt-4 text-sm">Click to reveal answer</p>
          )}
        </div>
      </div>
      
      <div className="flex justify-between items-center">
        <button
          onClick={handlePrevious}
          disabled={currentIndex === 0}
          className={`flex items-center gap-2 px-4 py-2 rounded-md ${
            currentIndex === 0
              ? 'bg-gray-100 text-gray-400 cursor-not-allowed'
              : 'bg-gray-200 text-gray-800 hover:bg-gray-300'
          }`}
        >
          <ArrowLeft className="h-5 w-5" />
          Previous
        </button>
        
        <div className="flex gap-3">
          <button
            onClick={handleMarkIncorrect}
            className={`flex items-center gap-2 px-4 py-2 rounded-md ${
              showAnswer
                ? 'bg-red-600 text-white hover:bg-red-700'
                : 'bg-gray-200 text-gray-800 hover:bg-gray-300'
            }`}
          >
            <X className="h-5 w-5" />
            {showAnswer ? 'Incorrect' : 'Show Answer'}
          </button>
          
          <button
            onClick={handleMarkCorrect}
            className={`flex items-center gap-2 px-4 py-2 rounded-md ${
              showAnswer
                ? 'bg-green-600 text-white hover:bg-green-700'
                : 'bg-gray-200 text-gray-800 hover:bg-gray-300'
            }`}
          >
            <Check className="h-5 w-5" />
            {showAnswer ? 'Correct' : 'Show Answer'}
          </button>
        </div>
        
        <button
          onClick={handleNext}
          disabled={currentIndex === flashcards.length - 1}
          className={`flex items-center gap-2 px-4 py-2 rounded-md ${
            currentIndex === flashcards.length - 1
              ? 'bg-gray-100 text-gray-400 cursor-not-allowed'
              : 'bg-gray-200 text-gray-800 hover:bg-gray-300'
          }`}
        >
          Next
          <ArrowRight className="h-5 w-5" />
        </button>
      </div>
    </div>
  );
} 