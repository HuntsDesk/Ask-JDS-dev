import React from 'react';
import { Link, useLocation } from 'react-router-dom';
import { Library, PlusCircle, BookOpen, FileText } from 'lucide-react';
import SearchBar from './SearchBar';
import useFlashcardAuth from '@/hooks/useFlashcardAuth';

export default function Navbar() {
  const { user } = useFlashcardAuth();
  const location = useLocation();

  // Determine create button text and link based on current page
  const getCreateConfig = () => {
    const path = location.pathname;
    
    if (path === '/flashcards/collections' || path.startsWith('/flashcards/collections')) {
      return {
        text: 'New Collection',
        link: '/flashcards/create-collection'
      };
    } else if (path === '/flashcards/subjects' || path.startsWith('/flashcards/subjects/')) {
      return {
        text: 'New Subject',
        link: '/flashcards/create-subject'
      };
    } else if (path === '/flashcards/flashcards') {
      return {
        text: 'New Flashcard',
        link: '/flashcards/create-flashcard'
      };
    } else if (path.includes('/flashcards/study/') || path.startsWith('/flashcards/study')) {
      return {
        text: 'Create Flashcard',
        link: '/flashcards/create-flashcard'
      };
    } else {
      return {
        text: 'Create',
        link: '/flashcards/create-collection'
      };
    }
  };

  const createConfig = getCreateConfig();

  return (
    <nav className="bg-white shadow-lg sticky top-0 z-10 w-full">
      <div className="max-w-6xl mx-auto px-4">
        <div className="flex items-center h-16">
          {/* Left section - Nav links */}
          <div className="flex items-center space-x-6 flex-shrink-0 mr-4">
            <Link 
              to="/flashcards/collections" 
              className={`flex items-center space-x-1 ${
                location.pathname === '/flashcards/collections' || location.pathname.includes('/flashcards/study/')
                  ? 'text-[#F37022] font-medium' 
                  : 'text-gray-600 hover:text-[#F37022]'
              }`}
            >
              <Library className="h-5 w-5" />
              <span>Collections</span>
            </Link>
            
            <Link 
              to="/flashcards/subjects" 
              className={`flex items-center space-x-1 ${
                location.pathname === '/flashcards/subjects' || location.pathname.includes('/flashcards/subjects/') 
                  ? 'text-[#F37022] font-medium' 
                  : 'text-gray-600 hover:text-[#F37022]'
              }`}
            >
              <BookOpen className="h-5 w-5" />
              <span>Subjects</span>
            </Link>
            
            <Link 
              to="/flashcards/flashcards" 
              className={`flex items-center space-x-1 ${
                location.pathname === '/flashcards/flashcards' 
                  ? 'text-[#F37022] font-medium' 
                  : 'text-gray-600 hover:text-[#F37022]'
              }`}
            >
              <FileText className="h-5 w-5" />
              <span>Flashcards</span>
            </Link>
          </div>

          {/* Middle section - Search */}
          <div className="hidden md:block flex-grow mx-4">
            <SearchBar />
          </div>

          {/* Right section - Create button */}
          <div className="flex-shrink-0 ml-4">
            {user && !location.pathname.includes('/flashcards/create') && (
              <Link 
                to={createConfig.link} 
                className="flex items-center gap-1 bg-[#F37022] text-white px-4 py-2 rounded-md hover:bg-[#E36012]"
              >
                <PlusCircle className="h-4 w-4" />
                <span>{createConfig.text}</span>
              </Link>
            )}
          </div>
        </div>
        
        {/* Mobile search bar */}
        <div className="md:hidden pb-3">
          <SearchBar />
        </div>
      </div>
    </nav>
  );
} 