'use client';

import { useState } from 'react';
import { ChevronDown, ChevronRight, Wrench, CheckCircle2, XCircle, Loader2 } from 'lucide-react';
import { cn } from '@/lib/cn';
import type { ToolCall } from './ChatPanel';

interface ToolCallCardProps {
  toolCall: ToolCall;
}

export function ToolCallCard({ toolCall }: ToolCallCardProps) {
  const [expanded, setExpanded] = useState(false);
  const isPending = toolCall.result === undefined;
  const isError = toolCall.error;

  return (
    <div
      className={cn(
        'rounded-lg border text-xs font-mono overflow-hidden',
        isPending && 'border-border bg-muted/50',
        !isPending && !isError && 'border-green-200 bg-green-50 dark:border-green-800 dark:bg-green-950/20',
        isError && 'border-red-200 bg-red-50 dark:border-red-800 dark:bg-red-950/20'
      )}
    >
      <button
        onClick={() => setExpanded(!expanded)}
        className="flex items-center gap-2 w-full px-3 py-2 text-left hover:bg-black/5 transition-colors"
      >
        {isPending ? (
          <Loader2 className="w-3 h-3 shrink-0 animate-spin text-muted-foreground" />
        ) : isError ? (
          <XCircle className="w-3 h-3 shrink-0 text-red-500" />
        ) : (
          <CheckCircle2 className="w-3 h-3 shrink-0 text-green-600" />
        )}
        <Wrench className="w-3 h-3 shrink-0 text-muted-foreground" />
        <span className="font-semibold">{toolCall.name}</span>
        <span className="text-muted-foreground ml-auto shrink-0">
          {expanded ? <ChevronDown className="w-3 h-3" /> : <ChevronRight className="w-3 h-3" />}
        </span>
      </button>

      {expanded && (
        <div className="border-t border-inherit px-3 py-2 space-y-2">
          <div>
            <p className="text-muted-foreground mb-1">Input</p>
            <pre className="whitespace-pre-wrap break-all text-xs bg-background/60 rounded p-2 max-h-32 overflow-y-auto">
              {JSON.stringify(toolCall.input, null, 2)}
            </pre>
          </div>
          {toolCall.result !== undefined && (
            <div>
              <p className={cn('mb-1', isError ? 'text-red-500' : 'text-muted-foreground')}>
                {isError ? 'Error' : 'Result'}
              </p>
              <pre className="whitespace-pre-wrap break-all text-xs bg-background/60 rounded p-2 max-h-40 overflow-y-auto">
                {toolCall.result}
              </pre>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
