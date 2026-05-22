'use client';

import { useState } from 'react';
import { Calendar, Mail, ChevronLeft, ChevronRight, RefreshCw } from 'lucide-react';
import { cn } from '@/lib/cn';
import { CalendarEvents } from './CalendarEvents';
import { RecentEmails } from './RecentEmails';

type Tab = 'calendar' | 'email';

interface ContextPanelProps {
  onInsert: (text: string) => void;
}

export function ContextPanel({ onInsert }: ContextPanelProps) {
  const [collapsed, setCollapsed] = useState(false);
  const [tab, setTab] = useState<Tab>('calendar');
  const [refreshKey, setRefreshKey] = useState(0);

  if (collapsed) {
    return (
      <aside className="flex flex-col items-center border-l border-border bg-muted/20 w-12 py-2 gap-1 shrink-0">
        <button
          onClick={() => setCollapsed(false)}
          className="p-1.5 rounded hover:bg-accent transition-colors text-muted-foreground"
          title="Expand context panel"
        >
          <ChevronLeft className="w-4 h-4" />
        </button>
        <button
          onClick={() => { setTab('calendar'); setCollapsed(false); }}
          className={cn(
            'p-1.5 rounded hover:bg-accent transition-colors',
            tab === 'calendar' ? 'text-primary' : 'text-muted-foreground'
          )}
          title="Calendar"
        >
          <Calendar className="w-4 h-4" />
        </button>
        <button
          onClick={() => { setTab('email'); setCollapsed(false); }}
          className={cn(
            'p-1.5 rounded hover:bg-accent transition-colors',
            tab === 'email' ? 'text-primary' : 'text-muted-foreground'
          )}
          title="Inbox"
        >
          <Mail className="w-4 h-4" />
        </button>
      </aside>
    );
  }

  return (
    <aside className="flex flex-col border-l border-border bg-muted/20 w-72 shrink-0 overflow-hidden">
      {/* Tab bar */}
      <div className="flex items-center justify-between px-2 py-1.5 border-b border-border h-10">
        <div className="flex gap-0.5">
          <TabButton active={tab === 'calendar'} onClick={() => setTab('calendar')} icon={<Calendar className="w-3.5 h-3.5" />}>
            Calendar
          </TabButton>
          <TabButton active={tab === 'email'} onClick={() => setTab('email')} icon={<Mail className="w-3.5 h-3.5" />}>
            Inbox
          </TabButton>
        </div>
        <div className="flex items-center gap-0.5">
          <button
            onClick={() => setRefreshKey((k) => k + 1)}
            className="p-1.5 rounded hover:bg-accent transition-colors text-muted-foreground"
            title="Refresh"
          >
            <RefreshCw className="w-3.5 h-3.5" />
          </button>
          <button
            onClick={() => setCollapsed(true)}
            className="p-1.5 rounded hover:bg-accent transition-colors text-muted-foreground"
            title="Collapse panel"
          >
            <ChevronRight className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto">
        {tab === 'calendar' && <CalendarEvents key={`cal-${refreshKey}`} onInsert={onInsert} />}
        {tab === 'email' && <RecentEmails key={`mail-${refreshKey}`} onInsert={onInsert} />}
      </div>
    </aside>
  );
}

function TabButton({
  active,
  onClick,
  icon,
  children,
}: {
  active: boolean;
  onClick: () => void;
  icon: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <button
      onClick={onClick}
      className={cn(
        'flex items-center gap-1 px-2.5 py-1 rounded text-xs font-medium transition-colors',
        active ? 'bg-primary/10 text-primary' : 'hover:bg-accent text-muted-foreground'
      )}
    >
      {icon}
      {children}
    </button>
  );
}
