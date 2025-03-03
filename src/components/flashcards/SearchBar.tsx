import React, { useState, useEffect, useRef } from 'react';
import { Search, X, Library, BookOpen, FileText } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/lib/supabase';

interface SearchResult {
  id: string;
  title: string;
  type: 'collection' | 'subject' | 'card';
  subtitle?: string;
  collection_id?: string;
}

export default function SearchBar() {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<SearchResult[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [showResults, setShowResults] = useState(false);
  const searchRef = useRef<HTMLDivElement>(null);
  const navigate = useNavigate();

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (searchRef.current && !searchRef.current.contains(event.target as Node)) {
        setShowResults(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, []);

  useEffect(() => {
    const delayDebounceFn = setTimeout(() => {
      if (query.trim().length >= 2) {
        performSearch();
      } else {
        setResults([]);
      }
    }, 300);

    return () => clearTimeout(delayDebounceFn);
  }, [query]);

  const performSearch = async () => {
    if (!query.trim()) return;
    
    setIsSearching(true);
    try {
      // Search collections
      const { data: collections, error: collectionsError } = await supabase
        .from('flashcard_collections')
        .select(`
          id,
          title,
          subject:subject_id (name)
        `)
        .ilike('title', `%${query}%`)
        .limit(5);

      if (collectionsError) throw collectionsError;

      // Search subjects
      const { data: subjects, error: subjectsError } = await supabase
        .from('subjects')
        .select('id, name, description')
        .ilike('name', `%${query}%`)
        .limit(5);

      if (subjectsError) throw subjectsError;

      // Search flashcards
      const { data: cards, error: cardsError } = await supabase
        .from('flashcards')
        .select(`
          id,
          question,
          collection_id,
          collection:collection_id (title)
        `)
        .or(`question.ilike.%${query}%, answer.ilike.%${query}%`)
        .limit(10);

      if (cardsError) throw cardsError;

      // Format results
      const formattedResults: SearchResult[] = [
        ...collections.map((collection): SearchResult => ({
          id: collection.id,
          title: collection.title,
          subtitle: collection.subject.name,
          type: 'collection'
        })),
        ...subjects.map((subject): SearchResult => ({
          id: subject.id,
          title: subject.name,
          subtitle: subject.description || 'Subject',
          type: 'subject'
        })),
        ...cards.map((card): SearchResult => ({
          id: card.id,
          title: card.question,
          subtitle: `In: ${card.collection.title}`,
          type: 'card',
          collection_id: card.collection_id
        }))
      ];

      setResults(formattedResults);
    } catch (error) {
      console.error('Search error:', error);
    } finally {
      setIsSearching(false);
    }
  };

  const handleResultClick = (result: SearchResult) => {
    setShowResults(false);
    setQuery('');
    
    switch (result.type) {
      case 'collection':
        navigate(`/flashcards/study/${result.id}`);
        break;
      case 'subject':
        navigate(`/flashcards/subjects/${result.id}`);
        break;
      case 'card':
        navigate(`/flashcards/study/${result.collection_id}`);
        break;
    }
  };

  const handleViewAllResults = () => {
    navigate(`/flashcards/search?q=${encodeURIComponent(query)}`);
    setShowResults(false);
  };

  return (
    <div className="relative w-full max-w-md" ref={searchRef}>
      <div className="relative">
        <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
          <Search className="h-5 w-5 text-gray-400" />
        </div>
        <input
          type="text"
          value={query}
          onChange={(e) => {
            setQuery(e.target.value);
            setShowResults(true);
          }}
          onFocus={() => setShowResults(true)}
          placeholder="Search collections, subjects, cards..."
          className="w-full p-3 pl-10 pr-16 border border-gray-300 rounded-lg shadow-sm text-gray-500 focus:outline-none focus:ring-[#F37022] focus:border-[#F37022] sm:text-sm"
        />
        {query && (
          <button
            className="absolute inset-y-0 right-0 pr-3 flex items-center"
            onClick={() => {
              setQuery('');
              setResults([]);
            }}
          >
            <X className="h-5 w-5 text-gray-400 hover:text-gray-500" />
          </button>
        )}
      </div>

      {showResults && query.length >= 2 && (
        <div className="absolute z-10 mt-1 w-full bg-white shadow-lg rounded-md overflow-hidden">
          {isSearching ? (
            <div className="p-4 text-center text-gray-500">
              <div className="animate-spin rounded-full h-5 w-5 border-t-2 border-b-2 border-[#F37022] mx-auto mb-2"></div>
              Searching...
            </div>
          ) : results.length > 0 ? (
            <>
              <ul className="max-h-60 overflow-y-auto">
                {results.map((result) => (
                  <li
                    key={`${result.type}-${result.id}`}
                    className="px-4 py-2 hover:bg-gray-100 cursor-pointer"
                    onClick={() => handleResultClick(result)}
                  >
                    <div className="flex items-center">
                      {result.type === 'collection' && <Library className="h-4 w-4 text-[#F37022] mr-2" />}
                      {result.type === 'subject' && <BookOpen className="h-4 w-4 text-[#F37022] mr-2" />}
                      {result.type === 'card' && <FileText className="h-4 w-4 text-[#F37022] mr-2" />}
                      <div>
                        <div className="font-medium text-gray-900">{result.title}</div>
                        {result.subtitle && (
                          <div className="text-xs text-gray-500">{result.subtitle}</div>
                        )}
                      </div>
                    </div>
                  </li>
                ))}
              </ul>
              <div className="border-t border-gray-100 p-2">
                <button 
                  onClick={handleViewAllResults}
                  className="w-full text-center text-sm text-[#F37022] hover:text-[#E36012] py-1"
                >
                  View all results
                </button>
              </div>
            </>
          ) : query.length >= 2 ? (
            <div className="p-4 text-center text-gray-500">
              No results found
            </div>
          ) : null}
        </div>
      )}
    </div>
  );
} 