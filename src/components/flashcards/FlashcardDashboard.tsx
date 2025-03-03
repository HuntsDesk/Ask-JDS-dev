import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { supabase } from '@/lib/supabase';
import Card from './Card';
import EmptyState from './EmptyState';
import LoadingSpinner from './LoadingSpinner';
import ErrorMessage from './ErrorMessage';
import { Brain, BookOpen, Clock, BadgeCheck } from 'lucide-react';
import useFlashcardAuth from '@/hooks/useFlashcardAuth';

interface FlashcardSet {
  id: string;
  title: string;
  description: string;
  card_count: number;
  created_at: string;
  subject: {
    id: string;
    name: string;
  };
}

interface StudyStats {
  totalStudySessions: number;
  totalCardsStudied: number;
  masteredCards: number;
  averageScore: number;
}

export default function FlashcardDashboard() {
  const { user } = useFlashcardAuth();
  const [recentSets, setRecentSets] = useState<FlashcardSet[]>([]);
  const [popularSets, setPopularSets] = useState<FlashcardSet[]>([]);
  const [stats, setStats] = useState<StudyStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    Promise.all([
      fetchRecentSets(),
      fetchPopularSets(),
      fetchStudyStats()
    ]).finally(() => {
      setLoading(false);
    });
  }, []);

  async function fetchRecentSets() {
    try {
      const { data, error } = await supabase
        .from('flashcard_collections')
        .select(`
          id,
          title,
          description,
          created_at,
          subject:subject_id(id, name)
        `)
        .order('created_at', { ascending: false })
        .limit(3);

      if (error) throw error;

      // Get card counts for each set
      const setsWithCounts = await Promise.all(
        (data || []).map(async (set) => {
          const { count, error: countError } = await supabase
            .from('flashcards')
            .select('*', { count: 'exact', head: true })
            .eq('collection_id', set.id);
            
          if (countError) throw countError;
          
          return {
            ...set,
            card_count: count || 0
          };
        })
      );
      
      setRecentSets(setsWithCounts);
    } catch (err: any) {
      console.error('Error fetching recent sets:', err);
      setError(err.message);
    }
  }

  async function fetchPopularSets() {
    try {
      // In a real app, this would query based on study sessions or user interactions
      // For now, we'll just get some sets with the most cards
      const { data, error } = await supabase
        .from('flashcard_collections')
        .select(`
          id,
          title,
          description,
          created_at,
          subject:subject_id(id, name)
        `)
        .limit(3);

      if (error) throw error;

      // Get card counts for each set
      const setsWithCounts = await Promise.all(
        (data || []).map(async (set) => {
          const { count, error: countError } = await supabase
            .from('flashcards')
            .select('*', { count: 'exact', head: true })
            .eq('collection_id', set.id);
            
          if (countError) throw countError;
          
          return {
            ...set,
            card_count: count || 0
          };
        })
      );
      
      // Sort by card count
      setsWithCounts.sort((a, b) => b.card_count - a.card_count);
      
      setPopularSets(setsWithCounts);
    } catch (err: any) {
      console.error('Error fetching popular sets:', err);
      setError(err.message);
    }
  }

  async function fetchStudyStats() {
    try {
      if (!user) return;
      
      // In a real app, these would be actual queries
      // For now, we'll set some example stats
      setStats({
        totalStudySessions: 12,
        totalCardsStudied: 247,
        masteredCards: 182,
        averageScore: 86.5
      });
    } catch (err: any) {
      console.error('Error fetching study stats:', err);
    }
  }

  if (loading) {
    return <LoadingSpinner />;
  }

  if (error) {
    return <ErrorMessage message={error} />;
  }

  return (
    <div className="max-w-6xl mx-auto">
      <h1 className="text-3xl font-bold text-gray-900 mb-8">Dashboard</h1>
      
      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-12">
        <div className="bg-white rounded-xl shadow-sm p-6 border border-gray-100">
          <div className="flex items-center mb-4">
            <div className="bg-blue-100 p-3 rounded-lg">
              <Brain className="h-6 w-6 text-blue-600" />
            </div>
            <h3 className="ml-3 text-lg font-medium text-gray-800">Study Sessions</h3>
          </div>
          <p className="text-3xl font-bold text-gray-900">{stats?.totalStudySessions || 0}</p>
          <p className="text-sm text-gray-500 mt-1">Total sessions completed</p>
        </div>
        
        <div className="bg-white rounded-xl shadow-sm p-6 border border-gray-100">
          <div className="flex items-center mb-4">
            <div className="bg-indigo-100 p-3 rounded-lg">
              <BookOpen className="h-6 w-6 text-indigo-600" />
            </div>
            <h3 className="ml-3 text-lg font-medium text-gray-800">Cards Studied</h3>
          </div>
          <p className="text-3xl font-bold text-gray-900">{stats?.totalCardsStudied || 0}</p>
          <p className="text-sm text-gray-500 mt-1">Total cards reviewed</p>
        </div>
        
        <div className="bg-white rounded-xl shadow-sm p-6 border border-gray-100">
          <div className="flex items-center mb-4">
            <div className="bg-green-100 p-3 rounded-lg">
              <BadgeCheck className="h-6 w-6 text-green-600" />
            </div>
            <h3 className="ml-3 text-lg font-medium text-gray-800">Mastered</h3>
          </div>
          <p className="text-3xl font-bold text-gray-900">{stats?.masteredCards || 0}</p>
          <p className="text-sm text-gray-500 mt-1">Cards you've mastered</p>
        </div>
        
        <div className="bg-white rounded-xl shadow-sm p-6 border border-gray-100">
          <div className="flex items-center mb-4">
            <div className="bg-purple-100 p-3 rounded-lg">
              <Clock className="h-6 w-6 text-purple-600" />
            </div>
            <h3 className="ml-3 text-lg font-medium text-gray-800">Success Rate</h3>
          </div>
          <p className="text-3xl font-bold text-gray-900">{stats?.averageScore || 0}%</p>
          <p className="text-sm text-gray-500 mt-1">Average correct answers</p>
        </div>
      </div>

      {/* Recent Flashcard Sets */}
      <div className="mb-12">
        <div className="flex justify-between items-center mb-6">
          <h2 className="text-2xl font-semibold text-gray-900">Recent Sets</h2>
          <Link to="/flashcards/collections" className="text-indigo-600 hover:text-indigo-800 text-sm font-medium">
            View All Sets
          </Link>
        </div>
        
        {recentSets.length === 0 ? (
          <EmptyState 
            title="No recent flashcard sets"
            description="Start creating flashcard sets to see them here."
            icon={<BookOpen className="h-12 w-12 text-gray-400" />}
            actionText="Create a Set"
            actionLink="/flashcards/create"
          />
        ) : (
          <div className="grid md:grid-cols-3 gap-6">
            {recentSets.map(set => (
              <Card 
                key={set.id}
                title={set.title}
                description={set.description}
                tag={set.subject.name}
                count={set.card_count}
                link={`/flashcards/study/${set.id}`}
              />
            ))}
          </div>
        )}
      </div>

      {/* Popular Flashcard Sets */}
      <div className="mb-12">
        <div className="flex justify-between items-center mb-6">
          <h2 className="text-2xl font-semibold text-gray-900">Popular Sets</h2>
          <Link to="/flashcards/collections" className="text-indigo-600 hover:text-indigo-800 text-sm font-medium">
            View All Sets
          </Link>
        </div>
        
        {popularSets.length === 0 ? (
          <EmptyState 
            title="No popular flashcard sets"
            description="Start creating and studying flashcard sets to see them here."
            icon={<BookOpen className="h-12 w-12 text-gray-400" />}
            actionText="Create a Set"
            actionLink="/flashcards/create"
          />
        ) : (
          <div className="grid md:grid-cols-3 gap-6">
            {popularSets.map(set => (
              <Card 
                key={set.id}
                title={set.title}
                description={set.description}
                tag={set.subject.name}
                count={set.card_count}
                link={`/flashcards/study/${set.id}`}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  );
} 