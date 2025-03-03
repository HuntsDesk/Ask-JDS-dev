import React, { useEffect, useState } from 'react';
import { useSearchParams, Link, useNavigate } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import { Library, BookOpen, FileText, Search } from 'lucide-react';

interface SearchResult {
  id: string;
  title: string;
  type: 'collection' | 'subject' | 'card';
  subtitle?: string;
  description?: string;
  collection_id?: string;
}

export default function SearchResults() {
  const [searchParams] = useSearchParams();
  const query = searchParams.get('q') || '';
  const [results, setResults] = useState<SearchResult[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const navigate = useNavigate();

  useEffect(() => {
    if (query) {
      performSearch();
    } else {
      setResults([]);
      setLoading(false);
    }
  }, [query]);

  const performSearch = async () => {
    if (!query.trim()) return;
    
    setLoading(true);
    try {
      // Search collections
      const { data: collections, error: collectionsError } = await supabase
        .from('flashcard_collections')
        .select(`
          id,
          title,
          description,
          subject:subject_id (name)
        `)
        .ilike('title', `%${query}%`)
        .order('title');

      if (collectionsError) throw collectionsError;

      // Search subjects
      const { data: subjects, error: subjectsError } = await supabase
        .from('subjects')
        .select('id, name, description')
        .ilike('name', `%${query}%`)
        .order('name');

      if (subjectsError) throw subjectsError;

      // Search flashcards
      const { data: cards, error: cardsError } = await supabase
        .from('flashcards')
        .select(`
          id,
          question,
          answer,
          collection_id,
          collection:collection_id (title)
        `)
        .or(`question.ilike.%${query}%, answer.ilike.%${query}%`)
        .order('question');

      if (cardsError) throw cardsError;

      // Format results
      const formattedResults: SearchResult[] = [
        ...collections.map((collection): SearchResult => ({
          id: collection.id,
          title: collection.title,
          subtitle: collection.subject.name,
          description: collection.description,
          type: 'collection'
        })),
        ...subjects.map((subject): SearchResult => ({
          id: subject.id,
          title: subject.name,
          description: subject.description,
          type: 'subject'
        })),
        ...cards.map((card): SearchResult => ({
          id: card.id,
          title: card.question,
          subtitle: `In: ${card.collection.title}`,
          description: card.answer,
          type: 'card',
          collection_id: card.collection_id
        }))
      ];

      setResults(formattedResults);
    } catch (error) {
      console.error('Search error:', error);
      setError('An error occurred while searching. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleResultClick = (result: SearchResult) => {
    switch (result.type) {
      case 'collection':
        navigate(`/study/${result.id}`);
        break;
      case 'subject':
        navigate(`/subject/${result.id}`);
        break;
      case 'card':
        navigate(`/study/${result.collection_id}`);
        break;
    }
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center min-h-[50vh]">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-indigo-600"></div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="max-w-4xl mx-auto">
        <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded">
          {error}
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900 mb-2">Search Results</h1>
        <p className="text-gray-600">
          {results.length} results for "{query}"
        </p>
      </div>

      {results.length === 0 ? (
        <div className="bg-white p-8 rounded-lg shadow-md text-center">
          <Search className="h-16 w-16 text-gray-400 mx-auto mb-4" />
          <h2 className="text-2xl font-bold text-gray-900 mb-4">No results found</h2>
          <p className="text-gray-600 mb-6">
            We couldn't find any matches for "{query}". Try different keywords or check your spelling.
          </p>
        </div>
      ) : (
        <div className="space-y-8">
          {/* Collections */}
          {results.filter(r => r.type === 'collection').length > 0 && (
            <div>
              <h2 className="text-xl font-semibold text-gray-900 mb-4">Collections</h2>
              <div className="bg-white rounded-lg shadow-md overflow-hidden">
                <ul className="divide-y divide-gray-200">
                  {results
                    .filter(r => r.type === 'collection')
                    .map(result => (
                      <li 
                        key={`${result.type}-${result.id}`}
                        className="p-4 hover:bg-gray-50 cursor-pointer"
                        onClick={() => handleResultClick(result)}
                      >
                        <div className="flex items-start">
                          <Library className="h-5 w-5 text-indigo-600 mt-1 mr-3 flex-shrink-0" />
                          <div>
                            <h3 className="text-lg font-medium text-gray-900">{result.title}</h3>
                            {result.subtitle && (
                              <p className="text-sm text-indigo-600">{result.subtitle}</p>
                            )}
                            {result.description && (
                              <p className="text-gray-600 mt-1">{result.description}</p>
                            )}
                          </div>
                        </div>
                      </li>
                    ))}
                </ul>
              </div>
            </div>
          )}

          {/* Subjects */}
          {results.filter(r => r.type === 'subject').length > 0 && (
            <div>
              <h2 className="text-xl font-semibold text-gray-900 mb-4">Subjects</h2>
              <div className="bg-white rounded-lg shadow-md overflow-hidden">
                <ul className="divide-y divide-gray-200">
                  {results
                    .filter(r => r.type === 'subject')
                    .map(result => (
                      <li 
                        key={`${result.type}-${result.id}`}
                        className="p-4 hover:bg-gray-50 cursor-pointer"
                        onClick={() => handleResultClick(result)}
                      >
                        <div className="flex items-start">
                          <BookOpen className="h-5 w-5 text-indigo-600 mt-1 mr-3 flex-shrink-0" />
                          <div>
                            <h3 className="text-lg font-medium text-gray-900">{result.title}</h3>
                            {result.description && (
                              <p className="text-gray-600 mt-1">{result.description}</p>
                            )}
                          </div>
                        </div>
                      </li>
                    ))}
                </ul>
              </div>
            </div>
          )}

          {/* Flashcards */}
          {results.filter(r => r.type === 'card').length > 0 && (
            <div>
              <h2 className="text-xl font-semibold text-gray-900 mb-4">Flashcards</h2>
              <div className="bg-white rounded-lg shadow-md overflow-hidden">
                <ul className="divide-y divide-gray-200">
                  {results
                    .filter(r => r.type === 'card')
                    .map(result => (
                      <li 
                        key={`${result.type}-${result.id}`}
                        className="p-4 hover:bg-gray-50 cursor-pointer"
                        onClick={() => handleResultClick(result)}
                      >
                        <div className="flex items-start">
                          <FileText className="h-5 w-5 text-indigo-600 mt-1 mr-3 flex-shrink-0" />
                          <div>
                            <h3 className="text-lg font-medium text-gray-900">{result.title}</h3>
                            {result.subtitle && (
                              <p className="text-sm text-indigo-600">{result.subtitle}</p>
                            )}
                            {result.description && (
                              <div className="mt-2 p-2 bg-gray-50 rounded-md">
                                <p className="text-gray-600 text-sm">
                                  <span className="font-medium">Answer:</span> {result.description}
                                </p>
                              </div>
                            )}
                          </div>
                        </div>
                      </li>
                    ))}
                </ul>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}