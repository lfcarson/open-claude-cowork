import { NextRequest } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';

export const dynamic = 'force-dynamic';

const GRAPH_BASE = 'https://graph.microsoft.com/v1.0';

async function proxyGraph(req: NextRequest, params: { path: string[] }) {
  const session = await getServerSession(authOptions);
  if (!session?.accessToken) {
    return new Response(JSON.stringify({ error: 'Unauthorized' }), { status: 401 });
  }

  const path = params.path.join('/');
  const url = new URL(`${GRAPH_BASE}/${path}`);

  // Forward query params
  req.nextUrl.searchParams.forEach((value, key) => {
    url.searchParams.set(key, value);
  });

  const graphRes = await fetch(url.toString(), {
    method: req.method,
    headers: {
      Authorization: `Bearer ${session.accessToken}`,
      'Content-Type': 'application/json',
    },
    body: ['GET', 'HEAD'].includes(req.method) ? undefined : await req.text(),
  });

  const body = await graphRes.text();
  return new Response(body, {
    status: graphRes.status,
    headers: { 'Content-Type': 'application/json' },
  });
}

export async function GET(req: NextRequest, { params }: { params: { path: string[] } }) {
  return proxyGraph(req, params);
}

export async function POST(req: NextRequest, { params }: { params: { path: string[] } }) {
  return proxyGraph(req, params);
}

export async function PATCH(req: NextRequest, { params }: { params: { path: string[] } }) {
  return proxyGraph(req, params);
}

export async function DELETE(req: NextRequest, { params }: { params: { path: string[] } }) {
  return proxyGraph(req, params);
}
