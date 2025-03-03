import React from 'react';
import { Link } from 'react-router-dom';
import { Brain, BookOpen, Plus } from 'lucide-react';

export default function Home() {
  return (
    <div className="max-w-4xl mx-auto text-center">
      <div className="mb-12">
        <Brain className="h-16 w-16 text-indigo-600 mx-auto mb-4" />
        <h1 className="text-4xl font-bold text-gray-900 mb-4">
          Welcome to FlashMaster
        </h1>
        <p className="text-xl text-gray-600">
          Master any subject with our interactive flashcard learning platform
        </p>
      </div>

      <div className="grid md:grid-cols-2 gap-8 mb-12">
        <div className="bg-white p-8 rounded-lg shadow-md">
          <BookOpen className="h-12 w-12 text-indigo-600 mx-auto mb-4" />
          <h2 className="text-2xl font-bold text-gray-900 mb-2">Study Sets</h2>
          <p className="text-gray-600 mb-4">
            Browse our collection of pre-made flashcard sets or review your own created sets
          </p>
          <Link
            to="/flashcards/sets"
            className="inline-block bg-indigo-600 text-white px-6 py-2 rounded-md hover:bg-indigo-700"
          >
            Browse Sets
          </Link>
        </div>

        <div className="bg-white p-8 rounded-lg shadow-md">
          <Plus className="h-12 w-12 text-indigo-600 mx-auto mb-4" />
          <h2 className="text-2xl font-bold text-gray-900 mb-2">Create Sets</h2>
          <p className="text-gray-600 mb-4">
            Create your own custom flashcard sets to study and share with others
          </p>
          <Link
            to="/flashcards/create"
            className="inline-block bg-indigo-600 text-white px-6 py-2 rounded-md hover:bg-indigo-700"
          >
            Create Set
          </Link>
        </div>
      </div>

      <div className="bg-indigo-50 p-8 rounded-lg">
        <h2 className="text-2xl font-bold text-gray-900 mb-4">
          Why Choose FlashMaster?
        </h2>
        <div className="grid md:grid-cols-3 gap-6">
          <div>
            <h3 className="font-bold text-gray-900 mb-2">Easy to Use</h3>
            <p className="text-gray-600">
              Intuitive interface for creating and studying flashcards
            </p>
          </div>
          <div>
            <h3 className="font-bold text-gray-900 mb-2">Track Progress</h3>
            <p className="text-gray-600">
              Monitor your learning progress over time
            </p>
          </div>
          <div>
            <h3 className="font-bold text-gray-900 mb-2">Share & Collaborate</h3>
            <p className="text-gray-600">
              Share your flashcard sets with other students
            </p>
          </div>
        </div>
      </div>
    </div>
  );
} 