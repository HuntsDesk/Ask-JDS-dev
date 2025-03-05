import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';

// Query keys for better cache management
export const flashcardKeys = {
  all: ['flashcards'] as const,
  collections: () => [...flashcardKeys.all, 'collections'] as const,
  collection: (id: string) => [...flashcardKeys.collections(), id] as const,
  cards: (collectionId: string) => [...flashcardKeys.collection(collectionId), 'cards'] as const,
  subjects: () => [...flashcardKeys.all, 'subjects'] as const,
};

// Hook to fetch all collections
export function useFlashcardCollections(options = {}) {
  return useQuery(
    flashcardKeys.collections(),
    async () => {
      const { data, error } = await supabase
        .from('flashcard_collections')
        .select(`
          id,
          title,
          description,
          created_at,
          subject_id,
          subject:subject_id(id, name)
        `)
        .order('created_at', { ascending: false });
      
      if (error) throw error;
      return data || [];
    },
    {
      // Default options can be overridden
      staleTime: 5 * 60 * 1000, // 5 minutes
      ...options,
    }
  );
}

// Hook to fetch a specific collection with its cards
export function useFlashcardCollection(id: string, options = {}) {
  return useQuery(
    flashcardKeys.collection(id),
    async () => {
      // Fetch collection details
      const { data: collection, error: collectionError } = await supabase
        .from('flashcard_collections')
        .select(`
          id,
          title,
          description,
          subject_id,
          created_at,
          subject:subject_id (
            id,
            name
          )
        `)
        .eq('id', id)
        .single();
      
      if (collectionError) throw collectionError;
      
      return collection;
    },
    {
      // Don't fetch if no ID is provided
      enabled: !!id,
      ...options,
    }
  );
}

// Hook to fetch cards for a collection
export function useFlashcards(collectionId: string, options = {}) {
  return useQuery(
    flashcardKeys.cards(collectionId),
    async () => {
      const { data, error } = await supabase
        .from('flashcards')
        .select('*')
        .eq('collection_id', collectionId)
        .order('position')
        .order('created_at');
      
      if (error) throw error;
      return data || [];
    },
    {
      // Don't fetch if no collection ID is provided
      enabled: !!collectionId,
      ...options,
    }
  );
}

// Hook to fetch all subjects
export function useSubjects(options = {}) {
  return useQuery(
    flashcardKeys.subjects(),
    async () => {
      const { data, error } = await supabase
        .from('subjects')
        .select('id, name')
        .order('name');
      
      if (error) throw error;
      return data || [];
    },
    {
      staleTime: 10 * 60 * 1000, // 10 minutes
      ...options,
    }
  );
}

// Mutation to toggle a card's mastered status
export function useToggleCardMastered() {
  const queryClient = useQueryClient();
  
  return useMutation(
    async ({ cardId, isMastered }: { cardId: string; isMastered: boolean }) => {
      const { data, error } = await supabase
        .from('flashcards')
        .update({ is_mastered: isMastered })
        .eq('id', cardId)
        .select()
        .single();
      
      if (error) throw error;
      return data;
    },
    {
      // When mutation succeeds, update the card in the cache
      onSuccess: (updatedCard) => {
        // Invalidate affected queries
        queryClient.invalidateQueries(flashcardKeys.cards(updatedCard.collection_id));
      },
    }
  );
} 