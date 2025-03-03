import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import Navbar from './components/Navbar';
import FlashcardSets from './pages/FlashcardSets';
import StudyMode from './pages/StudyMode';
import CreateSet from './pages/CreateSet';
import Auth from './pages/Auth';
import EditCollection from './pages/EditCollection';
import AddCard from './pages/AddCard';
import ManageSubjects from './pages/ManageSubjects';
import ManageCards from './pages/ManageCards';
import SubjectStudy from './pages/SubjectStudy';
import SearchResults from './pages/SearchResults';
import AllFlashcards from './pages/AllFlashcards';
import EditSubject from './pages/EditSubject';

function App() {
  return (
    <Router>
      <div className="min-h-screen bg-gray-50">
        <Navbar />
        <main className="container mx-auto px-4 py-8">
          <Routes>
            <Route path="/" element={<Navigate to="/sets" replace />} />
            <Route path="/sets" element={<FlashcardSets />} />
            <Route path="/study/:id" element={<StudyMode />} />
            <Route path="/subject/:id" element={<SubjectStudy />} />
            <Route path="/create" element={<CreateSet />} />
            <Route path="/auth" element={<Auth />} />
            <Route path="/edit/:id" element={<EditCollection />} />
            <Route path="/add-card/:id" element={<AddCard />} />
            <Route path="/manage-cards/:id" element={<ManageCards />} />
            <Route path="/subjects" element={<ManageSubjects />} />
            <Route path="/edit-subject/:id" element={<EditSubject />} />
            <Route path="/search" element={<SearchResults />} />
            <Route path="/flashcards" element={<AllFlashcards />} />
          </Routes>
        </main>
      </div>
    </Router>
  );
}

export default App