import { useState, useEffect, useRef, useContext } from 'react';
import { useAuth } from '@/lib/auth';
import { useThreads } from '@/hooks/use-threads';
import { useMessages } from '@/hooks/use-messages';
import { Sidebar } from './Sidebar';
import { ChatInterface } from './ChatInterface';
import { Loader2 } from 'lucide-react';
import { Paywall } from '@/components/Paywall';
import { LoadingSpinner } from '@/components/LoadingSpinner';
import { useToast } from '@/hooks/use-toast';
import { useParams, useNavigate } from 'react-router-dom';
import { SelectedThreadContext, SidebarContext } from '@/App';

export function ChatLayout() {
  const { user, signOut } = useAuth();
  const [activeThread, setActiveThread] = useState<string | null>(null);
  const [loadingTimeout, setLoadingTimeout] = useState(false);
  const [messagesLoadingTimeout, setMessagesLoadingTimeout] = useState(false);
  const { toast } = useToast();
  const { id: threadIdFromUrl } = useParams<{ id?: string }>();
  const navigate = useNavigate();
  const { selectedThreadId, setSelectedThreadId } = useContext(SelectedThreadContext);
  const { isExpanded, setIsExpanded } = useContext(SidebarContext);

  const {
    threads,
    loading: threadsLoading,
    createThread,
    updateThread,
    deleteThread
  } = useThreads();

  // A helper function to log thread details
  const logThreadInfo = () => {
    console.log('----------- Thread Debug Info -----------');
    console.log('ThreadID from URL:', threadIdFromUrl);
    console.log('Global selectedThreadId:', selectedThreadId);
    console.log('Component activeThread:', activeThread);
    console.log('Available Threads:', threads.map(t => ({id: t.id, title: t.title})));
    console.log('Thread loading:', threadsLoading);
    console.log('----------------------------------------');
  };

  // Log thread info on important state changes
  useEffect(() => {
    logThreadInfo();
  }, [threadIdFromUrl, activeThread, threads, threadsLoading, selectedThreadId]);

  // Initialize the thread from URL or global state when component mounts
  useEffect(() => {
    // Make sure we have threads loaded
    if (threads.length === 0 || threadsLoading) {
      console.log('ChatLayout: Threads not loaded yet, waiting');
      return;
    }
    
    console.log('ChatLayout: Initializing thread selection with priorities:');
    console.log('1. URL Param:', threadIdFromUrl);
    console.log('2. Global Context:', selectedThreadId);
    console.log('3. Current Active:', activeThread);
    
    // PRIORITY 1: URL parameter (highest priority)
    if (threadIdFromUrl) {
      const threadExists = threads.some(t => t.id === threadIdFromUrl);
      if (threadExists) {
        console.log('ChatLayout: Using thread ID from URL:', threadIdFromUrl);
        setActiveThread(threadIdFromUrl);
        // Also update global context
        if (selectedThreadId !== threadIdFromUrl) {
          setSelectedThreadId(threadIdFromUrl);
        }
        return;
      } else {
        console.warn('ChatLayout: Thread from URL not found:', threadIdFromUrl);
      }
    }
    
    // PRIORITY 2: Global context state
    if (selectedThreadId) {
      const threadExists = threads.some(t => t.id === selectedThreadId);
      if (threadExists) {
        console.log('ChatLayout: Using thread ID from global context:', selectedThreadId);
        setActiveThread(selectedThreadId);
        
        // Update URL if needed
        if (threadIdFromUrl !== selectedThreadId) {
          console.log('ChatLayout: Updating URL to match global context:', selectedThreadId);
          navigate(`/chat/${selectedThreadId}`, { replace: true });
        }
        return;
      } else {
        console.warn('ChatLayout: Thread from global context not found:', selectedThreadId);
      }
    }
    
    // PRIORITY 3: Current active thread state
    if (activeThread) {
      const threadExists = threads.some(t => t.id === activeThread);
      if (threadExists) {
        console.log('ChatLayout: Keeping current active thread:', activeThread);
        
        // Update URL and global context if needed
        if (threadIdFromUrl !== activeThread) {
          navigate(`/chat/${activeThread}`, { replace: true });
        }
        if (selectedThreadId !== activeThread) {
          setSelectedThreadId(activeThread);
        }
        return;
      }
    }
    
    // PRIORITY 4: Default to first thread if nothing else is selected
    if (threads.length > 0) {
      const firstThreadId = threads[0].id;
      console.log('ChatLayout: Nothing selected, defaulting to first thread:', firstThreadId);
      setActiveThread(firstThreadId);
      setSelectedThreadId(firstThreadId);
      navigate(`/chat/${firstThreadId}`, { replace: true });
    }
  }, [threads, threadsLoading, threadIdFromUrl, selectedThreadId, activeThread, navigate]);

  // Change active thread when a new thread is selected
  const handleSetActiveThread = (threadId: string) => {
    console.log('ChatLayout: handleSetActiveThread called with thread ID:', threadId);
    if (threadId && threads.some(t => t.id === threadId)) {
      setActiveThread(threadId);
      setSelectedThreadId(threadId);
    } else {
      console.log('ChatLayout: Attempted to set invalid thread ID:', threadId);
    }
  };

  // Check if user has active subscription
  useEffect(() => {
    if (user) {
      const checkSubscription = async () => {
        const result = await import('@/lib/subscription').then(
          module => module.hasActiveSubscription(user.id)
        );
        console.log(`User subscription active: ${result}`);
      };
      
      checkSubscription();
    }
  }, [user]);

  // Add a safety timeout to prevent getting stuck in loading state
  useEffect(() => {
    let timeoutId: NodeJS.Timeout | null = null;
    
    if (threadsLoading && !loadingTimeout) {
      console.log('ChatLayout: Setting threads loading safety timeout (8 seconds)');
      timeoutId = setTimeout(() => {
        console.log('ChatLayout: Threads loading safety timeout triggered');
        setLoadingTimeout(true);
        toast({
          title: "Loading taking longer than expected",
          description: "We're having trouble loading your conversations. The database might be slow to respond.",
          variant: "destructive",
        });
      }, 8000); // Increased from 5000 to 8000ms (8 seconds)
    }
    
    return () => {
      if (timeoutId) {
        console.log('ChatLayout: Clearing threads loading safety timeout');
        clearTimeout(timeoutId);
      }
    };
  }, [threadsLoading, loadingTimeout, toast]);

  // Create a callback for updating thread titles
  const handleThreadTitleGenerated = async (title: string) => {
    if (activeThread) {
      console.log(`Updating thread title to "${title}" after 3 messages`);
      await updateThread(activeThread, { title });
    }
  };

  const messagesResult = useMessages(
    activeThread, 
    undefined, // onFirstMessage callback (not needed here)
    handleThreadTitleGenerated // Pass the title update callback
  );
  const messages = messagesResult?.messages || [];
  const messagesLoading = messagesResult?.loading || false;
  const isGenerating = messagesResult?.isGenerating || false;
  const showPaywall = messagesResult?.showPaywall || false;
  const handleClosePaywall = messagesResult?.handleClosePaywall;
  const messageCount = messagesResult?.messageCount || 0;
  const messageLimit = messagesResult?.messageLimit || 0;

  // Add a safety timeout for messages loading
  useEffect(() => {
    let timeoutId: NodeJS.Timeout | null = null;
    
    if (messagesLoading && !messagesLoadingTimeout && activeThread) {
      console.log('ChatLayout: Setting messages loading safety timeout (8 seconds)');
      timeoutId = setTimeout(() => {
        console.log('ChatLayout: Messages loading safety timeout triggered');
        setMessagesLoadingTimeout(true);
        toast({
          title: "Loading messages taking longer than expected",
          description: "We're having trouble loading your messages. The database might be slow to respond.",
          variant: "destructive",
        });
      }, 8000); // 8 second timeout (increased from 5 seconds)
    }
    
    if (!messagesLoading) {
      setMessagesLoadingTimeout(false);
    }
    
    return () => {
      if (timeoutId) {
        console.log('ChatLayout: Clearing messages loading safety timeout');
        clearTimeout(timeoutId);
      }
    };
  }, [messagesLoading, messagesLoadingTimeout, activeThread, toast]);

  // Set active thread to most recent thread on initial load
  // or create a default thread for new users
  useEffect(() => {
    // Create a mounted flag to handle async state updates
    let isMounted = true;
    
    console.log('ChatLayout: Thread state update', { 
      threadsCount: threads.length, 
      threadsLoading, 
      activeThread,
      hasUser: !!user
    });
    
    // Only proceed if we're done loading or if the loading has timed out
    if ((!threadsLoading || loadingTimeout) && isMounted) {
      if (threads.length > 0) {
        // If user has threads, set the most recent one as active
        if (!activeThread && isMounted) {
          console.log('ChatLayout: Setting active thread to most recent', threads[0].id);
          setActiveThread(threads[0].id);
        }
      } else if (user) {
        // If user has no threads, create a default thread
        // Only attempt thread creation if we haven't timed out and user is authenticated
        const hasCreatedDefaultThread = localStorage.getItem('hasCreatedDefaultThread');
        const attemptingThread = sessionStorage.getItem('attemptingThreadCreation');
        
        if (!hasCreatedDefaultThread && !loadingTimeout && !attemptingThread && isMounted) {
          console.log('Creating default thread for new user');
          
          // Set a flag in both session and local storage to prevent duplicates
          sessionStorage.setItem('attemptingThreadCreation', 'true');
          
          // Show toast notification to inform user
          toast({
            title: "Creating your first conversation",
            description: "This might take a moment due to slow database response times.",
            variant: "default",
          });
          
          // Delay thread creation slightly to avoid race conditions with auth
          setTimeout(() => {
            if (!isMounted) return;
            
            createThread()
              .then(thread => {
                if (!isMounted) return;
                
                if (thread) {
                  console.log('ChatLayout: Created default thread', thread.id);
                  localStorage.setItem('hasCreatedDefaultThread', 'true');
                  setActiveThread(thread.id);
                  toast({
                    title: "Conversation created",
                    description: "You can now start chatting.",
                    variant: "default",
                  });
                } else {
                  console.error('ChatLayout: Thread creation returned null');
                  toast({
                    title: "Error creating conversation",
                    description: "We couldn't create a new conversation. You can try clicking 'New Chat' button.",
                    variant: "destructive",
                  });
                }
                sessionStorage.removeItem('attemptingThreadCreation');
              })
              .catch(error => {
                if (!isMounted) return;
                
                console.error('Failed to create default thread:', error);
                toast({
                  title: "Error creating conversation",
                  description: "Database communication problem. Please try clicking 'New Chat' button or refreshing the page.",
                  variant: "destructive",
                });
                sessionStorage.removeItem('attemptingThreadCreation');
              });
          }, 500);
        } else if (loadingTimeout && isMounted) {
          // If the loading timed out, encourage the user to try manual creation
          console.log('ChatLayout: Skipping default thread creation due to database timeout');
          toast({
            title: "Database connection slow",
            description: "Try clicking 'New Chat' or refresh the page to create a new conversation.",
            variant: "default",
          });
        }
      }
    }
    
    return () => {
      isMounted = false;
      sessionStorage.removeItem('attemptingThreadCreation');
    };
  }, [threads, activeThread, threadsLoading, loadingTimeout, user, createThread, toast]);

  const handleNewChat = async () => {
    try {
      console.log('ChatLayout: Creating new thread');
      
      // Clear any stale creation flags
      sessionStorage.removeItem('attemptingThreadCreation');
      
      toast({
        title: "Creating new conversation",
        description: "This might take a moment due to slow database response times.",
        variant: "default",
      });
      
      // Set a timeout for thread creation
      const threadPromise = createThread();
      const timeoutPromise = new Promise((_, reject) => {
        setTimeout(() => reject(new Error('Thread creation timed out')), 10000); // Increased timeout
      });
      
      // Race the thread creation against the timeout
      const thread = await Promise.race([threadPromise, timeoutPromise]);
      
      if (thread) {
        console.log('ChatLayout: New thread created successfully', thread.id);
        setActiveThread(thread.id);
        toast({
          title: "Conversation created",
          description: "You can now start chatting.",
          variant: "default",
        });
      } else {
        console.error('ChatLayout: Thread creation returned null');
        toast({
          title: "Error creating conversation",
          description: "We couldn't create a new conversation. Please try again or refresh the page.",
          variant: "destructive",
        });
      }
    } catch (error) {
      console.error('Failed to create new chat:', error);
      
      // Check if this was a timeout error
      const errorMessage = error instanceof Error && error.message === 'Thread creation timed out'
        ? "Database is responding slowly. Please try again in a moment."
        : "We couldn't create a new conversation. Please try again or refresh the page.";
      
      toast({
        title: "Error creating conversation",
        description: errorMessage,
        variant: "destructive",
      });
    }
  };

  const handleSignOut = async () => {
    try {
      await signOut();
    } catch (error) {
      console.error('Failed to sign out:', error);
    }
  };

  const handleDeleteThread = async (threadId: string) => {
    try {
      // Modify the useThreads hook to expose a function for optimistic updates
      const success = await deleteThread(threadId);
      
      if (!success) {
        // If deletion fails, we could implement additional error handling here
        console.error('Thread deletion failed on the server');
      }
    } catch (error) {
      console.error('Failed to delete thread:', error);
    }
  };

  const handleRenameThread = async (threadId: string, newTitle: string) => {
    try {
      await updateThread(threadId, { title: newTitle });
    } catch (error) {
      console.error('Failed to rename thread:', error);
    }
  };

  const handleRefresh = () => {
    window.location.reload();
  };

  if (threadsLoading && !loadingTimeout) {
    console.log('ChatLayout: Showing loading spinner for threads');
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="flex flex-col items-center">
          <LoadingSpinner size="lg" />
          <p className="mt-4 text-gray-600">Loading your conversations...</p>
          <button 
            onClick={handleRefresh}
            className="mt-4 px-4 py-2 bg-[#F37022] hover:bg-[#E36012] text-white rounded"
          >
            Refresh
          </button>
        </div>
      </div>
    );
  }

  console.log('ChatLayout: Rendering main interface', { 
    threadsCount: threads.length, 
    activeThread, 
    messagesCount: messages.length 
  });

  return (
    <div className="flex h-screen overflow-hidden bg-background">
      <Sidebar
        setActiveTab={handleSetActiveThread}
        isDesktopExpanded={isExpanded}
        onDesktopExpandedChange={setIsExpanded}
        onNewChat={handleNewChat}
        onSignOut={handleSignOut}
        onDeleteThread={handleDeleteThread}
        onRenameThread={handleRenameThread}
        sessions={threads.map(thread => ({
          id: thread.id,
          title: thread.title,
          created_at: thread.created_at
        }))}
        currentSession={activeThread}
      />
      
      <main 
        className={`flex-1 h-screen transition-all duration-300 ${
          isExpanded ? 'ml-[var(--sidebar-width)]' : 'ml-[var(--sidebar-collapsed-width)]'
        }`}
      >
        <div className="h-full relative">
          {threadsLoading && !loadingTimeout ? (
            <div className="flex flex-col items-center justify-center h-full">
              <LoadingSpinner size="lg" />
              <p className="mt-4 text-sm text-gray-500">Loading conversations...</p>
            </div>
          ) : loadingTimeout ? (
            <div className="flex flex-col items-center justify-center h-full">
              <div className="text-center max-w-md mx-auto p-6">
                <h3 className="text-xl font-semibold mb-2">Taking longer than expected</h3>
                <p className="mb-4 text-gray-600">
                  We're having trouble loading your conversations. The database might be slow to respond.
                </p>
                <div className="flex justify-center">
                  <button
                    onClick={handleRefresh}
                    className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors"
                  >
                    Refresh
                  </button>
                </div>
              </div>
            </div>
          ) : (
            <>
              {activeThread ? (
                <ChatInterface
                  threadId={activeThread}
                  messages={messages}
                  loading={messagesLoading}
                  loadingTimeout={messagesLoadingTimeout}
                  onSend={messagesResult?.sendMessage}
                  onRefresh={handleRefresh}
                />
              ) : (
                <div className="flex flex-col items-center justify-center h-full">
                  <div className="text-center max-w-md mx-auto p-6">
                    <h3 className="text-xl font-semibold mb-2">No conversation selected</h3>
                    <p className="mb-4 text-gray-600">
                      {threads.length === 0 ? 
                        "We couldn't load any conversations. The database might be responding slowly." : 
                        "Select a conversation from the sidebar or create a new one to get started."}
                    </p>
                    <div className="flex justify-center gap-4">
                      <button
                        onClick={handleRefresh}
                        className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors"
                      >
                        Refresh
                      </button>
                      <button
                        onClick={handleNewChat}
                        className="px-4 py-2 bg-[#FF5A1F] text-white rounded-md hover:bg-[#E36012] transition-colors"
                      >
                        New Chat
                      </button>
                    </div>
                  </div>
                </div>
              )}
              {showPaywall && (
                <Paywall onCancel={handleClosePaywall} />
              )}
            </>
          )}
        </div>
      </main>
    </div>
  );
}