'use client';

import { LF_SKILLS, SKILL_CATEGORY_LABELS, type LFSkill } from '@/lib/lf-skills';
import { cn } from '@/lib/cn';

interface SkillsGridProps {
  onSelect: (prompt: string) => void;
  userName?: string;
}

const CATEGORY_ORDER: LFSkill['category'][] = [
  'morning', 'email', 'vendor', 'calendar', 'files', 'tasks',
];

export function SkillsGrid({ onSelect, userName = 'there' }: SkillsGridProps) {
  const grouped = CATEGORY_ORDER.reduce<Record<string, LFSkill[]>>((acc, cat) => {
    const skills = LF_SKILLS.filter((s) => s.category === cat);
    if (skills.length) acc[cat] = skills;
    return acc;
  }, {});

  return (
    <div className="flex flex-col items-center h-full overflow-y-auto px-4 py-8 gap-6">
      {/* Hero */}
      <div className="text-center space-y-1.5 max-w-md">
        <div className="w-12 h-12 rounded-2xl bg-primary/10 flex items-center justify-center mx-auto">
          <span className="text-primary text-xl font-bold">LF</span>
        </div>
        <h2 className="text-xl font-semibold">Good day, {userName}!</h2>
        <p className="text-sm text-muted-foreground">
          Your Li &amp; Fung workspace assistant. Pick a skill or type a message below.
        </p>
      </div>

      {/* Skill categories */}
      <div className="w-full max-w-2xl space-y-5">
        {Object.entries(grouped).map(([cat, skills]) => (
          <div key={cat}>
            <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-2">
              {SKILL_CATEGORY_LABELS[cat as LFSkill['category']]}
            </p>
            <div className="grid grid-cols-2 gap-2">
              {skills.map((skill) => (
                <SkillCard key={skill.id} skill={skill} onSelect={onSelect} />
              ))}
            </div>
          </div>
        ))}
      </div>

      <p className="text-xs text-muted-foreground mt-2">
        Tip: type <kbd className="px-1 py-0.5 rounded border border-border text-xs font-mono">/</kbd> in the input to search skills
      </p>
    </div>
  );
}

function SkillCard({
  skill,
  onSelect,
}: {
  skill: LFSkill;
  onSelect: (prompt: string) => void;
}) {
  return (
    <button
      onClick={() => onSelect(skill.prompt)}
      className={cn(
        'group flex items-start gap-2.5 p-3 rounded-xl border border-border text-left',
        'hover:border-primary/40 hover:bg-primary/5 transition-all duration-150'
      )}
    >
      <span className="text-base shrink-0 mt-0.5">{skill.emoji}</span>
      <div className="min-w-0">
        <p className="text-sm font-medium leading-snug group-hover:text-primary transition-colors">
          {skill.name}
        </p>
        <p className="text-xs text-muted-foreground mt-0.5 leading-relaxed line-clamp-2">
          {skill.description}
        </p>
      </div>
    </button>
  );
}
