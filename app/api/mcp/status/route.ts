import { NextRequest } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';

export const dynamic = 'force-dynamic';

export async function GET(_req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session) {
    return new Response(JSON.stringify({ error: 'Unauthorized' }), { status: 401 });
  }

  const hasCredentials = Boolean(
    process.env.AZURE_AD_CLIENT_ID &&
    process.env.AZURE_AD_CLIENT_SECRET &&
    process.env.AZURE_AD_TENANT_ID
  );

  return Response.json({
    status: hasCredentials ? 'ready' : 'missing_credentials',
    tools: [
      'mail_list', 'mail_get', 'mail_search', 'mail_send', 'mail_reply',
      'calendar_list_events', 'calendar_create_event',
      'files_list', 'files_search',
      'todo_list_tasks', 'todo_create_task',
      'people_search',
    ],
    implementation: 'direct-graph-api',
  });
}
