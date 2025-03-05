import React from 'react';
import { cn } from '@/lib/utils';
import type { Message } from '@/types';
import { MarkdownRenderer } from '@/components/ui/markdown-renderer';

interface ChatMessageProps {
  message: Message;
  isLastMessage?: boolean;
}

export function ChatMessage({ message, isLastMessage = false }: ChatMessageProps) {
  const isUser = message.role === 'user';
  const isSystem = message.role === 'system';
  
  // Don't display system messages
  if (isSystem) return null;
  
  // Remove trailing newlines for user messages
  const messageContent = isUser 
    ? message.content.replace(/\s+$/, '')
    : message.content;

  return (
    <div
      className={cn(
        "py-1 flex w-full",
        isLastMessage && "mb-0"
      )}
      style={{ contain: 'content' }}
    >
      <div className={cn(
        "flex flex-col max-w-[85%] min-w-[100px]",
        isUser ? "ml-auto mr-4" : "ml-4"
      )}>
        <div className={cn(
          "px-4 py-3 rounded-lg leading-relaxed",
          isUser 
            ? "bg-primary text-primary-foreground rounded-br-none" 
            : "bg-muted rounded-bl-none"
        )}>
          {isUser ? (
            <div className="whitespace-pre-wrap">{messageContent}</div>
          ) : (
            <MarkdownRenderer content={messageContent} />
          )}
        </div>
      </div>
    </div>
  );
} 