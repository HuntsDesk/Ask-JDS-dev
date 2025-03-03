import React from 'react';
import { Link, useLocation } from 'react-router-dom';
import { Library, PlusCircle, BookOpen, FileText } from 'lucide-react';
import SearchBar from './SearchBar';
import { useAuth } from '../contexts/AuthContext';

export default function Navbar() {
  const { user } = useAuth();
  const location = useLocation();

  return (
    <nav className="bg-white shadow-lg">
      <div className="container mx-auto px-4">
        <div className="flex justify-between items-center h-16">
          <div className="flex items-center space-x-6">
            <Link 
              to="/sets" 
              className={`flex items-center space-x-1 ${
                location.pathname === '/sets' 
                  ? 'text-indigo-600 font-medium' 
                  : 'text-gray-600 hover:text-indigo-600'
              }`}
            >
              <Library className="h-5 w-5" />
              <span>Collections</span>
            </Link>
            
            <Link 
              to="/subjects" 
              className={`flex items-center space-x-1 ${
                location.pathname === '/subjects' || location.pathname.startsWith('/subject/') 
                  ? 'text-indigo-600 font-medium' 
                  : 'text-gray-600 hover:text-indigo-600'
              }`}
            >
              <BookOpen className="h-5 w-5" />
              <span>Subjects</span>
            </Link>
            
            <Link 
              to="/flashcards" 
              className={`flex items-center space-x-1 ${
                location.pathname === '/flashcards' 
                  ? 'text-indigo-600 font-medium' 
                  : 'text-gray-600 hover:text-indigo-600'
              }`}
            >
              <FileText className="h-5 w-5" />
              <span>Flashcards</span>
            </Link>
          </div>

          <div className="hidden md:block mx-4 flex-grow max-w-md">
            <SearchBar />
          </div>

          <div className="flex items-center">
            {user && (
              <Link 
                to="/create" 
                className={`flex items-center space-x-1 ${
                  location.pathname === '/create' 
                    ? 'text-indigo-600 font-medium' 
                    : 'text-gray-600 hover:text-indigo-600'
                }`}
              >
                <PlusCircle className="h-5 w-5" />
                <span>Create</span>
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