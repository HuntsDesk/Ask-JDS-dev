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
  BookOpen
} from 'lucide-react';
import {
  ContextMenu,
  ContextMenuContent,
  ContextMenuItem,
  ContextMenuTrigger,
} from '@/components/ui/context-menu';
import { Input } from '@/components/ui/input';
import { Link } from 'react-router-dom';

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

  // Check for mobile on mount and window resize
  useEffect(() => {
    const checkMobile = () => setIsMobile(window.innerWidth < 768);
    checkMobile();
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  const handleMouseEnter = useCallback(() => {
    if (!isMobile && !isContextMenuOpen) {
      onDesktopExpandedChange(true);
    }
  }, [isMobile, isContextMenuOpen, onDesktopExpandedChange]);

  const handleMouseLeave = useCallback(() => {
    if (!isMobile && !isContextMenuOpen) {
      onDesktopExpandedChange(false);
    }
  }, [isMobile, isContextMenuOpen, onDesktopExpandedChange]);

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
      <div className="sticky top-0 z-30 bg-background p-3 border-b">
        <Button 
          onClick={onNewChat} 
          className={cn(
            "w-full flex items-center gap-2 transition-all",
            isDesktopExpanded ? "justify-start px-4" : "justify-center px-0"
          )}
          variant="default"
        >
          <PlusCircle className="h-5 w-5 shrink-0" />
          {isDesktopExpanded && <span>New Chat</span>}
        </Button>
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
                          onClick={() => {
                            // Optimistically update the UI without waiting for the db
                            setActiveTab(session.id);
                            
                            // If on mobile, collapse the sidebar
                            if (isMobile) onDesktopExpandedChange(false);
                          }}
                          className={cn(
                            "w-full flex items-center gap-3 rounded-lg nav-item",
                            isDesktopExpanded ? "px-3 py-2" : "p-2 justify-center",
                            currentSession === session.id && "active"
                          )}
                        >
                          <MessageSquare className="w-4 h-4 shrink-0" />
                          {isDesktopExpanded && (
                            <span className="truncate text-sm flex-1 text-left">{session.title}</span>
                          )}
                          {isDesktopExpanded && currentSession === session.id && (
                            <ChevronRight className="w-4 h-4 shrink-0 text-muted-foreground" />
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
            variant="ghost"
            className={cn(
              "w-full flex items-center gap-2 transition-all",
              isDesktopExpanded ? "justify-start px-4" : "justify-center px-0"
            )}
          >
            <BookOpen className="h-4 w-4 shrink-0" />
            {isDesktopExpanded && <span>Flashcards</span>}
          </Button>
        </Link>
        <Link to="/settings">
          <Button
            variant="ghost"
            className={cn(
              "w-full flex items-center gap-2 transition-all",
              isDesktopExpanded ? "justify-start px-4" : "justify-center px-0"
            )}
          >
            <Settings className="h-4 w-4 shrink-0" />
            {isDesktopExpanded && <span>Settings</span>}
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
          {isDesktopExpanded && <span>Sign out</span>}
        </Button>
      </div>
    </div>
  );
}