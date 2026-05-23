import type OpenAI from 'openai';

export const M365_TOOLS: OpenAI.ChatCompletionTool[] = [
  {
    type: 'function',
    function: {
      name: 'mail_list',
      description: 'List recent emails from a mail folder.',
      parameters: {
        type: 'object',
        properties: {
          folder: {
            type: 'string',
            enum: ['inbox', 'sent', 'drafts', 'junk'],
            description: 'Which folder to list. Defaults to inbox.',
          },
          top: { type: 'number', description: 'How many emails to return (1-50). Default 10.' },
          filter: { type: 'string', description: 'OData filter, e.g. "isRead eq false"' },
        },
        required: [],
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'mail_get',
      description: 'Get the full body of a specific email by its ID.',
      parameters: {
        type: 'object',
        properties: {
          id: { type: 'string', description: 'The email message ID' },
        },
        required: ['id'],
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'mail_search',
      description: 'Search for emails matching a query string.',
      parameters: {
        type: 'object',
        properties: {
          query: { type: 'string', description: 'Search terms, e.g. "vendor RFQ"' },
          top: { type: 'number', description: 'Max results (1-25). Default 10.' },
        },
        required: ['query'],
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'mail_send',
      description: 'Send a new email on behalf of the user.',
      parameters: {
        type: 'object',
        properties: {
          to: { type: 'string', description: 'Recipient email address(es), comma-separated' },
          subject: { type: 'string', description: 'Email subject' },
          body: { type: 'string', description: 'Email body (plain text)' },
          cc: { type: 'string', description: 'CC recipients, comma-separated (optional)' },
        },
        required: ['to', 'subject', 'body'],
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'mail_reply',
      description: 'Reply to an existing email.',
      parameters: {
        type: 'object',
        properties: {
          id: { type: 'string', description: 'The message ID to reply to' },
          body: { type: 'string', description: 'Reply body text' },
          reply_all: { type: 'boolean', description: 'Reply All instead of Reply. Default false.' },
        },
        required: ['id', 'body'],
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'calendar_list_events',
      description: 'List upcoming calendar events.',
      parameters: {
        type: 'object',
        properties: {
          days: { type: 'number', description: 'Days ahead to look (1-30). Default 7.' },
          top: { type: 'number', description: 'Max events (1-50). Default 10.' },
        },
        required: [],
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'calendar_create_event',
      description: 'Create a new calendar event.',
      parameters: {
        type: 'object',
        properties: {
          subject: { type: 'string', description: 'Event title' },
          start: { type: 'string', description: 'Start datetime ISO 8601, e.g. "2024-11-15T09:00:00"' },
          end: { type: 'string', description: 'End datetime ISO 8601, e.g. "2024-11-15T10:00:00"' },
          location: { type: 'string', description: 'Location or meeting link (optional)' },
          attendees: { type: 'string', description: 'Attendee emails, comma-separated (optional)' },
          body: { type: 'string', description: 'Description/notes (optional)' },
        },
        required: ['subject', 'start', 'end'],
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'files_list',
      description: 'List files and folders in OneDrive.',
      parameters: {
        type: 'object',
        properties: {
          path: { type: 'string', description: 'Folder path to list. Use "/" for root. Default "/".' },
          top: { type: 'number', description: 'Max items (1-100). Default 20.' },
        },
        required: [],
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'files_search',
      description: 'Search for files across OneDrive and SharePoint.',
      parameters: {
        type: 'object',
        properties: {
          query: { type: 'string', description: 'Search terms, e.g. "contract 2024"' },
          top: { type: 'number', description: 'Max results (1-25). Default 10.' },
        },
        required: ['query'],
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'todo_list_tasks',
      description: 'List tasks from Microsoft To Do.',
      parameters: {
        type: 'object',
        properties: {
          list_name: { type: 'string', description: 'Task list name. Default "Tasks".' },
          completed: { type: 'boolean', description: 'Include completed tasks. Default false.' },
        },
        required: [],
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'todo_create_task',
      description: 'Create a new task in Microsoft To Do.',
      parameters: {
        type: 'object',
        properties: {
          title: { type: 'string', description: 'Task title' },
          due_date: { type: 'string', description: 'Due date as YYYY-MM-DD (optional)' },
          list_name: { type: 'string', description: 'Task list to add to. Default "Tasks".' },
          body: { type: 'string', description: 'Task notes (optional)' },
        },
        required: ['title'],
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'people_search',
      description: 'Search for colleagues and contacts in the organisation directory.',
      parameters: {
        type: 'object',
        properties: {
          query: { type: 'string', description: 'Name or partial email to search' },
        },
        required: ['query'],
      },
    },
  },
];
