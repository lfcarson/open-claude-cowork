import { NextRequest } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { streamAgentResponse } from '@/lib/claude-agent';
import { rateLimit } from '@/lib/rate-limit';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

// 30 requests per user per minute
const RATE_LIMIT_MAX = 30;
const RATE_LIMIT_WINDOW = 60_000;

// Maximum number of history messages forwarded to the LLM (prevents DoS via huge arrays)
const MAX_HISTORY = 50;

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session) {
    return new Response(JSON.stringify({ error: 'Unauthorized' }), {
      status: 401,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  // Rate-limit per authenticated user
  const userId = session.user?.email ?? 'anonymous';
  const { ok, remaining, resetAt } = rateLimit(userId, RATE_LIMIT_MAX, RATE_LIMIT_WINDOW);
  if (!ok) {
    return new Response(JSON.stringify({ error: 'Too many requests' }), {
      status: 429,
      headers: {
        'Content-Type': 'application/json',
        'X-RateLimit-Remaining': '0',
        'X-RateLimit-Reset': String(Math.ceil(resetAt / 1000)),
        'Retry-After': String(Math.ceil((resetAt - Date.now()) / 1000)),
      },
    });
  }

  const body = await req.json();
  const { message, messages: rawMessages = [] } = body;
  // Trim history to the most recent MAX_HISTORY turns to bound memory + token usage
  const messages = Array.isArray(rawMessages) ? rawMessages.slice(-MAX_HISTORY) : [];

  if (!message || typeof message !== 'string' || message.length > 32_000) {
    return new Response(JSON.stringify({ error: 'Invalid message' }), {
      status: 400,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  const encoder = new TextEncoder();

  const stream = new ReadableStream({
    async start(controller) {
      const send = (data: object) => {
        controller.enqueue(encoder.encode(`data: ${JSON.stringify(data)}\n\n`));
      };

      try {
        for await (const chunk of streamAgentResponse({
          message,
          history: messages,
          userName: session.user?.name ?? 'User',
          userEmail: session.user?.email ?? '',
          accessToken: session.accessToken,
        })) {
          send(chunk);
        }
      } catch (err: unknown) {
        const msg = err instanceof Error ? err.message : 'Unknown error';
        send({ type: 'error', message: msg });
      } finally {
        controller.close();
      }
    },
  });

  return new Response(stream, {
    headers: {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache, no-transform',
      Connection: 'keep-alive',
      'X-Accel-Buffering': 'no',
      'X-RateLimit-Remaining': String(remaining),
    },
  });
}
