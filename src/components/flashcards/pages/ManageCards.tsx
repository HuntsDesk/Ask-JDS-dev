import React, { useState, useEffect } from 'react';
import { useParams, Link, useLocation } from 'react-router-dom';
import { ArrowLeft, Trash2, Check, Eye, EyeOff, FileEdit, ChevronLeft } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import DeleteConfirmation from '../DeleteConfirmation';
import Toast from '../Toast';
import useToast from '@/hooks/useFlashcardToast';
import LoadingSpinner from '../LoadingSpinner';
import ErrorMessage from '../ErrorMessage';
import EmptyState from '../EmptyState';

interface Flashcard {
  id: string;
  question: string;
  answer: string;
  is_mastered: boolean;
  position: number;
}

interface Collection {
  id: string;
  title: string;
  subject: {
    name: string;
  };
}

export default function ManageCards() {
  const { id } = useParams<{ id: string }>();
  const location = useLocation();
  const { toast, showToast, hideToast } = useToast();
  const [collection, setCollection] = useState<Collection | null>(null);
  const [cards, setCards] = useState<Flashcard[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showMastered, setShowMastered] = useState(false);
  const [cardToDelete, setCardToDelete] = useState<Flashcard | null>(null);
  const [editingCardId, setEditingCardId] = useState<string | null>(
    location.state?.editCardId || null
  );

  useEffect(() => {
    loadData();
  }, [id, showMastered]);

  async function loadData() {
    try {
      setLoading(true);
      
      // Load collection details
      const { data: collectionData, error: collectionError } = await supabase
        .from('flashcard_collections')
        .select(`
          *,
          subject:subject_id (
            name
          )
        `)
        .eq('id', id)
        .single();

      if (collectionError) throw collectionError;
      setCollection(collectionData);

      // Load flashcards
      let query = supabase
        .from('flashcards')
        .select('*')
        .eq('collection_id', id)
        .order('position')
        .order('created_at');
      
      if (!showMastered) {
        query = query.eq('is_mastered', false);
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

  const toggleMastered = async (card: Flashcard) => {
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
          ? 'Card marked as mastered and will be hidden' 
          : 'Card unmarked as mastered',
        'success'
      );
      
      // If we're not showing mastered cards, remove it from the list
      if (!showMastered && newMasteredState) {
        setCards(cards.filter(c => c.id !== card.id));
      }
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
      
      // Update local state
      setCards(cards.filter(card => card.id !== cardToDelete.id));
      
      // Show toast notification
      showToast('Card deleted successfully', 'success');
      setCardToDelete(null);
    } catch (err: any) {
      showToast(`Error: ${err.message}`, 'error');
    }
  };

  const updateCard = async (cardId: string, field: 'question' | 'answer', value: string) => {
    try {
      const { error } = await supabase
        .from('flashcards')
        .update({ [field]: value })
        .eq('id', cardId);

      if (error) throw error;
      
      // Update local state
      setCards(cards.map(card => 
        card.id === cardId ? { ...card, [field]: value } : card
      ));

      showToast('Card updated successfully', 'success');
    } catch (err: any) {
      showToast(`Error: ${err.message}`, 'error');
    }
  };

  if (loading) {
    return <LoadingSpinner />;
  }

  if (error || !collection) {
    return (
      <ErrorMessage 
        message={error || 'Collection not found'} 
        backLink={{
          to: "/flashcards/collections",
          label: "Back to Collections"
        }}
      />
    );
  }

  return (
    <div className="max-w-3xl mx-auto">
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
      
      <div className="mb-8">
        <Link to={`/flashcards/edit/${id}`} className="text-[#F37022] hover:text-[#E36012] flex items-center gap-2">
          <ChevronLeft className="h-5 w-5" />
          Back to Collection
        </Link>
        <h1 className="text-3xl font-bold text-gray-900 mt-4">Manage Flashcards</h1>
        <p className="text-gray-600">
          {collection.title} • {collection.subject.name}
        </p>
      </div>

      <div className="bg-white p-6 rounded-lg shadow-md mb-6">
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-xl font-semibold text-gray-900">Flashcards</h2>
          <button
            onClick={() => setShowMastered(!showMastered)}
            className="flex items-center gap-2 text-gray-600 hover:text-[#F37022]"
          >
            {showMastered ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
            {showMastered ? 'Hide Mastered Cards' : 'Show Mastered Cards'}
          </button>
        </div>
        
        {cards.length === 0 ? (
          <EmptyState
            title="No flashcards found"
            description={showMastered 
              ? 'No flashcards in this collection yet.' 
              : 'No cards to study! All cards are mastered or collection is empty.'}
            icon={<FileEdit className="h-12 w-12 text-gray-400" />}
            actionText="Add New Cards"
            actionLink={`/flashcards/add-card/${id}`}
          />
        ) : (
          <div className="space-y-4">
            {cards.map((card, index) => (
              <div 
                key={card.id} 
                className={`border rounded-lg p-4 ${card.is_mastered ? 'bg-gray-50 border-gray-200' : 'border-gray-300'}`}
              >
                <div className="flex justify-between items-start mb-2">
                  <span className="text-sm font-medium text-gray-500">Card {index + 1}</span>
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
                    <button
                      onClick={() => setCardToDelete(card)}
                      className="p-1 rounded-full text-gray-600 hover:text-red-600 hover:bg-red-100"
                      title="Delete card"
                    >
                      <Trash2 className="h-5 w-5" />
                    </button>
                  </div>
                </div>
                <div className="space-y-2">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Question</label>
                    <input
                      type="text"
                      value={card.question}
                      onChange={(e) => updateCard(card.id, 'question', e.target.value)}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-[#F37022] focus:border-[#F37022]"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Answer</label>
                    <textarea
                      value={card.answer}
                      onChange={(e) => updateCard(card.id, 'answer', e.target.value)}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-[#F37022] focus:border-[#F37022]"
                      rows={3}
                    />
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
      
      <div className="flex justify-between">
        <Link
          to={`/flashcards/add-card/${id}`}
          className="bg-[#F37022] text-white px-4 py-2 rounded-md hover:bg-[#E36012]"
        >
          Add More Cards
        </Link>
        
        <Link
          to={`/flashcards/study/${id}`}
          className="bg-green-600 text-white px-4 py-2 rounded-md hover:bg-green-700"
        >
          Study This Collection
        </Link>
      </div>
    </div>
  );
} 