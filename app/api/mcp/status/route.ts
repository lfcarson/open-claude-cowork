import { NextRequest } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';

export const dynamic = 'force-dynamic';

export async function GET(_req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session) {
    return new Response(JSON.stringify({ error: 'Unauthorized' }), { status: 401 });
  }

  // In Phase 3 this will query the live MCP server process.
  // For now, return a static capability manifest.
  return Response.json({
    status: 'configured',
    servers: [
      {
        name: 'm365',
        package: '@softeria/ms-365-mcp-server',
        status: process.env.AZURE_AD_CLIENT_ID ? 'ready' : 'missing_credentials',
        capabilities: [
          'mail_list', 'mail_send', 'mail_get',
          'calendar_list_events', 'calendar_create_event',
          'files_list', 'files_get', 'files_upload',
          'teams_list', 'teams_send_message',
          'todo_list', 'todo_create',
        ],
      },
    ],
  });
}
