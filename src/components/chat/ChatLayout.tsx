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
    deleteThread,
    updateThreadTitle
  } = useThreads();

  const {
    messages,
    loading: messagesLoading,
    sendMessage,
    isGenerating
  } = useMessages(activeThread, (firstMessage) => {
    if (activeThread) {
      updateThreadTitle(activeThread, firstMessage);
    }
  });

  // Set active thread to most recent thread on initial load
  useEffect(() => {
    if (!activeThread && threads.length > 0) {
      setActiveThread(threads[0].id);
    }
  }, [threads, activeThread]);

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
      await deleteThread(threadId);
      if (activeThread === threadId) {
        // Set active thread to the next available thread
        const remainingThreads = threads.filter(t => t.id !== threadId);
        setActiveThread(remainingThreads.length > 0 ? remainingThreads[0].id : null);
      }
    } catch (error) {
      console.error('Failed to delete thread:', error);
    }
  };

  const handleRenameThread = async (threadId: string, newTitle: string) => {
    try {
      await updateThread(threadId, newTitle);
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
        activeTab={activeThread || ''}
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
              onSendMessage={sendMessage}
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