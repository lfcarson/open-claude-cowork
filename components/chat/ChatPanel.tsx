'use client';

import { useState, useRef, useEffect, useCallback } from 'react';
import { Send, Square } from 'lucide-react';
import { cn } from '@/lib/cn';
import { MessageBubble } from './MessageBubble';
import { ToolCallCard } from './ToolCallCard';
import { SkillsGrid } from '@/components/skills/SkillsGrid';
import { SlashMenu } from '@/components/skills/SlashMenu';
import { filterSkills, type LFSkill } from '@/lib/lf-skills';

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
  // Slash-command menu state
  const [slashOpen, setSlashOpen] = useState(false);
  const [slashIndex, setSlashIndex] = useState(0);

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

  // Pre-fill input when a context panel item is clicked.
  // Appends to any existing draft so the user doesn't lose what they were typing.
  useEffect(() => {
    if (!pendingInsert) return;
    setInput((prev) => (prev.trim() ? `${prev}\n\n${pendingInsert}` : pendingInsert));
    setSlashOpen(false);
    onPendingInsertConsumed?.();
    requestAnimationFrame(() => {
      const t = textareaRef.current;
      if (!t) return;
      t.focus();
      t.style.height = 'auto';
      t.style.height = Math.min(t.scrollHeight, 144) + 'px';
    });
  }, [pendingInsert, onPendingInsertConsumed]);

  const handleSubmit = useCallback(async (overrideText?: string) => {
    const text = (overrideText ?? input).trim();
    if (!text || isLoading) return;

    setInput('');
    setSlashOpen(false);
    setIsLoading(true);

    // Reset textarea height
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
    }

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

        if (chunk.type === 'error') {
          return {
            ...m,
            content: m.content + `\n\n*Error: ${(chunk.message as string) ?? 'Unknown error'}*`,
            isStreaming: false,
          };
        }

        return m;
      })
    );
  }

  // --- Slash command helpers ---

  function handleInputChange(value: string) {
    setInput(value);
    if (value.startsWith('/')) {
      setSlashOpen(true);
      setSlashIndex(0);
    } else {
      setSlashOpen(false);
    }
  }

  function handleSkillSelect(skill: LFSkill) {
    setInput(skill.prompt);
    setSlashOpen(false);
    requestAnimationFrame(() => {
      const t = textareaRef.current;
      if (!t) return;
      t.focus();
      t.style.height = 'auto';
      t.style.height = Math.min(t.scrollHeight, 144) + 'px';
    });
  }

  function handleKeyDown(e: React.KeyboardEvent<HTMLTextAreaElement>) {
    if (slashOpen) {
      const skills = filterSkills(input);
      if (e.key === 'ArrowDown') {
        e.preventDefault();
        setSlashIndex((i) => Math.min(i + 1, skills.length - 1));
        return;
      }
      if (e.key === 'ArrowUp') {
        e.preventDefault();
        setSlashIndex((i) => Math.max(i - 1, 0));
        return;
      }
      if (e.key === 'Enter' || e.key === 'Tab') {
        e.preventDefault();
        if (skills[slashIndex]) handleSkillSelect(skills[slashIndex]);
        return;
      }
      if (e.key === 'Escape') {
        e.preventDefault();
        setSlashOpen(false);
        return;
      }
    }
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSubmit();
    }
  }

  const isEmpty = messages.length === 0;

  return (
    <div className="flex flex-col h-full">
      {/* Message area / empty state */}
      <div className="flex-1 overflow-y-auto">
        {isEmpty ? (
          <SkillsGrid
            userName={userName}
            onSelect={(prompt) => {
              setInput(prompt);
              requestAnimationFrame(() => {
                textareaRef.current?.focus();
              });
            }}
          />
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
        <div className="max-w-3xl mx-auto relative">
          {/* Slash command menu */}
          {slashOpen && (
            <SlashMenu
              query={input}
              selectedIndex={slashIndex}
              onSelect={handleSkillSelect}
              onClose={() => setSlashOpen(false)}
            />
          )}

          <div className="flex gap-2 items-end rounded-xl border border-border bg-background shadow-sm focus-within:ring-2 focus-within:ring-ring px-3 py-2">
            <textarea
              ref={textareaRef}
              value={input}
              onChange={(e) => handleInputChange(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="Message LF Cowork… or type / for skills"
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
                onClick={() => handleSubmit()}
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
            Enter to send · Shift+Enter for new line · / for skills
          </p>
        </div>
      </div>
    </div>
  );
}
