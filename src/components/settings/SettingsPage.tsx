import React, { useEffect, useState, useRef, useContext } from 'react';
import { SubscriptionSettings } from './SubscriptionSettings';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useAuth } from '@/lib/auth';
import { ArrowLeft, MessageSquare } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useNavigate } from 'react-router-dom';
import { LoadingSpinner } from '@/components/LoadingSpinner';
import { useToast } from '@/hooks/use-toast';
import { Sidebar } from '@/components/chat/Sidebar';
import { cn } from '@/lib/utils';
import { useThreads } from '@/hooks/use-threads';
import { SelectedThreadContext, SidebarContext } from '@/App';

export function SettingsPage() {
  const { user, loading, signOut } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();
  const [isLoading, setIsLoading] = useState(true);
  const loadingTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  
  // Use the threads hook to fetch actual threads
  const { threads, loading: threadsLoading, deleteThread, updateThread } = useThreads();
  const { setSelectedThreadId } = useContext(SelectedThreadContext);
  const { isExpanded, setIsExpanded } = useContext(SidebarContext);

  // Sidebar functions
  const handleNewChat = () => {
    navigate('/chat');
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
    console.log('SettingsPage: handleThreadSelect called with thread ID:', threadId);
    setSelectedThreadId(threadId);
    
    // Debug log
    console.log('SettingsPage: Set global thread ID, now preparing navigation');
    
    // Use setTimeout to ensure context update happens before navigation
    setTimeout(() => {
      // Then navigate to the chat page with the selected thread ID
      console.log('SettingsPage: Now navigating to thread:', threadId);
      navigate(`/chat/${threadId}`);
    }, 0);
  };

  useEffect(() => {
    // Set a safety timeout to prevent infinite loading
    loadingTimeoutRef.current = setTimeout(() => {
      console.log('Safety timeout triggered for settings page loading');
      setIsLoading(false);
      toast({
        title: 'Loading timeout',
        description: 'Settings are taking longer than expected to load. You may need to refresh the page.',
        variant: 'default',
      });
    }, 8000); // 8 second timeout (increased from 5 seconds)

    // If auth is no longer loading, clear the timeout and update our loading state
    if (!loading) {
      if (loadingTimeoutRef.current) {
        clearTimeout(loadingTimeoutRef.current);
        loadingTimeoutRef.current = null;
      }
      setIsLoading(false);
    }

    // Cleanup timeout on unmount
    return () => {
      if (loadingTimeoutRef.current) {
        clearTimeout(loadingTimeoutRef.current);
      }
    };
  }, [loading, toast]);

  // If still loading, show spinner
  if (isLoading || loading) {
    return (
      <div className="flex flex-col justify-center items-center h-screen">
        <LoadingSpinner className="h-12 w-12 mb-4" />
        <p className="text-muted-foreground">Loading settings...</p>
      </div>
    );
  }

  // If no user after loading completes, redirect to home
  if (!user) {
    navigate('/', { replace: true });
    return null;
  }

  return (
    <div className="bg-background min-h-screen flex">
      {/* Chat Sidebar */}
      <Sidebar
        setActiveTab={handleThreadSelect}
        isDesktopExpanded={isExpanded}
        onDesktopExpandedChange={setIsExpanded}
        onNewChat={handleNewChat}
        onSignOut={signOut}
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
        <div className="container py-6 max-w-4xl mx-auto">
          <div className="flex items-center justify-between mb-6">
            <h1 className="text-3xl font-bold">Settings</h1>
          </div>
          
          <Tabs defaultValue="subscription" className="space-y-4">
            <TabsList>
              <TabsTrigger value="subscription">Subscription</TabsTrigger>
              <TabsTrigger value="account">Account</TabsTrigger>
            </TabsList>
            
            <TabsContent value="subscription" className="space-y-4">
              <Card>
                <CardHeader>
                  <CardTitle>Subscription Settings</CardTitle>
                  <CardDescription>
                    Manage your subscription and message usage
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <SubscriptionSettings />
                </CardContent>
              </Card>
            </TabsContent>
            
            <TabsContent value="account" className="space-y-4">
              <Card>
                <CardHeader>
                  <CardTitle>Account Settings</CardTitle>
                  <CardDescription>
                    Manage your account information
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-2">
                    <div>
                      <span className="font-semibold">Email:</span> {user.email}
                    </div>
                    {user.user_metadata && 'full_name' in user.user_metadata && (
                      <div>
                        <span className="font-semibold">Name:</span> {(user.user_metadata as any).full_name}
                      </div>
                    )}
                    <div>
                      <span className="font-semibold">User ID:</span> {user.id}
                    </div>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>
        </div>
      </div>
    </div>
  );
} 