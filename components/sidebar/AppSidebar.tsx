'use client';

import { useState } from 'react';
import { PlusCircle, MessageSquare, ChevronLeft, ChevronRight } from 'lucide-react';
import { cn } from '@/lib/cn';

interface ChatSession {
  id: string;
  title: string;
  updatedAt: string;
}

interface AppSidebarProps {
  sessions?: ChatSession[];
  currentSessionId?: string;
  onNewChat?: () => void;
  onSelectSession?: (id: string) => void;
}

export function AppSidebar({
  sessions = [],
  currentSessionId,
  onNewChat,
  onSelectSession,
}: AppSidebarProps) {
  const [collapsed, setCollapsed] = useState(false);

  return (
    <aside
      className={cn(
        'flex flex-col border-r border-border bg-muted/30 transition-all duration-200 overflow-hidden',
        collapsed ? 'w-12' : 'w-64'
      )}
    >
      {/* Header */}
      <div className="flex items-center justify-between p-2 border-b border-border h-12">
        {!collapsed && (
          <button
            onClick={onNewChat}
            className="flex items-center gap-2 text-sm font-medium hover:text-primary transition-colors px-2 py-1 rounded hover:bg-accent"
          >
            <PlusCircle className="w-4 h-4 shrink-0" />
            New Chat
          </button>
        )}
        {collapsed && (
          <button
            onClick={onNewChat}
            className="mx-auto hover:text-primary transition-colors"
            title="New Chat"
          >
            <PlusCircle className="w-4 h-4" />
          </button>
        )}
        <button
          onClick={() => setCollapsed(!collapsed)}
          className={cn('p-1 rounded hover:bg-accent transition-colors shrink-0', collapsed && 'mx-auto')}
          title={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
        >
          {collapsed ? (
            <ChevronRight className="w-4 h-4" />
          ) : (
            <ChevronLeft className="w-4 h-4" />
          )}
        </button>
      </div>

      {/* Session list */}
      {!collapsed && (
        <div className="flex-1 overflow-y-auto py-2 space-y-0.5 px-2">
          {sessions.length === 0 && (
            <p className="text-xs text-muted-foreground text-center mt-8 px-2">
              No conversations yet. Start a new chat!
            </p>
          )}
          {sessions.map((session) => (
            <button
              key={session.id}
              onClick={() => onSelectSession?.(session.id)}
              className={cn(
                'w-full flex items-center gap-2 px-2 py-2 rounded text-sm text-left hover:bg-accent transition-colors',
                session.id === currentSessionId && 'bg-accent font-medium'
              )}
            >
              <MessageSquare className="w-3.5 h-3.5 shrink-0 text-muted-foreground" />
              <span className="truncate">{session.title}</span>
            </button>
          ))}
        </div>
      )}
    </aside>
  );
}
