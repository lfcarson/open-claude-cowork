'use client';

import { useState, useEffect, useCallback } from 'react';
import { AppSidebar } from '@/components/sidebar/AppSidebar';
import { ChatPanel, type Message } from '@/components/chat/ChatPanel';
import { TopBar } from '@/components/layout/TopBar';

interface StoredSession {
  id: string;
  title: string;
  messages: Message[];
  updatedAt: string;
}

const STORAGE_KEY = 'lf-cowork-sessions-v1';
const MAX_SESSIONS = 50;

function loadSessions(): StoredSession[] {
  if (typeof window === 'undefined') return [];
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? (JSON.parse(raw) as StoredSession[]) : [];
  } catch {
    return [];
  }
}

function persistSessions(sessions: StoredSession[]) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(sessions));
  } catch {
    // storage quota exceeded — silently ignore
  }
}

interface HomeClientProps {
  userName: string;
}

export function HomeClient({ userName }: HomeClientProps) {
  const [sessions, setSessions] = useState<StoredSession[]>([]);
  const [currentSessionId, setCurrentSessionId] = useState<string>('');

  // Hydrate from localStorage on mount
  useEffect(() => {
    const stored = loadSessions();
    setSessions(stored);
    setCurrentSessionId(stored[0]?.id ?? crypto.randomUUID());
  }, []);

  const handleNewChat = useCallback(() => {
    setCurrentSessionId(crypto.randomUUID());
  }, []);

  const handleSelectSession = useCallback((id: string) => {
    setCurrentSessionId(id);
  }, []);

  const handleMessagesChange = useCallback((id: string, messages: Message[]) => {
    setSessions((prev) => {
      const title =
        messages.find((m) => m.role === 'user')?.content.slice(0, 50) ?? 'New chat';
      const idx = prev.findIndex((s) => s.id === id);
      const updated: StoredSession = {
        id,
        title,
        messages,
        updatedAt: new Date().toISOString(),
      };
      const next =
        idx >= 0
          ? prev.map((s) => (s.id === id ? updated : s))
          : [updated, ...prev];
      const trimmed = next.slice(0, MAX_SESSIONS);
      persistSessions(trimmed);
      return trimmed;
    });
  }, []);

  const currentSession = sessions.find((s) => s.id === currentSessionId);

  const sidebarSessions = sessions.map(({ id, title, updatedAt }) => ({
    id,
    title,
    updatedAt,
  }));

  if (!currentSessionId) return null; // avoid SSR mismatch before hydration

  return (
    <div className="flex flex-col h-screen overflow-hidden">
      <TopBar />
      <div className="flex flex-1 overflow-hidden">
        <AppSidebar
          sessions={sidebarSessions}
          currentSessionId={currentSessionId}
          onNewChat={handleNewChat}
          onSelectSession={handleSelectSession}
        />
        <main className="flex-1 overflow-hidden">
          <ChatPanel
            key={currentSessionId}
            userName={userName}
            sessionId={currentSessionId}
            initialMessages={currentSession?.messages ?? []}
            onMessagesChange={handleMessagesChange}
          />
        </main>
      </div>
    </div>
  );
}
