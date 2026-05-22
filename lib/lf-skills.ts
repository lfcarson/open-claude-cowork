export interface LFSkill {
  id: string;
  name: string;
  description: string;
  prompt: string;
  category: 'morning' | 'email' | 'calendar' | 'files' | 'vendor' | 'tasks';
  emoji: string;
  keywords: string[];
}

export const LF_SKILLS: LFSkill[] = [
  // ── Morning ─────────────────────────────────────────────────────────────
  {
    id: 'morning-briefing',
    name: 'Morning Briefing',
    description: "Today's meetings, unread emails, and pending tasks in one summary",
    prompt:
      "Give me a morning briefing. Please: (1) summarise my unread emails from the last 24 hours, highlighting anything urgent; (2) list today's calendar events with times; (3) show my pending tasks sorted by importance.",
    category: 'morning',
    emoji: '☀️',
    keywords: ['morning', 'briefing', 'daily', 'summary', 'start'],
  },

  // ── Email ────────────────────────────────────────────────────────────────
  {
    id: 'unread-summary',
    name: 'Unread Email Summary',
    description: 'Summarise all unread emails with action items',
    prompt:
      'List all my unread emails and for each one: sender, subject, a one-line summary, and whether I need to take action. Group by urgency.',
    category: 'email',
    emoji: '📬',
    keywords: ['unread', 'inbox', 'email', 'summary', 'messages'],
  },
  {
    id: 'vendor-rfq-digest',
    name: 'Vendor RFQ Digest',
    description: 'Collect and summarise recent vendor RFQ emails',
    prompt:
      'Search my inbox for vendor RFQ (Request for Quotation) emails from the past 2 weeks. For each one list: vendor name, product/category requested, quoted timeline, price (if mentioned), and any outstanding questions that need a reply.',
    category: 'vendor',
    emoji: '📋',
    keywords: ['rfq', 'vendor', 'quotation', 'quote', 'sourcing'],
  },
  {
    id: 'contract-followup',
    name: 'Contract Follow-up',
    description: 'Find contract-related emails and flag what needs action',
    prompt:
      'Search my emails for anything related to contracts, agreements, or terms in the past month. Identify which ones are awaiting my signature, my review, or a reply, and summarise the status of each.',
    category: 'email',
    emoji: '📝',
    keywords: ['contract', 'agreement', 'terms', 'signature', 'legal'],
  },
  {
    id: 'sample-status',
    name: 'Sample Approval Status',
    description: 'Check sample approval emails and identify pending approvals',
    prompt:
      'Search my emails for sample approval, sample review, or sample feedback messages from the last 3 weeks. List each one with: vendor/brand, product description, current status (approved / rejected / pending), and any comments needed.',
    category: 'vendor',
    emoji: '🧵',
    keywords: ['sample', 'approval', 'review', 'fabric', 'prototype'],
  },
  {
    id: 'draft-vendor-reply',
    name: 'Draft Vendor Reply',
    description: 'Find the latest vendor email and draft a professional reply',
    prompt:
      "Find the most recent email from a vendor in my inbox. Read it and draft a professional reply on my behalf. Use Li & Fung's standard business tone: concise, polite, and action-oriented.",
    category: 'email',
    emoji: '✍️',
    keywords: ['draft', 'reply', 'vendor', 'write', 'compose'],
  },

  // ── Calendar ─────────────────────────────────────────────────────────────
  {
    id: 'week-ahead',
    name: 'Week Ahead',
    description: "This week's full schedule with prep notes",
    prompt:
      "Show me all my calendar events for the next 7 days. For each meeting include: time, attendees if available, and a one-line note on what I might need to prepare.",
    category: 'calendar',
    emoji: '📅',
    keywords: ['week', 'schedule', 'calendar', 'meetings', 'agenda'],
  },
  {
    id: 'buying-trip-prep',
    name: 'Buying Trip Prep',
    description: 'Compile schedule and relevant files for an upcoming buying trip',
    prompt:
      'I have an upcoming buying trip. Please: (1) list all calendar events tagged with travel or buying trip in the next 3 weeks; (2) search OneDrive for any buying trip itineraries, vendor lists, or costing files; (3) check if there are any related emails I should review before I leave.',
    category: 'calendar',
    emoji: '✈️',
    keywords: ['buying', 'trip', 'travel', 'itinerary', 'sourcing trip'],
  },
  {
    id: 'meeting-prep',
    name: 'Next Meeting Prep',
    description: 'Briefing notes for your next calendar event',
    prompt:
      "What is my next calendar event? Search my emails and OneDrive for anything related to it — agenda, previous meeting notes, relevant vendor communications — and give me a 3-bullet briefing so I'm prepared.",
    category: 'calendar',
    emoji: '🤝',
    keywords: ['meeting', 'next', 'prep', 'briefing', 'notes'],
  },

  // ── Files ────────────────────────────────────────────────────────────────
  {
    id: 'recent-contracts',
    name: 'Recent Contracts',
    description: 'Find recently modified contract files in OneDrive',
    prompt:
      'Search OneDrive for contract files (keywords: contract, agreement, MSA, SOW, NDA, terms) modified in the last 30 days. List them with: file name, last modified date, and folder path.',
    category: 'files',
    emoji: '📁',
    keywords: ['contracts', 'files', 'onedrive', 'agreements', 'documents'],
  },
  {
    id: 'tna-files',
    name: 'TNA Calendar Files',
    description: 'Locate TNA (Time & Action) calendar files in OneDrive',
    prompt:
      'Search OneDrive for TNA (Time and Action) calendar files or critical path documents. List the most recently modified ones with their paths and last-modified dates.',
    category: 'files',
    emoji: '📊',
    keywords: ['tna', 'time and action', 'critical path', 'calendar', 'timeline'],
  },
  {
    id: 'costing-review',
    name: 'Costing Review',
    description: 'Find costing sheets and recent cost review emails',
    prompt:
      'I need to prepare for a costing review. Please: (1) search OneDrive for costing sheets or cost breakdown files updated in the last 2 weeks; (2) search my inbox for any emails about pricing, cost targets, or margin review.',
    category: 'files',
    emoji: '💰',
    keywords: ['cost', 'costing', 'price', 'margin', 'sheets'],
  },

  // ── Tasks ────────────────────────────────────────────────────────────────
  {
    id: 'task-review',
    name: 'Task Review',
    description: 'Review pending tasks and identify overdue items',
    prompt:
      'Show me all my pending tasks from Microsoft To Do. Identify any that are overdue or due today. Suggest which 3 I should prioritise first and why.',
    category: 'tasks',
    emoji: '✅',
    keywords: ['tasks', 'todo', 'overdue', 'pending', 'priorities'],
  },
  {
    id: 'eod-summary',
    name: 'End-of-Day Summary',
    description: 'Wrap up: completed tasks, outstanding items, tomorrow\'s meetings',
    prompt:
      "Give me an end-of-day summary: (1) what tasks do I still have open? (2) are there any emails from today I haven't replied to? (3) what's on my calendar first thing tomorrow so I can prepare tonight?",
    category: 'tasks',
    emoji: '🌙',
    keywords: ['eod', 'end of day', 'wrap up', 'tomorrow', 'recap'],
  },
];

export function filterSkills(query: string): LFSkill[] {
  const q = query.toLowerCase().replace(/^\//, '');
  if (!q) return LF_SKILLS;
  return LF_SKILLS.filter(
    (s) =>
      s.name.toLowerCase().includes(q) ||
      s.description.toLowerCase().includes(q) ||
      s.keywords.some((k) => k.includes(q))
  );
}

export const SKILL_CATEGORY_LABELS: Record<LFSkill['category'], string> = {
  morning: 'Morning',
  email: 'Email',
  calendar: 'Calendar',
  files: 'Files',
  vendor: 'Vendor & Sourcing',
  tasks: 'Tasks',
};
