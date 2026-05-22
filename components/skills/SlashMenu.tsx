'use client';

import { useEffect, useRef } from 'react';
import { filterSkills, type LFSkill } from '@/lib/lf-skills';
import { cn } from '@/lib/cn';

interface SlashMenuProps {
  query: string;
  selectedIndex: number;
  onSelect: (skill: LFSkill) => void;
  onClose: () => void;
}

export function SlashMenu({ query, selectedIndex, onSelect, onClose }: SlashMenuProps) {
  const skills = filterSkills(query);
  const listRef = useRef<HTMLUListElement>(null);

  // Scroll the active item into view
  useEffect(() => {
    const el = listRef.current?.children[selectedIndex] as HTMLElement | undefined;
    el?.scrollIntoView({ block: 'nearest' });
  }, [selectedIndex]);

  if (!skills.length) return null;

  return (
    <>
      {/* Backdrop */}
      <div className="fixed inset-0 z-40" onClick={onClose} />

      {/* Menu */}
      <div className="absolute bottom-full left-0 right-0 mb-2 z-50">
        <div className="mx-auto max-w-2xl">
          <div className="rounded-xl border border-border bg-popover shadow-lg overflow-hidden">
            <div className="px-3 py-1.5 border-b border-border bg-muted/40">
              <p className="text-xs text-muted-foreground">
                {skills.length} skill{skills.length !== 1 ? 's' : ''} — ↑↓ to navigate, Enter to select, Esc to close
              </p>
            </div>
            <ul ref={listRef} className="max-h-64 overflow-y-auto py-1">
              {skills.map((skill, i) => (
                <li key={skill.id}>
                  <button
                    onMouseDown={(e) => { e.preventDefault(); onSelect(skill); }}
                    className={cn(
                      'w-full flex items-center gap-3 px-3 py-2 text-left transition-colors',
                      i === selectedIndex ? 'bg-accent' : 'hover:bg-accent/60'
                    )}
                  >
                    <span className="text-base shrink-0">{skill.emoji}</span>
                    <div className="min-w-0">
                      <span className="text-sm font-medium">{skill.name}</span>
                      <span className="text-xs text-muted-foreground ml-2 truncate hidden sm:inline">
                        {skill.description}
                      </span>
                    </div>
                  </button>
                </li>
              ))}
            </ul>
          </div>
        </div>
      </div>
    </>
  );
}
