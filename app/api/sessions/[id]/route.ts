import { NextRequest } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { isCosmosConfigured, getSession, deleteSession } from '@/lib/cosmos';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

export async function GET(
  _req: NextRequest,
  { params }: { params: { id: string } }
) {
  if (!isCosmosConfigured()) {
    return Response.json({ error: 'Cosmos DB not configured' }, { status: 501 });
  }

  const session = await getServerSession(authOptions);
  if (!session?.user?.email) {
    return Response.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const doc = await getSession(session.user.email, params.id);
    if (!doc) return Response.json({ error: 'Not found' }, { status: 404 });
    return Response.json(doc);
  } catch (err) {
    console.error('[sessions/:id GET]', err);
    return Response.json({ error: 'Database error' }, { status: 500 });
  }
}

export async function DELETE(
  _req: NextRequest,
  { params }: { params: { id: string } }
) {
  if (!isCosmosConfigured()) {
    return Response.json({ error: 'Cosmos DB not configured' }, { status: 501 });
  }

  const session = await getServerSession(authOptions);
  if (!session?.user?.email) {
    return Response.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    await deleteSession(session.user.email, params.id);
    return Response.json({ ok: true });
  } catch (err) {
    console.error('[sessions/:id DELETE]', err);
    return Response.json({ error: 'Database error' }, { status: 500 });
  }
}
