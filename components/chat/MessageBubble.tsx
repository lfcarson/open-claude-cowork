'use client';

import { cn } from '@/lib/cn';
import { renderMarkdown } from '@/lib/markdown';
import type { Message } from './ChatPanel';

interface MessageBubbleProps {
  message: Message;
}

export function MessageBubble({ message }: MessageBubbleProps) {
  const isUser = message.role === 'user';

  return (
    <div className={cn('flex', isUser ? 'justify-end' : 'justify-start')}>
      <div
        className={cn(
          'max-w-[85%] rounded-2xl px-4 py-2.5 text-sm',
          isUser
            ? 'bg-primary text-primary-foreground rounded-br-sm'
            : 'bg-muted text-foreground rounded-bl-sm',
          message.isStreaming && !message.content && 'min-w-[60px]'
        )}
      >
        {message.content ? (
          isUser ? (
            // User messages: plain text, preserve line breaks
            <span className={cn('whitespace-pre-wrap', message.isStreaming && 'streaming-cursor')}>
              {message.content}
            </span>
          ) : (
            // Assistant messages: render markdown
            <div
              className={cn('md-body', message.isStreaming && 'streaming-cursor')}
              dangerouslySetInnerHTML={{ __html: renderMarkdown(message.content) }}
            />
          )
        ) : message.isStreaming ? (
          <span className="streaming-cursor" />
        ) : null}
      </div>
    </div>
  );
}
