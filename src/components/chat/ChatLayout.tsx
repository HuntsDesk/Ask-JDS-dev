import { useState, useEffect } from 'react';
import { useAuth } from '@/lib/auth';
import { useThreads } from '@/hooks/use-threads';
import { useMessages } from '@/hooks/use-messages';
import { Sidebar } from './Sidebar';
import { ChatInterface } from './ChatInterface';
import { AdminDashboard } from '@/components/admin/AdminDashboard';
import { Loader2 } from 'lucide-react';

export function ChatLayout() {
  const { user, signOut } = useAuth();
  const [isDesktopExpanded, setIsDesktopExpanded] = useState(true);
  const [activeThread, setActiveThread] = useState<string | null>(null);
  const [activeView, setActiveView] = useState<'chat' | 'admin'>('chat');

  const {
    threads,
    loading: threadsLoading,
    createThread,
    updateThread,
    deleteThread
  } = useThreads();

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

  // Set active thread to most recent thread on initial load
  // or create a default thread for new users
  useEffect(() => {
    if (!threadsLoading) {
      if (threads.length > 0) {
        // If user has threads, set the most recent one as active
        if (!activeThread) {
          setActiveThread(threads[0].id);
        }
      } else if (user) {
        // If user has no threads, create a default thread
        console.log('Creating default thread for new user');
        createThread().then(thread => {
          if (thread) {
            setActiveThread(thread.id);
          }
        }).catch(error => {
          console.error('Failed to create default thread:', error);
        });
      }
    }
  }, [threads, activeThread, threadsLoading, user, createThread]);

  const handleNewChat = async () => {
    try {
      const thread = await createThread();
      if (thread) {
        setActiveThread(thread.id);
        setActiveView('chat');
      }
    } catch (error) {
      console.error('Failed to create new chat:', error);
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

  if (threadsLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Loader2 className="w-8 h-8 animate-spin" />
      </div>
    );
  }

  return (
    <div className="flex h-screen overflow-hidden bg-background">
      <Sidebar
        setActiveTab={setActiveThread}
        isDesktopExpanded={isDesktopExpanded}
        onDesktopExpandedChange={setIsDesktopExpanded}
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
        activeView={activeView}
        setActiveView={setActiveView}
        isAdmin={user?.isAdmin || false}
      />
      
      <main 
        className={`flex-1 h-screen transition-all duration-300 ${
          isDesktopExpanded ? 'ml-[var(--sidebar-width)]' : 'ml-[var(--sidebar-collapsed-width)]'
        }`}
      >
        <div className="h-full relative">
          {activeView === 'chat' ? (
            <ChatInterface
              messages={messages}
              onSendMessage={messagesResult?.sendMessage}
              isLoading={messagesLoading}
              isGenerating={isGenerating}
            />
          ) : (
            <AdminDashboard />
          )}
        </div>
      </main>
    </div>
  );
}