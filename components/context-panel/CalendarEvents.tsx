'use client';

import { useState, useEffect } from 'react';
import { ExternalLink } from 'lucide-react';
import { cn } from '@/lib/cn';

interface CalendarEvent {
  id: string;
  subject: string;
  start: { dateTime: string };
  end: { dateTime: string };
  location?: { displayName: string };
  isOnlineMeeting: boolean;
  onlineMeeting?: { joinUrl: string };
  bodyPreview?: string;
}

interface CalendarEventsProps {
  onInsert: (text: string) => void;
}

export function CalendarEvents({ onInsert }: CalendarEventsProps) {
  const [events, setEvents] = useState<CalendarEvent[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const ctrl = new AbortController();

    const now = new Date();
    const end = new Date(now.getTime() + 7 * 86_400_000);
    const params = new URLSearchParams({
      startDateTime: now.toISOString(),
      endDateTime: end.toISOString(),
      $select: 'id,subject,start,end,location,isOnlineMeeting,onlineMeeting,bodyPreview',
      $orderby: 'start/dateTime',
      $top: '20',
    });

    fetch(`/api/graph/me/calendarView?${params}`, { signal: ctrl.signal })
      .then((r) => r.json())
      .then((data) => { setEvents(data.value ?? []); setLoading(false); })
      .catch((err) => {
        if (err instanceof Error && err.name === 'AbortError') return;
        setError(String(err));
        setLoading(false);
      });

    return () => ctrl.abort();
  }, []);

  if (loading) return <p className="p-4 text-xs text-muted-foreground">Loading calendar…</p>;
  if (error) return <p className="p-4 text-xs text-destructive">Failed to load: {error}</p>;
  if (!events.length)
    return <p className="p-4 text-xs text-muted-foreground text-center mt-6">No events in the next 7 days.</p>;

  // Group by day
  const grouped = events.reduce<Record<string, CalendarEvent[]>>((acc, e) => {
    const key = new Date(e.start.dateTime).toDateString();
    (acc[key] ??= []).push(e);
    return acc;
  }, {});

  return (
    <div className="py-2">
      {Object.entries(grouped).map(([day, dayEvents]) => (
        <div key={day}>
          <p className="px-3 py-1.5 text-xs font-semibold text-muted-foreground sticky top-0 bg-muted/30 backdrop-blur-sm">
            {formatDay(day)}
          </p>
          {dayEvents.map((event) => (
            <EventItem key={event.id} event={event} onInsert={onInsert} />
          ))}
        </div>
      ))}
    </div>
  );
}

function EventItem({
  event,
  onInsert,
}: {
  event: CalendarEvent;
  onInsert: (t: string) => void;
}) {
  const start = new Date(event.start.dateTime);
  const end = new Date(event.end.dateTime);
  const now = new Date();
  const isNow = now >= start && now <= end;
  const timeStr = `${fmt(start)} – ${fmt(end)}`;

  return (
    <div
      className={cn(
        'group mx-3 my-1 px-2.5 py-2 rounded border-l-2 hover:bg-accent/50 transition-colors',
        isNow ? 'border-primary bg-primary/5' : 'border-transparent'
      )}
    >
      <div className="flex items-start gap-1">
        <div className="flex-1 min-w-0">
          <p className="text-xs font-medium leading-snug truncate">{event.subject}</p>
          <p className="text-xs text-muted-foreground">{timeStr}</p>
          {event.location?.displayName && (
            <p className="text-xs text-muted-foreground truncate">{event.location.displayName}</p>
          )}
        </div>
        {event.isOnlineMeeting && event.onlineMeeting?.joinUrl && (
          <a
            href={event.onlineMeeting.joinUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="shrink-0 p-1 rounded hover:bg-primary/20 text-primary"
            title="Join meeting"
          >
            <ExternalLink className="w-3 h-3" />
          </a>
        )}
      </div>
      <button
        onClick={() =>
          onInsert(
            `What should I prepare for my "${event.subject}" meeting at ${fmt(start)} today?`
          )
        }
        className="mt-1 text-xs text-primary hover:underline opacity-0 group-hover:opacity-100 transition-opacity"
      >
        Ask about this →
      </button>
    </div>
  );
}

function fmt(d: Date) {
  return d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
}

function formatDay(dateStr: string): string {
  const d = new Date(dateStr);
  const today = new Date();
  const tomorrow = new Date(today.getTime() + 86_400_000);
  if (d.toDateString() === today.toDateString()) return 'Today';
  if (d.toDateString() === tomorrow.toDateString()) return 'Tomorrow';
  return d.toLocaleDateString([], { weekday: 'long', month: 'short', day: 'numeric' });
}
