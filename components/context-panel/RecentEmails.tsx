'use client';

import { useState, useEffect } from 'react';
import { cn } from '@/lib/cn';

interface Email {
  id: string;
  subject?: string;
  from: { emailAddress: { name?: string; address: string } };
  receivedDateTime: string;
  isRead: boolean;
  bodyPreview?: string;
}

interface RecentEmailsProps {
  onInsert: (text: string) => void;
}

export function RecentEmails({ onInsert }: RecentEmailsProps) {
  const [emails, setEmails] = useState<Email[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const ctrl = new AbortController();

    const params = new URLSearchParams({
      $select: 'id,subject,from,receivedDateTime,isRead,bodyPreview',
      $orderby: 'receivedDateTime desc',
      $top: '15',
    });

    fetch(`/api/graph/me/mailFolders/inbox/messages?${params}`, { signal: ctrl.signal })
      .then((r) => r.json())
      .then((data) => { setEmails(data.value ?? []); setLoading(false); })
      .catch((err) => {
        if (err instanceof Error && err.name === 'AbortError') return;
        setError(String(err));
        setLoading(false);
      });

    return () => ctrl.abort();
  }, []);

  if (loading) return <p className="p-4 text-xs text-muted-foreground">Loading emails…</p>;
  if (error) return <p className="p-4 text-xs text-destructive">Failed to load: {error}</p>;
  if (!emails.length)
    return <p className="p-4 text-xs text-muted-foreground text-center mt-6">Inbox is empty.</p>;

  return (
    <div className="py-2 divide-y divide-border/50">
      {emails.map((email) => (
        <EmailItem key={email.id} email={email} onInsert={onInsert} />
      ))}
    </div>
  );
}

function EmailItem({ email, onInsert }: { email: Email; onInsert: (t: string) => void }) {
  const from =
    email.from?.emailAddress?.name ?? email.from?.emailAddress?.address ?? 'Unknown';
  const date = new Date(email.receivedDateTime);
  const isToday = date.toDateString() === new Date().toDateString();
  const dateStr = isToday
    ? date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    : date.toLocaleDateString([], { month: 'short', day: 'numeric' });
  const subject = email.subject || '(no subject)';

  return (
    <div className="group px-3 py-2.5 hover:bg-accent/50 transition-colors">
      <div className="flex items-start gap-1.5">
        {!email.isRead && (
          <span className="mt-1 w-1.5 h-1.5 rounded-full bg-primary shrink-0" />
        )}
        <div className="flex-1 min-w-0">
          <div className="flex items-baseline justify-between gap-1">
            <p
              className={cn(
                'text-xs truncate',
                email.isRead ? 'font-medium' : 'font-semibold'
              )}
            >
              {subject}
            </p>
            <span className="text-xs text-muted-foreground shrink-0">{dateStr}</span>
          </div>
          <p className="text-xs text-muted-foreground truncate">{from}</p>
          {email.bodyPreview && (
            <p className="text-xs text-muted-foreground mt-0.5 line-clamp-2 leading-relaxed">
              {email.bodyPreview}
            </p>
          )}
        </div>
      </div>
      <button
        onClick={() =>
          onInsert(
            `Please summarise this email and suggest a reply:\n\nSubject: ${subject}\nFrom: ${from}\n\n${email.bodyPreview ?? ''}`
          )
        }
        className="mt-1 ml-3 text-xs text-primary hover:underline opacity-0 group-hover:opacity-100 transition-opacity"
      >
        Ask about this →
      </button>
    </div>
  );
}
