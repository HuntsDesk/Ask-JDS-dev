import { useState, useEffect, useCallback, useMemo } from 'react';
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
import { usePersistedState } from '@/hooks/use-persisted-state';
import { useTheme } from '@/lib/theme-provider';

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
  const { isExpanded, setIsExpanded } = useContext(SidebarContext);
  const { theme } = useTheme();

  // Replace regular state with persisted state
  const [isPinned, setIsPinned] = usePersistedState<boolean>('sidebar-is-pinned', false);

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
    console.log("Computing grouped sessions"); // Debug log to verify memoization
    const grouped: GroupedSessions = {};
    
    sessions.forEach(session => {
      const date = new Date(session.created_at);
      let key = '';
      
      const isSessionToday = isToday(date);
      const isSessionYesterday = isYesterday(date);
      const isSessionThisWeek = isThisWeek(date);
      
      // Debug log to check date categorization
      console.log(`Session "${session.title}" (${date.toLocaleDateString()}): isToday=${isSessionToday}, isYesterday=${isSessionYesterday}, isThisWeek=${isSessionThisWeek}`);
      
      if (isSessionToday) {
        key = 'Today';
      } else if (isSessionYesterday) {
        key = 'Yesterday';
      } else if (isSessionThisWeek) {
        // This is in the current week, but not today or yesterday
        key = 'This Week';
      } else {
        // Not in the current week, group by month and year
        key = format(date, 'MMMM yyyy');
      }
      
      console.log(`→ Grouped under: ${key}`);
      
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

  // Memoize the grouped sessions to prevent unnecessary recalculations
  const groupedSessions = useMemo(() => 
    groupSessionsByDate(sessions), 
    [groupSessionsByDate, sessions]
  );

  // Memoize the sorted entries to prevent recalculation on every render
  const sortedSessionEntries = useMemo(() => {
    return Object.entries(groupedSessions)
      .sort((a, b) => {
        // Custom sort order for date groups
        const order = ['Today', 'Yesterday', 'This Week'];
        const aIndex = order.indexOf(a[0]);
        const bIndex = order.indexOf(b[0]);
        
        if (aIndex !== -1 && bIndex !== -1) return aIndex - bIndex;
        if (aIndex !== -1) return -1;
        if (bIndex !== -1) return 1;
        
        // For month entries (format: "Month Year"), sort by date (newest first)
        // Parse "Month Year" format
        try {
          // Use Date.parse with the first day of the month for comparison
          const aDate = new Date(Date.parse(`1 ${a[0]}`));
          const bDate = new Date(Date.parse(`1 ${b[0]}`));
          
          // Sort in descending order (newest first)
          return bDate.getTime() - aDate.getTime();
        } catch (err) {
          console.error('Error parsing month dates:', err);
          return 0;
        }
      });
  }, [groupedSessions]);

  const handleDelete = async (threadId: string) => {
    try {
      console.log('Sidebar: handleDelete called with thread ID:', threadId);
      
      // If this is the currently selected thread, we need to navigate away first
      if (threadId === selectedThreadId || threadId === currentSession) {
        // Find a different thread to navigate to
        const otherThread = sessions.find(s => s.id !== threadId);
        
        if (otherThread) {
          console.log('Sidebar: Navigating to alternative thread:', otherThread.id);
          setSelectedThreadId(otherThread.id);
          setActiveTab(otherThread.id);
          navigate(`/chat/${otherThread.id}`);
        } else {
          console.log('Sidebar: No alternative thread found, navigating to /chat');
          setSelectedThreadId(null);
          navigate('/chat');
        }
      }
      
      // Call the deletion function provided by the parent component
      // This already has optimistic updates in the useThreads hook
      await onDeleteThread(threadId);
    } catch (error) {
      console.error('Failed to delete thread:', error);
    }
  };

  // Use the selectedThreadId from context with higher priority than currentSession prop
  useEffect(() => {
    // If selectedThreadId is set and different from currentSession,
    // log the mismatch for debugging
    if (selectedThreadId && currentSession && selectedThreadId !== currentSession) {
      console.log('Sidebar: Thread selection mismatch - Context:', selectedThreadId, 'Props:', currentSession);
    }
  }, [selectedThreadId, currentSession]);

  // When a thread is clicked, update global state and navigate
  const handleThreadClick = (threadId: string) => {
    console.log('Sidebar: handleThreadClick called with thread ID:', threadId);
    
    // First set the global selected thread ID to ensure immediate UI update
    setSelectedThreadId(threadId);
    
    // Set the active tab for parent component
    setActiveTab(threadId);
    
    // Use immediate navigation without setTimeout to avoid race conditions
    navigate(`/chat/${threadId}`);
    
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
      {/* Logo section */}
      <div className="sticky top-0 z-30 bg-background border-b">
        <div className={cn(
          "flex items-center justify-center py-4", // Increased padding
          isDesktopExpanded ? "px-4" : "px-2"
        )}>
          {isDesktopExpanded ? (
            <>
              <img 
                src="/images/JDSimplified_Logo.png" 
                alt="JD Simplified Logo" 
                className="h-10 transition-all dark:hidden" 
              />
              <img 
                src="/images/JDSimplified_Logo_wht.png" 
                alt="JD Simplified Logo" 
                className="h-10 transition-all hidden dark:block" 
              />
            </>
          ) : (
            <img 
              src="/images/JD Simplified Favicon.svg" 
              alt="JDS" 
              className="h-8 transition-all dark:invert" 
            />
          )}
        </div>
      </div>

      <div className="sticky top-0 z-30 bg-background p-3 border-b flex flex-col gap-2">
        <div className="flex items-center justify-between">
          <button
            onClick={() => {
              console.log('Sidebar: New Chat button clicked');
              onNewChat();
            }}
            className={cn(
              "flex font-medium items-center gap-2 px-3 py-2 w-full",
              "rounded-lg bg-[#f37022] text-white hover:bg-[#e36012] transition",
              // Adjust padding and size based on sidebar width
              isDesktopExpanded 
                ? "justify-start" 
                : "justify-center px-2 mx-auto"
            )}
          >
            <PlusCircle className="h-4 w-4" />
            <span 
              className={cn(
                "transition-all duration-300",
                isDesktopExpanded ? "opacity-100 w-auto" : "opacity-0 w-0 hidden"
              )}
            >
              New Chat
            </span>
          </button>
          
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
          {sortedSessionEntries.map(([date, dateSessions]) => (
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
                          (selectedThreadId === session.id) ? 
                            "bg-orange-100 text-orange-700" : 
                            "hover:bg-muted/50"
                        )}
                      >
                        <MessageSquare 
                          className={cn(
                            "w-4 h-4 shrink-0",
                            (selectedThreadId === session.id) && "text-[#F37022]"
                          )} 
                        />
                        <span className={cn(
                          "truncate text-sm flex-1 text-left transition-all duration-300",
                          isDesktopExpanded ? "opacity-100 w-auto" : "opacity-0 w-0 absolute overflow-hidden",
                          (selectedThreadId === session.id) && "font-medium text-[#F37022]"
                        )}>{session.title}</span>
                        {isDesktopExpanded && (selectedThreadId === session.id) && (
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
        <Link to="/flashcards/subjects">
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