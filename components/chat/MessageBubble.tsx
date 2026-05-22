'use client';

import { cn } from '@/lib/cn';
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
          <div
            className={cn(
              'prose prose-sm max-w-none',
              isUser ? 'prose-invert' : 'dark:prose-invert',
              message.isStreaming && 'streaming-cursor'
            )}
            dangerouslySetInnerHTML={{
              __html: message.content
                .replace(/&/g, '&amp;')
                .replace(/</g, '&lt;')
                .replace(/>/g, '&gt;')
                .replace(/\n/g, '<br />'),
            }}
          />
        ) : message.isStreaming ? (
          <span className="streaming-cursor" />
        ) : null}
      </div>
    </div>
  );
}
