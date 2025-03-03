import React, { useState, useEffect, useContext } from 'react';
import { Routes, Route, Navigate, useNavigate } from 'react-router-dom';
import Navbar from './Navbar';
import { Sidebar } from '@/components/chat/Sidebar'; 
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/lib/auth';
import { cn } from '@/lib/utils';
import { hasActiveSubscription } from '@/lib/subscription';
import { LoadingSpinner } from '@/components/LoadingSpinner';
import { useThreads } from '@/hooks/use-threads';
import { SelectedThreadContext, SidebarContext } from '@/App';

// Import pages
import Home from './pages/Home';
import FlashcardCollections from './FlashcardCollections';
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
import CreateSubject from './pages/CreateSubject';
import CreateFlashcardSelect from './pages/CreateFlashcardSelect';

export default function FlashcardsPage() {
  const { user, signOut } = useAuth();
  const navigate = useNavigate();
  const [hasSubscription, setHasSubscription] = useState<boolean | null>(null);
  const [loading, setLoading] = useState(true);
  
  // Use the threads hook to fetch actual threads
  const { threads, loading: threadsLoading, deleteThread, updateThread } = useThreads();
  const { setSelectedThreadId } = useContext(SelectedThreadContext);
  const { isExpanded, setIsExpanded } = useContext(SidebarContext);
  
  useEffect(() => {
    const checkSubscription = async () => {
      if (user) {
        try {
          setLoading(true);
          // TEMPORARY: Skip subscription check for testing
          // const hasAccess = await hasActiveSubscription(user.id);
          const hasAccess = true; // Temporarily force to true for testing
          setHasSubscription(hasAccess);
        } catch (error) {
          console.error("Error checking subscription:", error);
          setHasSubscription(true); // Temporarily force to true for testing
        } finally {
          setLoading(false);
        }
      } else {
        setHasSubscription(true); // Temporarily force to true for testing
        setLoading(false);
      }
    };
    
    checkSubscription();
  }, [user]);
  
  // Mock functions for sidebar - they don't need full implementation for flashcards page
  const handleNewChat = () => {
    navigate('/chat');
  };
  
  const handleSignOut = async () => {
    await signOut();
    navigate('/');
  };
  
  const handleDeleteThread = async (id: string) => {
    await deleteThread(id);
  };
  
  const handleRenameThread = async (id: string, newTitle: string) => {
    await updateThread(id, { title: newTitle });
  };
  
  // Handle thread selection from sidebar
  const handleThreadSelect = (threadId: string) => {
    // First set the global selected thread ID
    console.log('FlashcardsPage: handleThreadSelect called with thread ID:', threadId);
    setSelectedThreadId(threadId);
    
    // Debug log
    console.log('FlashcardsPage: Set global thread ID, now preparing navigation');
    
    // Use setTimeout to ensure context update happens before navigation
    setTimeout(() => {
      // Then navigate to the chat page with the selected thread ID
      console.log('FlashcardsPage: Now navigating to thread:', threadId);
      navigate(`/chat/${threadId}`);
    }, 0);
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center h-screen">
        <LoadingSpinner size="lg" />
        <p className="ml-2">Checking access...</p>
      </div>
    );
  }

  return (
    <div className="bg-gray-50 min-h-screen flex">
      {/* Chat Sidebar */}
      <Sidebar
        setActiveTab={handleThreadSelect}
        isDesktopExpanded={isExpanded}
        onDesktopExpandedChange={setIsExpanded}
        onNewChat={handleNewChat}
        onSignOut={handleSignOut}
        onDeleteThread={handleDeleteThread}
        onRenameThread={handleRenameThread}
        sessions={threads} // Use actual threads instead of empty array
        currentSession={null}
      />
      
      {/* Main Content */}
      <div 
        className={cn(
          "flex-1 transition-all duration-300",
          isExpanded ? "ml-[var(--sidebar-width)]" : "ml-[var(--sidebar-collapsed-width)]"
        )}
      >
        <Navbar />
        <main className="container mx-auto px-4 py-8">
          {!hasSubscription ? (
            // Show the upsell page if user doesn't have a subscription
            <Home />
          ) : (
            // Show flashcard functionality if user has subscription
            <Routes>
              {/* Redirect from root directly to collections */}
              <Route path="/" element={<Navigate to="/flashcards/collections" replace />} />
              <Route path="/collections" element={<FlashcardCollections />} />
              <Route path="/study/:id" element={<StudyMode />} />
              <Route path="/subjects/:id" element={<SubjectStudy />} />
              <Route path="/subjects" element={<ManageSubjects />} />
              <Route path="/create" element={<CreateSet />} />
              <Route path="/create-subject" element={<CreateSubject />} />
              <Route path="/create-flashcard" element={<CreateFlashcardSelect />} />
              <Route path="/flashcards" element={<AllFlashcards />} />
              <Route path="/flashcards/flashcards" element={<AllFlashcards />} />
              <Route path="/search" element={<SearchResults />} />
              <Route path="/edit/:id" element={<EditCollection />} />
              <Route path="/manage-cards/:id" element={<ManageCards />} />
              <Route path="/add-card/:id" element={<AddCard />} />
              <Route path="/edit-subject/:id" element={<EditSubject />} />
              <Route path="*" element={<Navigate to="/collections" replace />} />
            </Routes>
          )}
        </main>
      </div>
    </div>
  );
} 