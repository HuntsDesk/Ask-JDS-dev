import { useState, useEffect, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { format, isToday, isYesterday, isThisWeek, isThisMonth } from 'date-fns';
import { ScrollArea } from '@/components/ui/scroll-area';
import { 
  ChevronRight, 
  LogOut, 
  Trash2, 
  MessageSquare,
  Shield,
  PlusCircle,
  Pencil,
  Settings,
  BookOpen,
  Pin,
  PinOff
} from 'lucide-react';
import {
  ContextMenu,
  ContextMenuContent,
  ContextMenuItem,
  ContextMenuTrigger,
} from '@/components/ui/context-menu';
import { Input } from '@/components/ui/input';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { SelectedThreadContext, SidebarContext } from '@/App';
import { useContext } from 'react';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';

interface SidebarProps {
  setActiveTab: (tab: string) => void;
  isDesktopExpanded: boolean;
  onDesktopExpandedChange: (expanded: boolean) => void;
  onNewChat: () => void;
  onSignOut: () => void;
  onDeleteThread: (id: string) => void;
  onRenameThread: (id: string, newTitle: string) => void;
  sessions: {
    id: string;
    title: string;
    created_at: string;
  }[];
  currentSession: string | null;
}

interface GroupedSessions {
  [key: string]: Array<{ id: string; title: string; created_at: string }>;
}

export function Sidebar({
  setActiveTab,
  isDesktopExpanded,
  onDesktopExpandedChange,
  onNewChat,
  onSignOut,
  onDeleteThread,
  onRenameThread,
  sessions,
  currentSession,
}: SidebarProps) {
  const [isMobile, setIsMobile] = useState(false);
  const [isContextMenuOpen, setIsContextMenuOpen] = useState(false);
  const [editingThread, setEditingThread] = useState<string | null>(null);
  const [editTitle, setEditTitle] = useState('');
  const location = useLocation();
  const navigate = useNavigate();
  const { selectedThreadId, setSelectedThreadId } = useContext(SelectedThreadContext);
  const { isPinned, setIsPinned, isExpanded, setIsExpanded } = useContext(SidebarContext);

  // Check current active section based on URL
  const isInChat = location.pathname.startsWith('/chat');
  const isInFlashcards = location.pathname.startsWith('/flashcards');
  const isInSettings = location.pathname.startsWith('/settings');
  
  // Check if we're in a specific chat thread by examining the URL or currentSession
  const isInChatThread = isInChat && (currentSession !== null || location.pathname.length > 5);

  // Sync local expanded state with global context
  useEffect(() => {
    if (isDesktopExpanded !== isExpanded) {
      setIsExpanded(isDesktopExpanded);
    }
  }, [isDesktopExpanded, setIsExpanded]);

  // Sync global expanded state with local props
  useEffect(() => {
    if (isExpanded !== isDesktopExpanded) {
      onDesktopExpandedChange(isExpanded);
    }
  }, [isExpanded, onDesktopExpandedChange, isDesktopExpanded]);

  // Ensure expanded state when pinned
  useEffect(() => {
    if (isPinned && !isDesktopExpanded) {
      onDesktopExpandedChange(true);
    }
  }, [isPinned, isDesktopExpanded, onDesktopExpandedChange]);

  // Check for mobile on mount and window resize
  useEffect(() => {
    const checkMobile = () => setIsMobile(window.innerWidth < 768);
    checkMobile();
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  const handleMouseEnter = useCallback(() => {
    if (!isMobile && !isContextMenuOpen && !isPinned) {
      onDesktopExpandedChange(true);
      setIsExpanded(true);
    }
  }, [isMobile, isContextMenuOpen, isPinned, onDesktopExpandedChange, setIsExpanded]);

  const handleMouseLeave = useCallback(() => {
    if (!isMobile && !isContextMenuOpen && !isPinned) {
      onDesktopExpandedChange(false);
      setIsExpanded(false);
    }
  }, [isMobile, isContextMenuOpen, isPinned, onDesktopExpandedChange, setIsExpanded]);

  const togglePin = () => {
    const newPinState = !isPinned;
    setIsPinned(newPinState);
    
    // If pinning, ensure sidebar is expanded
    if (newPinState) {
      setIsExpanded(true);
      onDesktopExpandedChange(true);
    }
  };

  const handleStartEdit = (threadId: string, currentTitle: string) => {
    setEditingThread(threadId);
    setEditTitle(currentTitle);
  };

  const handleFinishEdit = async (threadId: string) => {
    if (editTitle.trim()) {
      await onRenameThread(threadId, editTitle.trim());
    }
    setEditingThread(null);
    setEditTitle('');
  };

  const groupSessionsByDate = useCallback((sessions: Array<{ id: string; title: string; created_at: string }>) => {
    const grouped: GroupedSessions = {};
    
    sessions.forEach(session => {
      const date = new Date(session.created_at);
      let key = '';
      
      if (isToday(date)) {
        key = 'Today';
      } else if (isYesterday(date)) {
        key = 'Yesterday';
      } else if (isThisWeek(date)) {
        key = 'This Week';
      } else if (isThisMonth(date)) {
        key = 'This Month';
      } else {
        key = format(date, 'MMMM yyyy');
      }
      
      if (!grouped[key]) {
        grouped[key] = [];
      }
      grouped[key].push(session);
    });
    
    // Sort sessions within each group by created_at in descending order
    Object.keys(grouped).forEach(key => {
      grouped[key].sort((a, b) => 
        new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
      );
    });
    
    return grouped;
  }, []);

  const groupedSessions = groupSessionsByDate(sessions);

  const handleDelete = async (threadId: string) => {
    try {
      await onDeleteThread(threadId);
    } catch (error) {
      console.error('Failed to delete thread:', error);
    }
  };

  const handleThreadClick = (threadId: string) => {
    console.log('Sidebar: handleThreadClick called with thread ID:', threadId);
    
    // First set the global selected thread ID
    setSelectedThreadId(threadId);
    
    // Debug the current and selected thread
    console.log('Sidebar: Current thread from context before navigation:', selectedThreadId);
    console.log('Sidebar: Setting to thread ID:', threadId);
    
    // Use setTimeout to ensure context update happens before navigation
    setTimeout(() => {
      // Then navigate to the chat page with that thread ID
      console.log('Sidebar: Now navigating to:', `/chat/${threadId}`);
      navigate(`/chat/${threadId}`);
      
      // Also notify the parent component (for compatibility)
      setActiveTab(threadId);
    }, 0);
    
    // If on mobile, collapse the sidebar
    if (isMobile) onDesktopExpandedChange(false);
  };

  return (
    <div 
      className={cn(
        "fixed inset-y-0 left-0 z-20 flex flex-col bg-background border-r transition-all duration-300 sidebar-transition",
        isDesktopExpanded ? "w-[var(--sidebar-width)]" : "w-[var(--sidebar-collapsed-width)]",
        isMobile && !isDesktopExpanded && "w-0 border-r-0"
      )}
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
    >
      <div className="sticky top-0 z-30 bg-background p-3 border-b flex flex-col gap-2">
        <div className="flex items-center justify-between">
          <Button 
            onClick={onNewChat} 
            className={cn(
              "flex-1 flex items-center gap-2 transition-all",
              isDesktopExpanded ? "justify-start px-4" : "justify-center px-0"
            )}
            variant="default"
          >
            <PlusCircle className="h-5 w-5 shrink-0" />
            <span className={cn(
              "transition-opacity duration-300",
              isDesktopExpanded ? "opacity-100" : "opacity-0 absolute overflow-hidden w-0"
            )}>New Chat</span>
          </Button>
          
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <Button 
                  onClick={togglePin} 
                  size="icon" 
                  variant="ghost" 
                  className={cn(
                    "ml-1",
                    !isDesktopExpanded && "hidden",
                    isPinned && "text-orange-500"
                  )}
                >
                  {isPinned ? <Pin className="h-4 w-4" /> : <PinOff className="h-4 w-4" />}
                </Button>
              </TooltipTrigger>
              <TooltipContent>
                {isPinned ? "Unpin sidebar" : "Pin sidebar open"}
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>
        </div>
      </div>

      <ScrollArea className="flex-1 overflow-hidden custom-scrollbar">
        <div className="space-y-4 p-2">
          {Object.entries(groupedSessions)
            .sort((a, b) => {
              // Custom sort order for date groups
              const order = ['Today', 'Yesterday', 'This Week', 'This Month'];
              const aIndex = order.indexOf(a[0]);
              const bIndex = order.indexOf(b[0]);
              if (aIndex !== -1 && bIndex !== -1) return aIndex - bIndex;
              if (aIndex !== -1) return -1;
              if (bIndex !== -1) return 1;
              return 0;
            })
            .map(([date, dateSessions]) => (
              <div key={date} className="space-y-1">
                {isDesktopExpanded && (
                  <h3 className="text-sm font-medium text-muted-foreground px-3 mb-1">
                    {date}
                  </h3>
                )}
                {dateSessions.map((session) => (
                  <ContextMenu key={session.id} onOpenChange={setIsContextMenuOpen}>
                    <ContextMenuTrigger>
                      {editingThread === session.id ? (
                        <div className="px-3 py-2">
                          <Input
                            value={editTitle}
                            onChange={(e) => setEditTitle(e.target.value)}
                            onBlur={() => handleFinishEdit(session.id)}
                            onKeyDown={(e) => {
                              if (e.key === 'Enter') {
                                handleFinishEdit(session.id);
                              } else if (e.key === 'Escape') {
                                setEditingThread(null);
                                setEditTitle('');
                              }
                            }}
                            autoFocus
                          />
                        </div>
                      ) : (
                        <button
                          onClick={() => handleThreadClick(session.id)}
                          className={cn(
                            "w-full flex items-center gap-3 rounded-lg nav-item",
                            isDesktopExpanded ? "px-3 py-2" : "p-2 justify-center",
                            currentSession === session.id ? 
                              "bg-orange-100 text-orange-700" : 
                              "hover:bg-muted/50"
                          )}
                        >
                          <MessageSquare 
                            className={cn(
                              "w-4 h-4 shrink-0",
                              currentSession === session.id && "text-[#F37022]"
                            )} 
                          />
                          <span className={cn(
                            "truncate text-sm flex-1 text-left transition-all duration-300",
                            isDesktopExpanded ? "opacity-100 w-auto" : "opacity-0 w-0 absolute overflow-hidden",
                            currentSession === session.id && "font-medium text-[#F37022]"
                          )}>{session.title}</span>
                          {isDesktopExpanded && currentSession === session.id && (
                            <ChevronRight className="w-4 h-4 shrink-0 text-[#F37022]" />
                          )}
                        </button>
                      )}
                    </ContextMenuTrigger>
                    <ContextMenuContent>
                      <ContextMenuItem onClick={() => handleStartEdit(session.id, session.title)}>
                        <Pencil className="w-4 h-4 mr-2" />
                        Rename
                      </ContextMenuItem>
                      <ContextMenuItem 
                        className="text-destructive"
                        onClick={() => handleDelete(session.id)}
                      >
                        <Trash2 className="w-4 h-4 mr-2" />
                        Delete
                      </ContextMenuItem>
                    </ContextMenuContent>
                  </ContextMenu>
                ))}
              </div>
            ))}
        </div>
      </ScrollArea>

      <div className="sticky bottom-0 z-30 bg-background p-3 border-t space-y-2">
        <Link to="/flashcards">
          <Button
            variant={isInFlashcards ? "default" : "ghost"}
            className={cn(
              "w-full flex items-center gap-2 transition-all",
              isDesktopExpanded ? "justify-start px-4" : "justify-center px-0",
              isInFlashcards && "bg-[#F37022] hover:bg-[#E36012]"
            )}
          >
            <BookOpen className="h-4 w-4 shrink-0" />
            <span className={cn(
              "transition-opacity duration-300",
              isDesktopExpanded ? "opacity-100" : "opacity-0 absolute overflow-hidden w-0"
            )}>Flashcards</span>
          </Button>
        </Link>
        <Link to="/chat">
          <Button
            variant={(isInChat || isInChatThread) ? "default" : "ghost"}
            className={cn(
              "w-full flex items-center gap-2 transition-all",
              isDesktopExpanded ? "justify-start px-4" : "justify-center px-0",
              (isInChat || isInChatThread) && "bg-[#F37022] hover:bg-[#E36012]"
            )}
          >
            <MessageSquare className="h-4 w-4 shrink-0" />
            <span className={cn(
              "transition-opacity duration-300",
              isDesktopExpanded ? "opacity-100" : "opacity-0 absolute overflow-hidden w-0"
            )}>Chat</span>
          </Button>
        </Link>
        <Link to="/settings">
          <Button
            variant={isInSettings ? "default" : "ghost"}
            className={cn(
              "w-full flex items-center gap-2 transition-all",
              isDesktopExpanded ? "justify-start px-4" : "justify-center px-0",
              isInSettings && "bg-[#F37022] hover:bg-[#E36012]"
            )}
          >
            <Settings className="h-4 w-4 shrink-0" />
            <span className={cn(
              "transition-opacity duration-300",
              isDesktopExpanded ? "opacity-100" : "opacity-0 absolute overflow-hidden w-0"
            )}>Settings</span>
          </Button>
        </Link>
        <Button
          onClick={onSignOut}
          variant="ghost"
          className={cn(
            "w-full flex items-center gap-2 transition-all",
            isDesktopExpanded ? "justify-start px-4" : "justify-center px-0"
          )}
        >
          <LogOut className="h-4 w-4 shrink-0" />
          <span className={cn(
            "transition-opacity duration-300",
            isDesktopExpanded ? "opacity-100" : "opacity-0 absolute overflow-hidden w-0"
          )}>Sign out</span>
        </Button>
      </div>
    </div>
  );
}