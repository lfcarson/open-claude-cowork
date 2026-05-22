'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { AppSidebar } from '@/components/sidebar/AppSidebar';
import { ChatPanel, type Message } from '@/components/chat/ChatPanel';
import { TopBar } from '@/components/layout/TopBar';
import { ContextPanel } from '@/components/context-panel/ContextPanel';

interface StoredSession {
  id: string;
  title: string;
  messages: Message[];
  updatedAt: string;
}

interface SidebarSession {
  id: string;
  title: string;
  updatedAt: string;
}

const STORAGE_KEY = 'lf-cowork-sessions-v1';
const MAX_SESSIONS = 50;
// Debounce Cosmos saves to avoid hammering the DB on every keypress
const COSMOS_DEBOUNCE_MS = 2000;

// ── localStorage helpers ──────────────────────────────────────────────────

function loadLocal(): StoredSession[] {
  if (typeof window === 'undefined') return [];
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? (JSON.parse(raw) as StoredSession[]) : [];
  } catch {
    return [];
  }
}

function saveLocal(sessions: StoredSession[]) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(sessions));
  } catch {
    // quota exceeded — silently ignore
  }
}

// ── Cosmos API helpers ────────────────────────────────────────────────────

async function fetchCosmosStatus(): Promise<boolean> {
  try {
    const res = await fetch('/api/sessions');
    return res.status !== 501; // 501 = not configured
  } catch {
    return false;
  }
}

async function fetchCosmosSessions(): Promise<SidebarSession[]> {
  const res = await fetch('/api/sessions');
  if (!res.ok) return [];
  const data = await res.json();
  return (data.sessions as SidebarSession[]) ?? [];
}

async function fetchCosmosSession(id: string): Promise<StoredSession | null> {
  const res = await fetch(`/api/sessions/${id}`);
  if (!res.ok) return null;
  return res.json();
}

async function pushCosmosSession(session: StoredSession): Promise<void> {
  await fetch('/api/sessions', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(session),
  });
}

async function deleteCosmosSession(id: string): Promise<void> {
  await fetch(`/api/sessions/${id}`, { method: 'DELETE' });
}

// ─────────────────────────────────────────────────────────────────────────

interface HomeClientProps {
  userName: string;
}

export function HomeClient({ userName }: HomeClientProps) {
  const [sessions, setSessions] = useState<StoredSession[]>([]);
  const [sidebarSessions, setSidebarSessions] = useState<SidebarSession[]>([]);
  const [currentSessionId, setCurrentSessionId] = useState<string>('');
  const [pendingInsert, setPendingInsert] = useState<string>('');
  const [usesCosmos, setUsesCosmos] = useState(false);

  const cosmosDebounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // ── Mount: detect Cosmos, hydrate sessions ──────────────────────────────
  useEffect(() => {
    let cancelled = false;

    async function init() {
      const cosmosAvailable = await fetchCosmosStatus();
      if (cancelled) return;

      if (cosmosAvailable) {
        setUsesCosmos(true);
        const cosmosItems = await fetchCosmosSessions();
        if (cancelled) return;

        setSidebarSessions(cosmosItems);
        // Also merge into localStorage as a local cache
        const localSessions = loadLocal();
        // Keep local sessions that aren't in Cosmos yet (offline edits)
        const merged = [
          ...cosmosItems.map((s) => {
            const local = localSessions.find((l) => l.id === s.id);
            return local ?? { ...s, messages: [] };
          }),
          ...localSessions.filter((l) => !cosmosItems.find((c) => c.id === l.id)),
        ].slice(0, MAX_SESSIONS);
        setSessions(merged);
        setCurrentSessionId(merged[0]?.id ?? crypto.randomUUID());
      } else {
        // localStorage only
        const stored = loadLocal();
        setSessions(stored);
        setSidebarSessions(stored.map(({ id, title, updatedAt }) => ({ id, title, updatedAt })));
        setCurrentSessionId(stored[0]?.id ?? crypto.randomUUID());
      }
    }

    init();
    return () => { cancelled = true; };
  }, []);

  // ── Session management ──────────────────────────────────────────────────

  const handleNewChat = useCallback(() => {
    setCurrentSessionId(crypto.randomUUID());
  }, []);

  const handleSelectSession = useCallback(
    async (id: string) => {
      setCurrentSessionId(id);
      // Lazy-load full messages from Cosmos if not already in local state
      if (usesCosmos) {
        const existing = sessions.find((s) => s.id === id && s.messages.length > 0);
        if (!existing) {
          const doc = await fetchCosmosSession(id);
          if (doc) {
            setSessions((prev) =>
              prev.map((s) => (s.id === id ? { ...s, messages: doc.messages } : s))
            );
          }
        }
      }
    },
    [usesCosmos, sessions]
  );

  const handleDeleteSession = useCallback(
    async (id: string) => {
      setSessions((prev) => {
        const next = prev.filter((s) => s.id !== id);
        saveLocal(next);
        return next;
      });
      setSidebarSessions((prev) => prev.filter((s) => s.id !== id));

      if (usesCosmos) await deleteCosmosSession(id);

      // Switch to another session if we deleted the current one
      setCurrentSessionId((prev) => {
        if (prev !== id) return prev;
        return sessions.find((s) => s.id !== id)?.id ?? crypto.randomUUID();
      });
    },
    [usesCosmos, sessions]
  );

  const handleMessagesChange = useCallback(
    (id: string, messages: Message[]) => {
      setSessions((prev) => {
        const title = messages.find((m) => m.role === 'user')?.content.slice(0, 50) ?? 'New chat';
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

        // Always persist to localStorage immediately
        saveLocal(trimmed);

        // Update sidebar sessions list
        setSidebarSessions(
          trimmed.map(({ id, title, updatedAt }) => ({ id, title, updatedAt }))
        );

        // Debounce Cosmos write
        if (usesCosmos) {
          if (cosmosDebounceRef.current) clearTimeout(cosmosDebounceRef.current);
          cosmosDebounceRef.current = setTimeout(() => {
            pushCosmosSession(updated).catch(console.error);
          }, COSMOS_DEBOUNCE_MS);
        }

        return trimmed;
      });
    },
    [usesCosmos]
  );

  const handleContextInsert = useCallback((text: string) => {
    setPendingInsert(text);
  }, []);

  // ── Render ──────────────────────────────────────────────────────────────

  const currentSession = sessions.find((s) => s.id === currentSessionId);

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
          onDeleteSession={handleDeleteSession}
        />
        <main className="flex-1 overflow-hidden min-w-0">
          <ChatPanel
            key={currentSessionId}
            userName={userName}
            sessionId={currentSessionId}
            initialMessages={currentSession?.messages ?? []}
            onMessagesChange={handleMessagesChange}
            pendingInsert={pendingInsert}
            onPendingInsertConsumed={() => setPendingInsert('')}
          />
        </main>
        <ContextPanel onInsert={handleContextInsert} />
      </div>
    </div>
  );
}
