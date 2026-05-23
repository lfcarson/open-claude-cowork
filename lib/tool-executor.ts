import { graphGet, graphPost } from './graph';

export interface ToolResult {
  content: string;
  isError: boolean;
}

/**
 * Execute an M365 tool and always return a structured result.
 * isError is true when the underlying Graph call threw, so the LLM
 * receives the correct error signal and can retry or surface the failure.
 */
export async function executeTool(
  name: string,
  input: Record<string, unknown>,
  accessToken: string
): Promise<ToolResult> {
  try {
    const content = await executeToolInner(name, input, accessToken);
    return { content, isError: false };
  } catch (err) {
    return {
      content: `Error executing ${name}: ${err instanceof Error ? err.message : String(err)}`,
      isError: true,
    };
  }
}

async function executeToolInner(
  name: string,
  input: Record<string, unknown>,
  accessToken: string
): Promise<string> {
  switch (name) {
      case 'mail_list': {
        const folder = (input.folder as string) ?? 'inbox';
        const top = Math.min((input.top as number) ?? 10, 50);
        const folderPath =
          folder === 'sent' ? 'me/mailFolders/sentItems/messages' :
          folder === 'drafts' ? 'me/mailFolders/drafts/messages' :
          folder === 'junk' ? 'me/mailFolders/junkemail/messages' :
          'me/mailFolders/inbox/messages';
        const params: Record<string, string | number> = {
          $top: top,
          $select: 'id,subject,from,receivedDateTime,isRead,bodyPreview',
          $orderby: 'receivedDateTime desc',
        };
        if (input.filter) params.$filter = input.filter as string;
        const data = await graphGet(folderPath, accessToken, params) as { value: EmailMessage[] };
        return formatEmailList(data.value);
      }

      case 'mail_get': {
        const data = await graphGet(`me/messages/${input.id}`, accessToken, {
          $select: 'id,subject,from,toRecipients,receivedDateTime,body,bodyPreview',
        }) as EmailMessage;
        return formatEmail(data);
      }

      case 'mail_search': {
        const top = Math.min((input.top as number) ?? 10, 25);
        const data = await graphGet('me/messages', accessToken, {
          $search: `"${String(input.query).replace(/"/g, '')}"`,
          $top: top,
          $select: 'id,subject,from,receivedDateTime,bodyPreview',
        }) as { value: EmailMessage[] };
        return formatEmailList(data.value);
      }

      case 'mail_send': {
        const toRecipients = String(input.to).split(',').map((e) => ({
          emailAddress: { address: e.trim() },
        }));
        const ccRecipients = input.cc
          ? String(input.cc).split(',').map((e) => ({ emailAddress: { address: e.trim() } }))
          : [];
        await graphPost('me/sendMail', accessToken, {
          message: {
            subject: input.subject,
            body: { contentType: 'Text', content: input.body },
            toRecipients,
            ...(ccRecipients.length > 0 && { ccRecipients }),
          },
        });
        return `Email sent to ${input.to} with subject "${input.subject}".`;
      }

      case 'mail_reply': {
        const endpoint = input.reply_all
          ? `me/messages/${input.id}/replyAll`
          : `me/messages/${input.id}/reply`;
        await graphPost(endpoint, accessToken, { comment: input.body });
        return 'Reply sent successfully.';
      }

      case 'calendar_list_events': {
        const days = Math.min((input.days as number) ?? 7, 30);
        const top = Math.min((input.top as number) ?? 10, 50);
        const now = new Date();
        const end = new Date(now.getTime() + days * 86_400_000);
        const data = await graphGet('me/calendarView', accessToken, {
          startDateTime: now.toISOString(),
          endDateTime: end.toISOString(),
          $top: top,
          $select: 'id,subject,start,end,location,organizer,isOnlineMeeting,bodyPreview',
          $orderby: 'start/dateTime',
        }) as { value: CalendarEvent[] };
        return formatEventList(data.value);
      }

      case 'calendar_create_event': {
        const attendees = input.attendees
          ? String(input.attendees).split(',').map((e) => ({
              emailAddress: { address: e.trim() },
              type: 'required',
            }))
          : [];
        const event = await graphPost('me/events', accessToken, {
          subject: input.subject,
          // Use HKT so datetimes the LLM generates (e.g. "09:00:00") land at
          // the correct local time for Hong Kong users (UTC+8).
          start: { dateTime: input.start, timeZone: 'Asia/Hong_Kong' },
          end: { dateTime: input.end, timeZone: 'Asia/Hong_Kong' },
          ...(input.location ? { location: { displayName: input.location } } : {}),
          ...(attendees.length > 0 ? { attendees } : {}),
          ...(input.body ? { body: { contentType: 'Text', content: input.body } } : {}),
        }) as CalendarEvent;
        return `Event created: "${event.subject}" starting ${event.start?.dateTime}.`;
      }

      case 'files_list': {
        const path = (input.path as string) ?? '/';
        const top = Math.min((input.top as number) ?? 20, 100);
        const endpoint =
          path === '/' ? 'me/drive/root/children' : `me/drive/root:/${path}:/children`;
        const data = await graphGet(endpoint, accessToken, {
          $top: top,
          $select: 'id,name,size,lastModifiedDateTime,file,folder,webUrl',
        }) as { value: DriveItem[] };
        return formatFileList(data.value);
      }

      case 'files_search': {
        const top = Math.min((input.top as number) ?? 10, 25);
        const q = String(input.query).replace(/'/g, "''");
        const data = await graphGet(`me/drive/root/search(q='${q}')`, accessToken, {
          $top: top,
          $select: 'id,name,size,lastModifiedDateTime,webUrl,parentReference',
        }) as { value: DriveItem[] };
        return formatFileList(data.value);
      }

      case 'todo_list_tasks': {
        const lists = await graphGet('me/todo/lists', accessToken, {
          $select: 'id,displayName',
        }) as { value: { id: string; displayName: string }[] };

        const listName = (input.list_name as string) ?? 'Tasks';
        const list = lists.value.find(
          (l) => l.displayName.toLowerCase() === listName.toLowerCase()
        ) ?? lists.value[0];
        if (!list) return 'No task lists found.';

        const params: Record<string, string | number> = {
          $select: 'id,title,status,dueDateTime,importance',
          $top: 50,
        };
        if (!input.completed) params.$filter = "status ne 'completed'";

        const tasks = await graphGet(
          `me/todo/lists/${list.id}/tasks`,
          accessToken,
          params
        ) as { value: TodoTask[] };
        return formatTaskList(tasks.value, list.displayName);
      }

      case 'todo_create_task': {
        const lists = await graphGet('me/todo/lists', accessToken, {
          $select: 'id,displayName',
        }) as { value: { id: string; displayName: string }[] };

        const listName = (input.list_name as string) ?? 'Tasks';
        const list = lists.value.find(
          (l) => l.displayName.toLowerCase() === listName.toLowerCase()
        ) ?? lists.value[0];
        if (!list) return 'No task lists found.';

        await graphPost(`me/todo/lists/${list.id}/tasks`, accessToken, {
          title: input.title,
          ...(input.body ? { body: { contentType: 'text', content: input.body } } : {}),
          ...(input.due_date
            ? { dueDateTime: { dateTime: `${input.due_date}T00:00:00`, timeZone: 'UTC' } }
            : {}),
        });
        return `Task "${input.title}" created in "${list.displayName}".`;
      }

      case 'people_search': {
        const data = await graphGet('me/people', accessToken, {
          $search: String(input.query),
          $top: 10,
          $select: 'displayName,emailAddresses,jobTitle,department',
        }) as { value: Person[] };
        return formatPeopleList(data.value);
      }

      default:
        throw new Error(`Unknown tool: ${name}`);
    }
}

// --- Type definitions ---

interface EmailMessage {
  id: string;
  subject?: string;
  from?: { emailAddress: { name?: string; address: string } };
  receivedDateTime?: string;
  isRead?: boolean;
  bodyPreview?: string;
  body?: { contentType: string; content: string };
}

interface CalendarEvent {
  subject?: string;
  start?: { dateTime: string };
  end?: { dateTime: string };
  location?: { displayName: string };
  isOnlineMeeting?: boolean;
  bodyPreview?: string;
}

interface DriveItem {
  name?: string;
  size?: number;
  lastModifiedDateTime?: string;
  file?: { mimeType: string };
  folder?: { childCount: number };
  webUrl?: string;
}

interface TodoTask {
  title?: string;
  status?: string;
  dueDateTime?: { dateTime: string };
  importance?: string;
}

interface Person {
  displayName?: string;
  emailAddresses?: { address: string }[];
  jobTitle?: string;
  department?: string;
}

// --- Formatters ---

function formatEmailList(emails: EmailMessage[]): string {
  if (!emails?.length) return 'No emails found.';
  return emails
    .map((m, i) => {
      const from = m.from?.emailAddress?.name ?? m.from?.emailAddress?.address ?? 'Unknown';
      const date = m.receivedDateTime
        ? new Date(m.receivedDateTime).toLocaleString('en-HK')
        : '';
      const unread = m.isRead === false ? ' [UNREAD]' : '';
      return `${i + 1}. **${m.subject ?? '(no subject)'}**${unread}\n   From: ${from} · ${date}\n   ID: \`${m.id}\`\n   ${m.bodyPreview?.slice(0, 100) ?? ''}`;
    })
    .join('\n\n');
}

function formatEmail(m: EmailMessage): string {
  const from = m.from?.emailAddress?.name ?? m.from?.emailAddress?.address ?? 'Unknown';
  const date = m.receivedDateTime
    ? new Date(m.receivedDateTime).toLocaleString('en-HK')
    : '';
  const body = m.body?.content ?? m.bodyPreview ?? '';
  const plain = body.replace(/<[^>]+>/g, ' ').replace(/&nbsp;/g, ' ').replace(/\s+/g, ' ').trim();
  return `**Subject:** ${m.subject ?? '(no subject)'}\n**From:** ${from}\n**Date:** ${date}\n\n${plain}`;
}

function formatEventList(events: CalendarEvent[]): string {
  if (!events?.length) return 'No upcoming events found.';
  return events
    .map((e, i) => {
      const start = e.start?.dateTime
        ? new Date(e.start.dateTime).toLocaleString('en-HK')
        : '';
      const loc = e.location?.displayName ? ` · ${e.location.displayName}` : '';
      const online = e.isOnlineMeeting ? ' [Online]' : '';
      return `${i + 1}. **${e.subject ?? '(no title)'}**\n   ${start}${loc}${online}`;
    })
    .join('\n\n');
}

function formatFileList(files: DriveItem[]): string {
  if (!files?.length) return 'No files found.';
  return files
    .map((f, i) => {
      const type = f.folder
        ? `Folder (${f.folder.childCount} items)`
        : f.file?.mimeType ?? 'File';
      const size = f.size ? ` · ${(f.size / 1024).toFixed(1)} KB` : '';
      const date = f.lastModifiedDateTime
        ? ` · ${new Date(f.lastModifiedDateTime).toLocaleDateString('en-HK')}`
        : '';
      return `${i + 1}. **${f.name}** — ${type}${size}${date}`;
    })
    .join('\n');
}

function formatTaskList(tasks: TodoTask[], listName: string): string {
  if (!tasks?.length) return `No tasks in "${listName}".`;
  return (
    `**${listName}** (${tasks.length} task${tasks.length !== 1 ? 's' : ''})\n\n` +
    tasks
      .map((t, i) => {
        const due = t.dueDateTime
          ? ` · Due ${new Date(t.dueDateTime.dateTime).toLocaleDateString('en-HK')}`
          : '';
        const done = t.status === 'completed' ? ' ✓' : '';
        return `${i + 1}.${done} **${t.title ?? '(untitled)'}**${due}`;
      })
      .join('\n')
  );
}

function formatPeopleList(people: Person[]): string {
  if (!people?.length) return 'No contacts found.';
  return people
    .map((p, i) => {
      const email = p.emailAddresses?.[0]?.address ?? '';
      const role = [p.jobTitle, p.department].filter(Boolean).join(', ');
      return `${i + 1}. **${p.displayName}**${email ? ` <${email}>` : ''}${role ? `\n   ${role}` : ''}`;
    })
    .join('\n\n');
}
