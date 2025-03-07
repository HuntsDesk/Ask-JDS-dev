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
import { FlashcardPaywall } from '@/components/FlashcardPaywall';

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
  const [showPaywall, setShowPaywall] = useState(false);
  const [currentPath, setCurrentPath] = useState<string | null>(null);
  
  // Use the threads hook to fetch actual threads
  const { threads, loading: threadsLoading, deleteThread, updateThread, createThread } = useThreads();
  const { setSelectedThreadId } = useContext(SelectedThreadContext);
  const { isExpanded, setIsExpanded } = useContext(SidebarContext);
  
  // Remove the forced paywall effect
  // useEffect(() => {
  //   console.log("Setting showPaywall to true immediately for testing");
  //   setShowPaywall(true);
  // }, []);

  useEffect(() => {
    const checkSubscription = async () => {
      if (user) {
        try {
          setLoading(true);
          console.log("Checking subscription status...")
          const hasAccess = await hasActiveSubscription(user.id);
          console.log("Subscription status:", hasAccess);
          // Use actual subscription status instead of forcing to false
          setHasSubscription(hasAccess);
        } catch (error) {
          console.error("Error checking subscription:", error);
          setHasSubscription(false);
        } finally {
          setLoading(false);
        }
      } else {
        console.log("No user logged in, setting hasSubscription to false");
        setHasSubscription(false);
        setLoading(false);
      }
    };
    
    checkSubscription();
  }, [user]);

  // Function to check if a collection is a user collection or premium one
  const checkAccessToCollection = async (collectionId: string) => {
    try {
      console.log("Checking access to collection:", collectionId);
      
      // Option to force the paywall to show for testing
      const forcePaywallTest = false; // Set to true to force paywall for testing
      
      if (forcePaywallTest) {
        console.log("TESTING MODE: Forcing paywall to show");
        setCurrentPath(window.location.pathname);
        setShowPaywall(true);
        return false;
      }
      
      // Original logic below:
      // Query to check if collection is premium content
      const { data, error } = await supabase
        .from('flashcard_collections')
        .select('is_official')
        .eq('id', collectionId)
        .single();
      
      if (error) throw error;
      
      console.log("Collection is premium:", data.is_official);
      console.log("User has subscription:", hasSubscription);
      
      // If it's a premium collection, user needs subscription
      if (data.is_official) {
        if (!hasSubscription) {
          console.log("Premium content detected, user doesn't have subscription. Showing paywall.");
          setCurrentPath(window.location.pathname);
          setShowPaywall(true);
          return false;
        } else {
          console.log("Premium content detected, but user has subscription. Allowing access.");
        }
      } else {
        console.log("Non-premium content. Allowing access.");
      }
      
      return true;
    } catch (error) {
      console.error("Error checking collection access:", error);
      return true; // Default to allowing access on error
    }
  };
  
  const handleClosePaywall = () => {
    setShowPaywall(false);
    // Navigate back to the previous page or to subjects if no previous path
    if (currentPath) {
      // Extract the base path without the ID
      const basePath = currentPath.split('/').slice(0, -1).join('/');
      navigate(basePath || '/flashcards/subjects');
    } else {
      navigate('/flashcards/subjects');
    }
  };
  
  // Mock functions for sidebar - they don't need full implementation for flashcards page
  const handleNewChat = () => {
    // Instead of just navigating to chat, first create a new thread
    createThread()
      .then(thread => {
        if (thread) {
          console.log('FlashcardsPage: Created new thread', thread.id);
          // Set the selected thread ID in the context first
          setSelectedThreadId(thread.id);
          // Then navigate to the new thread
          navigate(`/chat/${thread.id}`);
        } else {
          console.error('FlashcardsPage: Failed to create new thread');
          navigate('/chat'); // Fallback to chat home if creation fails
        }
      })
      .catch(error => {
        console.error('FlashcardsPage: Error creating new thread:', error);
        navigate('/chat'); // Fallback to chat home if error occurs
      });
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
      <div className="flex justify-center items-center h-screen dark:bg-gray-900">
        <LoadingSpinner size="lg" />
        <p className="ml-2 dark:text-gray-300">Checking access...</p>
      </div>
    );
  }

  return (
    <div className="bg-gray-50 dark:bg-gray-900 min-h-screen flex">
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
        <main className="container mx-auto px-4 py-8 dark:text-gray-200">
          {/* Show paywall if needed */}
          {showPaywall ? (
            <FlashcardPaywall onCancel={handleClosePaywall} />
          ) : (
            <Routes>
              {/* Redirect from root directly to subjects */}
              <Route path="/" element={<Navigate to="/flashcards/subjects" replace />} />
              <Route path="/collections" element={<FlashcardCollections />} />
              <Route path="/study/:id" element={
                <ProtectedResource 
                  checkAccess={checkAccessToCollection}
                  component={StudyMode} 
                />
              } />
              <Route path="/subjects/:id" element={<SubjectStudy />} />
              <Route path="/subjects" element={<ManageSubjects />} />
              <Route path="/create-collection" element={<CreateSet />} />
              <Route path="/create" element={<Navigate to="/flashcards/create-collection" replace />} />
              <Route path="/create-subject" element={<CreateSubject />} />
              <Route path="/create-flashcard" element={<CreateFlashcardSelect />} />
              <Route path="/flashcards" element={<AllFlashcards />} />
              <Route path="/flashcards/flashcards" element={<AllFlashcards />} />
              <Route path="/search" element={<SearchResults />} />
              <Route path="/edit/:id" element={<EditCollection />} />
              <Route path="/manage-cards/:id" element={<ManageCards />} />
              <Route path="/add-card/:id" element={<AddCard />} />
              <Route path="/edit-subject/:id" element={<EditSubject />} />
              <Route path="*" element={<Navigate to="/subjects" replace />} />
            </Routes>
          )}
        </main>
      </div>
    </div>
  );
}

// Component to wrap protected resources that require subscription verification
function ProtectedResource({ checkAccess, component: Component, ...rest }: any) {
  const { id } = rest.params || { id: null };
  const [canAccess, setCanAccess] = useState<boolean | null>(null);
  const [loading, setLoading] = useState(true);
  
  useEffect(() => {
    async function verifyAccess() {
      console.log("ProtectedResource: Verifying access for resource with ID:", id);
      if (id) {
        const hasAccess = await checkAccess(id);
        console.log("ProtectedResource: Access result:", hasAccess);
        setCanAccess(hasAccess);
      } else {
        console.log("ProtectedResource: No ID provided, defaulting to allowed");
        setCanAccess(true);
      }
      setLoading(false);
    }
    
    verifyAccess();
  }, [id, checkAccess]);
  
  console.log("ProtectedResource: Current state - loading:", loading, "canAccess:", canAccess);
  
  if (loading) {
    return (
      <div className="flex justify-center items-center py-12">
        <LoadingSpinner size="lg" />
        <p className="ml-2">Checking access...</p>
      </div>
    );
  }
  
  // If access is not granted, this will trigger the paywall in the parent component
  if (!canAccess) {
    console.log("ProtectedResource: Access denied, returning null");
    return null;
  }
  
  console.log("ProtectedResource: Access granted, rendering component");
  return <Component {...rest} />;
} 