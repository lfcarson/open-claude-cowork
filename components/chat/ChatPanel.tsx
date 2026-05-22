'use client';

import { useState, useRef, useEffect, useCallback } from 'react';
import { Send, Square } from 'lucide-react';
import { cn } from '@/lib/cn';
import { MessageBubble } from './MessageBubble';
import { ToolCallCard } from './ToolCallCard';

export interface Message {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  toolCalls?: ToolCall[];
  isStreaming?: boolean;
}

export interface ToolCall {
  id: string;
  name: string;
  input: Record<string, unknown>;
  result?: string;
  error?: boolean;
}

interface ChatPanelProps {
  userName?: string;
  sessionId?: string;
  initialMessages?: Message[];
  onMessagesChange?: (sessionId: string, messages: Message[]) => void;
  pendingInsert?: string;
  onPendingInsertConsumed?: () => void;
}

export function ChatPanel({
  userName = 'there',
  sessionId,
  initialMessages = [],
  onMessagesChange,
  pendingInsert,
  onPendingInsertConsumed,
}: ChatPanelProps) {
  const [messages, setMessages] = useState<Message[]>(initialMessages);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const abortRef = useRef<AbortController | null>(null);
  const isFirstRender = useRef(true);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  // Persist messages whenever they change (skip initial render)
  useEffect(() => {
    if (isFirstRender.current) {
      isFirstRender.current = false;
      return;
    }
    if (onMessagesChange && sessionId && messages.length > 0) {
      onMessagesChange(sessionId, messages);
    }
  }, [messages, onMessagesChange, sessionId]);

  // Pre-fill input when a context panel item is clicked
  useEffect(() => {
    if (!pendingInsert) return;
    setInput(pendingInsert);
    onPendingInsertConsumed?.();
    // Focus and resize textarea
    requestAnimationFrame(() => {
      const t = textareaRef.current;
      if (!t) return;
      t.focus();
      t.style.height = 'auto';
      t.style.height = Math.min(t.scrollHeight, 144) + 'px';
    });
  }, [pendingInsert, onPendingInsertConsumed]);

  const handleSubmit = useCallback(async () => {
    const text = input.trim();
    if (!text || isLoading) return;

    setInput('');
    setIsLoading(true);

    const userMsg: Message = {
      id: crypto.randomUUID(),
      role: 'user',
      content: text,
    };

    const assistantMsg: Message = {
      id: crypto.randomUUID(),
      role: 'assistant',
      content: '',
      toolCalls: [],
      isStreaming: true,
    };

    setMessages((prev) => [...prev, userMsg, assistantMsg]);

    abortRef.current = new AbortController();

    try {
      const res = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          message: text,
          chatId: sessionId,
          messages: messages.map((m) => ({ role: m.role, content: m.content })),
        }),
        signal: abortRef.current.signal,
      });

      if (!res.ok) throw new Error(`Server error: ${res.status}`);

      const reader = res.body?.getReader();
      if (!reader) throw new Error('No response body');
      const decoder = new TextDecoder();

      let buffer = '';
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split('\n');
        buffer = lines.pop() ?? '';

        for (const line of lines) {
          if (!line.startsWith('data: ')) continue;
          const raw = line.slice(6).trim();
          if (!raw || raw === '[DONE]') continue;
          try {
            handleChunk(JSON.parse(raw), assistantMsg.id);
          } catch {
            // skip malformed chunk
          }
        }
      }
    } catch (err: unknown) {
      if (!(err instanceof Error && err.name === 'AbortError')) {
        setMessages((prev) =>
          prev.map((m) =>
            m.id === assistantMsg.id
              ? {
                  ...m,
                  content: m.content + '\n\n*Error: Could not reach the server.*',
                  isStreaming: false,
                }
              : m
          )
        );
      }
    } finally {
      setMessages((prev) =>
        prev.map((m) => (m.id === assistantMsg.id ? { ...m, isStreaming: false } : m))
      );
      setIsLoading(false);
      abortRef.current = null;
    }
  }, [input, isLoading, sessionId, messages]);

  function handleChunk(chunk: Record<string, unknown>, msgId: string) {
    setMessages((prev) =>
      prev.map((m) => {
        if (m.id !== msgId) return m;

        if (chunk.type === 'text') {
          return { ...m, content: m.content + ((chunk.content as string) ?? '') };
        }

        if (chunk.type === 'tool_use') {
          const tc: ToolCall = {
            id: (chunk.id as string) ?? crypto.randomUUID(),
            name: chunk.name as string,
            input: (chunk.input as Record<string, unknown>) ?? {},
          };
          return { ...m, toolCalls: [...(m.toolCalls ?? []), tc] };
        }

        if (chunk.type === 'tool_result') {
          return {
            ...m,
            toolCalls: (m.toolCalls ?? []).map((tc) =>
              tc.id === chunk.tool_use_id
                ? { ...tc, result: chunk.content as string, error: chunk.is_error as boolean }
                : tc
            ),
          };
        }

        return m;
      })
    );
  }

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSubmit();
    }
  };

  const isEmpty = messages.length === 0;

  return (
    <div className="flex flex-col h-full">
      {/* Message area */}
      <div className="flex-1 overflow-y-auto">
        {isEmpty ? (
          <div className="flex flex-col items-center justify-center h-full gap-3 text-center px-4">
            <div className="w-12 h-12 rounded-2xl bg-primary/10 flex items-center justify-center">
              <span className="text-primary text-xl font-bold">LF</span>
            </div>
            <h2 className="text-xl font-semibold">Good day, {userName}!</h2>
            <p className="text-muted-foreground text-sm max-w-md">
              Ask me anything — I can read your emails, check your calendar, search OneDrive, or help with Li &amp; Fung workflows.
            </p>
            <div className="flex flex-wrap gap-2 justify-center mt-2">
              {[
                'Summarize my unread emails',
                "What's on my calendar today?",
                'Find recent contract files in OneDrive',
                'Draft a reply to the latest vendor email',
              ].map((s) => (
                <button
                  key={s}
                  onClick={() => setInput(s)}
                  className="text-xs px-3 py-1.5 rounded-full border border-border hover:bg-accent transition-colors"
                >
                  {s}
                </button>
              ))}
            </div>
          </div>
        ) : (
          <div className="max-w-3xl mx-auto px-4 py-6 space-y-6">
            {messages.map((msg) => (
              <div key={msg.id} className="space-y-2">
                {msg.toolCalls && msg.toolCalls.length > 0 && (
                  <div className="space-y-2">
                    {msg.toolCalls.map((tc) => (
                      <ToolCallCard key={tc.id} toolCall={tc} />
                    ))}
                  </div>
                )}
                {(msg.content || msg.isStreaming) && <MessageBubble message={msg} />}
              </div>
            ))}
            <div ref={bottomRef} />
          </div>
        )}
      </div>

      {/* Input area */}
      <div className="border-t border-border p-4">
        <div className="max-w-3xl mx-auto">
          <div className="flex gap-2 items-end rounded-xl border border-border bg-background shadow-sm focus-within:ring-2 focus-within:ring-ring px-3 py-2">
            <textarea
              ref={textareaRef}
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="Message LF Cowork…"
              rows={1}
              className="flex-1 resize-none bg-transparent text-sm outline-none placeholder:text-muted-foreground max-h-36 overflow-y-auto"
              style={{ height: 'auto' }}
              onInput={(e) => {
                const t = e.currentTarget;
                t.style.height = 'auto';
                t.style.height = Math.min(t.scrollHeight, 144) + 'px';
              }}
            />
            {isLoading ? (
              <button
                onClick={() => abortRef.current?.abort()}
                className="p-1.5 rounded-lg bg-destructive/10 hover:bg-destructive/20 text-destructive transition-colors shrink-0"
                title="Stop generation"
              >
                <Square className="w-4 h-4" />
              </button>
            ) : (
              <button
                onClick={handleSubmit}
                disabled={!input.trim()}
                className={cn(
                  'p-1.5 rounded-lg transition-colors shrink-0',
                  input.trim()
                    ? 'bg-primary text-primary-foreground hover:bg-primary/90'
                    : 'bg-muted text-muted-foreground cursor-not-allowed'
                )}
                title="Send message"
              >
                <Send className="w-4 h-4" />
              </button>
            )}
          </div>
          <p className="text-xs text-muted-foreground text-center mt-2">
            Enter to send · Shift+Enter for new line
          </p>
        </div>
      </div>
    </div>
  );
}
