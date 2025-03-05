import React, { useEffect, useRef, useState, useCallback } from 'react';
import { VariableSizeList as List } from 'react-window';
import ReactMarkdown from 'react-markdown';
import { Message } from '@/types';
import { useResizeObserver } from '@/hooks/use-resize-observer';

interface MessageItemProps {
  index: number;
  style: React.CSSProperties;
  data: {
    messages: Message[];
    setSize: (index: number, size: number) => void;
    containerWidth: number;
  };
}

// Individual message rendering component
const MessageItem = ({ index, style, data }: MessageItemProps) => {
  const { messages, setSize, containerWidth } = data;
  const message = messages[index];
  const messageRef = useRef<HTMLDivElement>(null);
  
  // Process message content to remove trailing newlines
  const processedContent = message.content
    .replace(/\r\n?/g, '\n') // Normalize line endings
    .replace(/\n+$/, ''); // Remove trailing newlines
  
  // Use effect to measure and update the message height after render
  useEffect(() => {
    if (messageRef.current) {
      const height = messageRef.current.getBoundingClientRect().height;
      // Add extra padding between messages (30px)
      setSize(index, height + 30);
    }
    
    // Set up resize observer for dynamic content
    const currentRef = messageRef.current;
    if (currentRef) {
      const resizeObserver = new ResizeObserver(() => {
        if (currentRef) {
          const height = currentRef.getBoundingClientRect().height;
          setSize(index, height + 30); // More padding
        }
      });
      
      resizeObserver.observe(currentRef);
      return () => {
        resizeObserver.disconnect();
      };
    }
  }, [processedContent, index, setSize]);
  
  return (
    <div style={{
      ...style,
      height: 'auto',
      width: containerWidth - 8, // Leave a small gap for scrollbar
      paddingRight: 4, // Minimal padding
      paddingLeft: 12  // Increased left padding to avoid sidebar overlap
    }}>
      <div 
        ref={messageRef}
        className={`flex ${message.role === 'assistant' ? 'justify-start ml-2' : 'justify-end mr-1'} mb-4`} // Increased left margin
      >
        <div className={`max-w-[85%] rounded-lg p-3 ${
          message.role === 'assistant'
            ? 'bg-muted text-muted-foreground' 
            : 'bg-primary text-primary-foreground'
        }`}>
          <ReactMarkdown 
            className="prose dark:prose-invert max-w-none text-sm md:text-base break-words [&>p]:mb-4 [&>p:last-child]:mb-0 [&>ul]:mt-4 [&>ul]:mb-4 [&>ul:last-child]:mb-0"
          >
            {processedContent}
          </ReactMarkdown>
        </div>
      </div>
    </div>
  );
};

interface VirtualMessageListProps {
  messages: Message[];
}

export function VirtualMessageList({ messages }: VirtualMessageListProps) {
  const listRef = useRef<List>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const [sizeMap, setSizeMap] = useState<{[key: number]: number}>({});
  const [isScrolling, setIsScrolling] = useState(false);
  const [autoScrollToBottom, setAutoScrollToBottom] = useState(true);
  const [initialScrollComplete, setInitialScrollComplete] = useState(false);
  const lastScrollOffsetRef = useRef(0);
  const lastMsgLengthRef = useRef(messages.length);
  
  // Get container dimensions
  const { width, height } = useResizeObserver(containerRef);
  
  // Function to scroll to bottom
  const scrollToBottom = useCallback(() => {
    if (listRef.current && (listRef.current as any)._outerRef) {
      const scrollHeight = (listRef.current as any)._outerRef.scrollHeight;
      (listRef.current as any).scrollTo(scrollHeight);
      setAutoScrollToBottom(true);
    }
  }, []);
  
  // Initial scroll to bottom when component mounts or when dimensions are first available
  useEffect(() => {
    if (width && height && messages.length > 0 && !initialScrollComplete) {
      // Delay to ensure measurements are ready
      const timer = setTimeout(() => {
        scrollToBottom();
        setInitialScrollComplete(true);
      }, 200);
      
      return () => clearTimeout(timer);
    }
  }, [width, height, messages.length, scrollToBottom, initialScrollComplete]);
  
  // Update scroll when new messages arrive
  useEffect(() => {
    // Check if we have more messages than last time
    if (messages.length > lastMsgLengthRef.current) {
      // Always scroll to bottom on new messages or if auto-scroll is enabled
      setTimeout(() => {
        scrollToBottom();
      }, 100);
    }
    
    // Update ref with new message length
    lastMsgLengthRef.current = messages.length;
  }, [messages.length, scrollToBottom]);
  
  // When messages change completely (new thread), reset scroll state and scroll to bottom
  useEffect(() => {
    // If there are messages but the size map is empty, this is likely a new thread
    if (messages.length > 0 && Object.keys(sizeMap).length === 0) {
      setInitialScrollComplete(false);
      setAutoScrollToBottom(true);
      
      // Use a timer to allow rendering before scrolling
      const timer = setTimeout(() => {
        scrollToBottom();
        setInitialScrollComplete(true);
      }, 200);
      
      return () => clearTimeout(timer);
    }
  }, [messages, sizeMap, scrollToBottom]);

  // Function to set the size of a message and update the list
  const setSize = useCallback((index: number, size: number) => {
    // Simply update the size in the map and reset the list immediately
    if (sizeMap[index] === size) return; // No change needed
    
    // Update the map
    setSizeMap(prevSizeMap => ({
      ...prevSizeMap,
      [index]: size
    }));
    
    // Reset list immediately - don't wait for state update
    if (listRef.current) {
      listRef.current.resetAfterIndex(index);
    }
    
    // Handle auto-scrolling if this is the last message
    if (autoScrollToBottom && index === messages.length - 1) {
      setTimeout(scrollToBottom, 50);
    }
  }, [sizeMap, messages.length, autoScrollToBottom, scrollToBottom]);
  
  // Get item size for the virtualized list
  const getItemSize = useCallback((index: number) => {
    return sizeMap[index] || 100; // Default height
  }, [sizeMap]);
  
  // Handle scroll events
  const handleScroll = useCallback(({ scrollOffset, scrollDirection }: { scrollOffset: number, scrollDirection: string }) => {
    // Update last scroll position
    lastScrollOffsetRef.current = scrollOffset;
    
    // Check if we're near the bottom (within 100px)
    const isAtBottom = scrollDirection === 'forward' && 
      scrollOffset > 0 && 
      listRef.current && 
      scrollOffset + (listRef.current as any).props.height >= 
      (listRef.current as any)._outerRef.scrollHeight - 100;
    
    // Update auto-scroll flag based on scroll position
    setAutoScrollToBottom(isAtBottom);
    
    // Update scrolling state for UI updates
    setIsScrolling(true);
    clearTimeout((handleScroll as any).timeoutId);
    (handleScroll as any).timeoutId = setTimeout(() => {
      setIsScrolling(false);
    }, 100);
  }, []);
  
  // Display empty state if no messages
  if (messages.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center h-full text-center p-4">
        <h3 className="text-xl font-semibold mb-2">No messages yet</h3>
        <p className="mb-4 text-gray-600 max-w-md">
          Start a conversation to get legal guidance. Ask JDS provides
          clear, reliable, and knowledgeable guidance.
        </p>
      </div>
    );
  }
  
  return (
    <div ref={containerRef} className="w-full h-full overflow-hidden">
      {width && height ? (
        <List
          ref={listRef}
          height={height}
          width={width}
          itemCount={messages.length}
          itemSize={getItemSize}
          overscanCount={10}
          onScroll={handleScroll}
          initialScrollOffset={height * 100} // Start with a large scroll offset to ensure we're at the bottom
          itemData={{
            messages,
            setSize,
            containerWidth: width
          }}
          className="virtual-list-scrollbar"
          style={{ overflowX: 'hidden' }} // Add this to ensure no horizontal scrollbar
        >
          {MessageItem}
        </List>
      ) : (
        <div>Loading messages...</div>
      )}
    </div>
  );
} 