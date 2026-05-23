const GRAPH_BASE = 'https://graph.microsoft.com/v1.0';

export async function graphGet(
  path: string,
  accessToken: string,
  params?: Record<string, string | number>
): Promise<unknown> {
  const url = new URL(`${GRAPH_BASE}/${path}`);
  if (params) {
    for (const [k, v] of Object.entries(params)) {
      url.searchParams.set(k, String(v));
    }
  }
  const res = await fetch(url.toString(), {
    headers: { Authorization: `Bearer ${accessToken}` },
  });
  if (!res.ok) {
    const err = await res.text();
    throw new Error(`Graph GET /${path} ${res.status}: ${err.slice(0, 200)}`);
  }
  return res.json();
}

export async function graphPost(
  path: string,
  accessToken: string,
  body: unknown
): Promise<unknown> {
  const res = await fetch(`${GRAPH_BASE}/${path}`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${accessToken}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(body),
  });
  if (!res.ok) {
    const err = await res.text();
    throw new Error(`Graph POST /${path} ${res.status}: ${err.slice(0, 200)}`);
  }
  const text = await res.text();
  return text ? JSON.parse(text) : {};
}

export async function graphPatch(
  path: string,
  accessToken: string,
  body: unknown
): Promise<unknown> {
  const res = await fetch(`${GRAPH_BASE}/${path}`, {
    method: 'PATCH',
    headers: {
      Authorization: `Bearer ${accessToken}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(body),
  });
  if (!res.ok) {
    const err = await res.text();
    throw new Error(`Graph PATCH /${path} ${res.status}: ${err.slice(0, 200)}`);
  }
  const text = await res.text();
  return text ? JSON.parse(text) : {};
}
