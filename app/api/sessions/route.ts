import { NextRequest } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { isCosmosConfigured, listSessions, upsertSession, type SessionDoc } from '@/lib/cosmos';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

export async function GET(_req: NextRequest) {
  if (!isCosmosConfigured()) {
    return Response.json({ error: 'Cosmos DB not configured' }, { status: 501 });
  }

  const session = await getServerSession(authOptions);
  if (!session?.user?.email) {
    return Response.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const sessions = await listSessions(session.user.email);
    return Response.json({ sessions });
  } catch (err) {
    console.error('[sessions GET]', err);
    return Response.json({ error: 'Database error' }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  if (!isCosmosConfigured()) {
    return Response.json({ error: 'Cosmos DB not configured' }, { status: 501 });
  }

  const session = await getServerSession(authOptions);
  if (!session?.user?.email) {
    return Response.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const body = await req.json() as Partial<SessionDoc>;
  if (!body.id || !body.messages) {
    return Response.json({ error: 'id and messages are required' }, { status: 400 });
  }

  const doc: SessionDoc = {
    id: body.id,
    userId: session.user.email,
    title: body.title ?? 'New chat',
    messages: body.messages,
    createdAt: body.createdAt ?? new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };

  try {
    await upsertSession(doc);
    return Response.json({ ok: true });
  } catch (err) {
    console.error('[sessions POST]', err);
    return Response.json({ error: 'Database error' }, { status: 500 });
  }
}
