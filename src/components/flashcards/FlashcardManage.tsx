import React, { useState, useEffect } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { supabase } from '@/lib/supabase';
import { Flashcard, FlashcardCollection } from '@/types';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { 
  Dialog, 
  DialogContent, 
  DialogDescription, 
  DialogFooter, 
  DialogHeader, 
  DialogTitle 
} from '@/components/ui/dialog';
import { 
  ArrowLeft, 
  BookOpen, 
  Check, 
  Edit, 
  Plus, 
  Trash2, 
  X 
} from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import useFlashcardAuth from '@/hooks/useFlashcardAuth';
import { Skeleton } from '@/components/ui/skeleton';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';

export default function FlashcardManage() {
  const { user } = useFlashcardAuth();
  const { toast } = useToast();
  const navigate = useNavigate();
  const { collectionId } = useParams<{ collectionId: string }>();
  
  const [loading, setLoading] = useState(true);
  const [collection, setCollection] = useState<FlashcardCollection | null>(null);
  const [cards, setCards] = useState<Flashcard[]>([]);
  const [cardToDelete, setCardToDelete] = useState<Flashcard | null>(null);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [createDialogOpen, setCreateDialogOpen] = useState(false);
  
  const [currentCard, setCurrentCard] = useState<Flashcard | null>(null);
  const [newCard, setNewCard] = useState({
    question: '',
    answer: ''
  });

  useEffect(() => {
    if (user && collectionId) {
      loadCollection();
      loadCards();
    }
  }, [user, collectionId]);

  async function loadCollection() {
    try {
      const { data, error } = await supabase
        .from('flashcard_collections')
        .select(`
          *,
          subject:subject_id (
            name,
            id
          )
        `)
        .eq('id', collectionId)
        .single();
      
      if (error) throw error;
      
      setCollection(data);
    } catch (error) {
      console.error('Error loading collection:', error);
      toast({
        title: 'Error',
        description: 'Failed to load collection',
        variant: 'destructive'
      });
    }
  }

  async function loadCards() {
    try {
      setLoading(true);
      
      const { data, error } = await supabase
        .from('flashcards')
        .select('*')
        .eq('collection_id', collectionId)
        .order('created_at');
      
      if (error) throw error;
      
      setCards(data || []);
    } catch (error) {
      console.error('Error loading flashcards:', error);
      toast({
        title: 'Error',
        description: 'Failed to load flashcards',
        variant: 'destructive'
      });
    } finally {
      setLoading(false);
    }
  }

  async function createCard() {
    try {
      if (!newCard.question.trim() || !newCard.answer.trim()) {
        toast({
          title: 'Validation error',
          description: 'Both question and answer are required',
          variant: 'destructive'
        });
        return;
      }
      
      const { data, error } = await supabase
        .from('flashcards')
        .insert({
          question: newCard.question.trim(),
          answer: newCard.answer.trim(),
          is_mastered: false,
          collection_id: collectionId,
          user_id: user?.id
        })
        .select()
        .single();
      
      if (error) throw error;
      
      // Add to local state
      setCards([...cards, data]);
      
      toast({
        title: 'Flashcard created',
        description: 'New flashcard has been added to the collection',
        variant: 'default'
      });
      
      // Reset form and close dialog
      setNewCard({ question: '', answer: '' });
      setCreateDialogOpen(false);
    } catch (error) {
      console.error('Error creating flashcard:', error);
      toast({
        title: 'Error',
        description: 'Failed to create flashcard',
        variant: 'destructive'
      });
    }
  }

  async function updateCard() {
    if (!currentCard) return;
    
    try {
      if (!currentCard.question.trim() || !currentCard.answer.trim()) {
        toast({
          title: 'Validation error',
          description: 'Both question and answer are required',
          variant: 'destructive'
        });
        return;
      }
      
      const { error } = await supabase
        .from('flashcards')
        .update({
          question: currentCard.question.trim(),
          answer: currentCard.answer.trim()
        })
        .eq('id', currentCard.id);
      
      if (error) throw error;
      
      // Update local state
      setCards(cards.map(card => 
        card.id === currentCard.id ? currentCard : card
      ));
      
      toast({
        title: 'Flashcard updated',
        description: 'Flashcard has been updated successfully',
        variant: 'default'
      });
      
      // Close dialog
      setEditDialogOpen(false);
    } catch (error) {
      console.error('Error updating flashcard:', error);
      toast({
        title: 'Error',
        description: 'Failed to update flashcard',
        variant: 'destructive'
      });
    }
  }

  async function deleteCard() {
    if (!cardToDelete) return;
    
    try {
      const { error } = await supabase
        .from('flashcards')
        .delete()
        .eq('id', cardToDelete.id);
      
      if (error) throw error;
      
      // Update local state
      setCards(cards.filter(card => card.id !== cardToDelete.id));
      
      toast({
        title: 'Flashcard deleted',
        description: 'Flashcard has been deleted successfully',
        variant: 'default'
      });
      
      // Close dialog
      setDeleteDialogOpen(false);
      setCardToDelete(null);
    } catch (error) {
      console.error('Error deleting flashcard:', error);
      toast({
        title: 'Error',
        description: 'Failed to delete flashcard',
        variant: 'destructive'
      });
    }
  }

  async function toggleMastered(card: Flashcard) {
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
      
      toast({
        title: newMasteredState ? 'Card marked as mastered' : 'Card unmarked as mastered',
        variant: 'default'
      });
    } catch (error) {
      console.error('Error updating flashcard:', error);
      toast({
        title: 'Error',
        description: 'Failed to update flashcard',
        variant: 'destructive'
      });
    }
  }

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <Skeleton className="h-8 w-48" />
          <Skeleton className="h-10 w-24" />
        </div>
        <Skeleton className="h-4 w-full" />
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {[1, 2, 3, 4].map(i => (
            <Card key={i}>
              <CardHeader>
                <Skeleton className="h-6 w-3/4" />
              </CardHeader>
              <CardContent>
                <Skeleton className="h-16 w-full" />
              </CardContent>
              <CardFooter>
                <Skeleton className="h-10 w-full" />
              </CardFooter>
            </Card>
          ))}
        </div>
      </div>
    );
  }

  const masteredCards = cards.filter(card => card.is_mastered);
  const unmasteredCards = cards.filter(card => !card.is_mastered);

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <Button 
            variant="ghost" 
            className="mb-2 -ml-2"
            onClick={() => navigate(-1)}
          >
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back
          </Button>
          <h2 className="text-2xl font-bold">{collection?.title}</h2>
          <p className="text-gray-500">
            {collection?.subject?.name} • {cards.length} cards • {masteredCards.length} mastered
          </p>
        </div>
        <div className="flex gap-2">
          <Button 
            variant="outline" 
            asChild
          >
            <Link to={`/flashcards/study/${collectionId}`}>
              Study Collection
            </Link>
          </Button>
          <Button 
            onClick={() => {
              setNewCard({ question: '', answer: '' });
              setCreateDialogOpen(true);
            }}
          >
            <Plus className="h-4 w-4 mr-2" />
            Add Card
          </Button>
        </div>
      </div>
      
      <Tabs defaultValue="all">
        <TabsList>
          <TabsTrigger value="all">All Cards ({cards.length})</TabsTrigger>
          <TabsTrigger value="mastered">Mastered ({masteredCards.length})</TabsTrigger>
          <TabsTrigger value="unmastered">To Learn ({unmasteredCards.length})</TabsTrigger>
        </TabsList>
        
        <TabsContent value="all" className="mt-6">
          {cards.length === 0 ? (
            <div className="text-center py-12">
              <div className="inline-flex justify-center items-center p-6 bg-gray-100 rounded-full mb-4">
                <BookOpen className="h-10 w-10 text-gray-400" />
              </div>
              <h3 className="text-lg font-medium mb-2">No flashcards yet</h3>
              <p className="text-gray-500 mb-4">
                This collection doesn't have any flashcards yet. Add your first card to get started.
              </p>
              <Button 
                onClick={() => {
                  setNewCard({ question: '', answer: '' });
                  setCreateDialogOpen(true);
                }}
              >
                <Plus className="h-4 w-4 mr-2" />
                Add Your First Card
              </Button>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {cards.map(card => (
                <FlashcardItem 
                  key={card.id}
                  card={card}
                  onEdit={() => {
                    setCurrentCard(card);
                    setEditDialogOpen(true);
                  }}
                  onDelete={() => {
                    setCardToDelete(card);
                    setDeleteDialogOpen(true);
                  }}
                  onToggleMastered={() => toggleMastered(card)}
                />
              ))}
            </div>
          )}
        </TabsContent>
        
        <TabsContent value="mastered" className="mt-6">
          {masteredCards.length === 0 ? (
            <div className="text-center py-12">
              <h3 className="text-lg font-medium mb-2">No mastered cards</h3>
              <p className="text-gray-500">
                You haven't mastered any cards in this collection yet.
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {masteredCards.map(card => (
                <FlashcardItem 
                  key={card.id}
                  card={card}
                  onEdit={() => {
                    setCurrentCard(card);
                    setEditDialogOpen(true);
                  }}
                  onDelete={() => {
                    setCardToDelete(card);
                    setDeleteDialogOpen(true);
                  }}
                  onToggleMastered={() => toggleMastered(card)}
                />
              ))}
            </div>
          )}
        </TabsContent>
        
        <TabsContent value="unmastered" className="mt-6">
          {unmasteredCards.length === 0 ? (
            <div className="text-center py-12">
              <h3 className="text-lg font-medium mb-2">All cards mastered!</h3>
              <p className="text-gray-500">
                You've mastered all the cards in this collection. Great job!
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {unmasteredCards.map(card => (
                <FlashcardItem 
                  key={card.id}
                  card={card}
                  onEdit={() => {
                    setCurrentCard(card);
                    setEditDialogOpen(true);
                  }}
                  onDelete={() => {
                    setCardToDelete(card);
                    setDeleteDialogOpen(true);
                  }}
                  onToggleMastered={() => toggleMastered(card)}
                />
              ))}
            </div>
          )}
        </TabsContent>
      </Tabs>
      
      {/* Create Card Dialog */}
      <Dialog open={createDialogOpen} onOpenChange={setCreateDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Add New Flashcard</DialogTitle>
            <DialogDescription>
              Create a new flashcard for this collection
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-2">
              <Label htmlFor="question">Question</Label>
              <Textarea 
                id="question"
                value={newCard.question}
                onChange={(e) => setNewCard({...newCard, question: e.target.value})}
                placeholder="Enter the question or front side of the card"
                rows={3}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="answer">Answer</Label>
              <Textarea 
                id="answer"
                value={newCard.answer}
                onChange={(e) => setNewCard({...newCard, answer: e.target.value})}
                placeholder="Enter the answer or back side of the card"
                rows={3}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setCreateDialogOpen(false)}>Cancel</Button>
            <Button onClick={createCard}>Create Card</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      
      {/* Edit Card Dialog */}
      <Dialog open={editDialogOpen} onOpenChange={setEditDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Edit Flashcard</DialogTitle>
            <DialogDescription>
              Update this flashcard
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-2">
              <Label htmlFor="edit-question">Question</Label>
              <Textarea 
                id="edit-question"
                value={currentCard?.question || ''}
                onChange={(e) => setCurrentCard(currentCard ? {...currentCard, question: e.target.value} : null)}
                placeholder="Enter the question or front side of the card"
                rows={3}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="edit-answer">Answer</Label>
              <Textarea 
                id="edit-answer"
                value={currentCard?.answer || ''}
                onChange={(e) => setCurrentCard(currentCard ? {...currentCard, answer: e.target.value} : null)}
                placeholder="Enter the answer or back side of the card"
                rows={3}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditDialogOpen(false)}>Cancel</Button>
            <Button onClick={updateCard}>Update Card</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      
      {/* Delete Card Dialog */}
      <Dialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete Flashcard</DialogTitle>
            <DialogDescription>
              Are you sure you want to delete this flashcard? This action cannot be undone.
            </DialogDescription>
          </DialogHeader>
          <div className="py-4">
            <p className="font-medium">Question:</p>
            <p className="text-gray-700">{cardToDelete?.question}</p>
            <p className="font-medium mt-2">Answer:</p>
            <p className="text-gray-700">{cardToDelete?.answer}</p>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleteDialogOpen(false)}>Cancel</Button>
            <Button variant="destructive" onClick={deleteCard}>Delete</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

interface FlashcardItemProps {
  card: Flashcard;
  onEdit: () => void;
  onDelete: () => void;
  onToggleMastered: () => void;
}

function FlashcardItem({ card, onEdit, onDelete, onToggleMastered }: FlashcardItemProps) {
  return (
    <Card className={card.is_mastered ? "border-l-4 border-green-500" : ""}>
      <CardHeader className="pb-2">
        <div className="flex justify-between items-start">
          <CardTitle className="text-base">Question</CardTitle>
          <div className="flex gap-1">
            <Button
              variant="ghost"
              size="icon"
              onClick={onToggleMastered}
              title={card.is_mastered ? "Mark as not mastered" : "Mark as mastered"}
            >
              {card.is_mastered ? (
                <X className="h-4 w-4" />
              ) : (
                <Check className="h-4 w-4" />
              )}
            </Button>
            <Button
              variant="ghost"
              size="icon"
              onClick={onEdit}
              title="Edit card"
            >
              <Edit className="h-4 w-4" />
            </Button>
            <Button
              variant="ghost"
              size="icon"
              onClick={onDelete}
              title="Delete card"
            >
              <Trash2 className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        <div>
          <p className="text-gray-900">{card.question}</p>
        </div>
        <div>
          <h4 className="text-sm font-medium text-gray-500 mb-1">Answer</h4>
          <p className="text-gray-900">{card.answer}</p>
        </div>
      </CardContent>
    </Card>
  );
} 