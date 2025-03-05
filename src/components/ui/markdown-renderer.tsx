import React from 'react';
import ReactMarkdown from 'react-markdown';
import { cn } from '@/lib/utils';

interface MarkdownRendererProps {
  content: string;
  className?: string;
}

export function MarkdownRenderer({ content, className }: MarkdownRendererProps) {
  // Process content to handle newlines and remove trailing whitespace
  const processedContent = content
    .replace(/\r\n?/g, '\n') // Normalize line endings
    .replace(/\n{3,}/g, '\n\n') // Limit to max 2 consecutive newlines
    .replace(/\n+$/, ''); // Remove trailing newlines at the end
  
  return (
    <div className={cn("max-w-none", className)}>
      <ReactMarkdown
        className="break-words"
        components={{
          p: ({ node, ...props }) => (
            <p className="mb-6 mt-0 last:mb-0" {...props} />
          ),
          h1: ({ node, ...props }) => (
            <h1 className="mt-6 mb-4 last:mb-0" {...props} />
          ),
          h2: ({ node, ...props }) => (
            <h2 className="mt-6 mb-3 last:mb-0" {...props} />
          ),
          h3: ({ node, ...props }) => (
            <h3 className="mt-5 mb-2 last:mb-0" {...props} />
          ),
          ul: ({ node, ...props }) => (
            <ul className="my-6 pl-6 last:mb-0" {...props} />
          ),
          ol: ({ node, ...props }) => (
            <ol className="my-6 pl-6 last:mb-0" {...props} />
          ),
          li: ({ node, ...props }) => (
            <li className="mb-2 last:mb-0" {...props} />
          ),
          pre: ({ node, ...props }) => (
            <pre className="my-6 p-4 bg-muted rounded-md overflow-auto last:mb-0" {...props} />
          )
        }}
      >
        {processedContent}
      </ReactMarkdown>
    </div>
  );
} 