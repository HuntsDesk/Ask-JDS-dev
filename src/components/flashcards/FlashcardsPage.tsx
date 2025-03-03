import React from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import Navbar from './Navbar';

// Import pages
import Home from './pages/Home';
import FlashcardSets from './FlashcardCollections';
import StudyMode from './pages/StudyMode';
import CreateSet from './pages/CreateSet';
import AllFlashcards from './pages/AllFlashcards';
import SearchResults from './pages/SearchResults';
// Additional pages will be implemented progressively
import EditCollection from './pages/EditCollection';
import AddCard from './pages/AddCard';
import ManageCards from './pages/ManageCards';
import ManageSubjects from './FlashcardSubjects';
import SubjectStudy from './pages/SubjectStudy';
import EditSubject from './pages/EditSubject';

export default function FlashcardsPage() {
  return (
    <div className="bg-gray-50 min-h-screen">
      <Navbar />
      <main className="container mx-auto px-4 py-8">
        <Routes>
          <Route path="/" element={<Home />} />
          <Route path="/sets" element={<FlashcardSets />} />
          <Route path="/study/:id" element={<StudyMode />} />
          <Route path="/subjects/:id" element={<SubjectStudy />} />
          <Route path="/subjects" element={<ManageSubjects />} />
          <Route path="/create" element={<CreateSet />} />
          <Route path="/flashcards" element={<AllFlashcards />} />
          <Route path="/flashcards/flashcards" element={<AllFlashcards />} />
          <Route path="/search" element={<SearchResults />} />
          <Route path="/edit/:id" element={<EditCollection />} />
          <Route path="/manage-cards/:id" element={<ManageCards />} />
          <Route path="/add-card/:id" element={<AddCard />} />
          <Route path="/edit-subject/:id" element={<EditSubject />} />
          <Route path="*" element={<Navigate to="/sets" replace />} />
        </Routes>
      </main>
    </div>
  );
} 