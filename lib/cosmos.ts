import { CosmosClient, type Database, type Container } from '@azure/cosmos';
import type { Message } from '@/components/chat/ChatPanel';

const DATABASE_ID = 'lf-cowork';
const CONTAINER_ID = 'sessions';

export function isCosmosConfigured(): boolean {
  return Boolean(process.env.COSMOS_DB_ENDPOINT && process.env.COSMOS_DB_KEY);
}

let _client: CosmosClient | null = null;
let _db: Database | null = null;
let _container: Container | null = null;

async function getContainer(): Promise<Container> {
  if (_container) return _container;

  if (!_client) {
    _client = new CosmosClient({
      endpoint: process.env.COSMOS_DB_ENDPOINT!,
      key: process.env.COSMOS_DB_KEY!,
    });
  }

  // Create database and container if they don't exist
  const { database } = await _client.databases.createIfNotExists({ id: DATABASE_ID });
  _db = database;

  const { container } = await _db.containers.createIfNotExists({
    id: CONTAINER_ID,
    partitionKey: { paths: ['/userId'] },
    defaultTtl: -1,
  });
  _container = container;

  return _container;
}

export interface SessionDoc {
  id: string;
  userId: string;
  title: string;
  messages: Message[];
  createdAt: string;
  updatedAt: string;
}

export async function listSessions(userId: string): Promise<SessionDoc[]> {
  const container = await getContainer();
  const { resources } = await container.items
    .query<SessionDoc>({
      query: 'SELECT c.id, c.userId, c.title, c.createdAt, c.updatedAt FROM c WHERE c.userId = @userId ORDER BY c.updatedAt DESC',
      parameters: [{ name: '@userId', value: userId }],
    })
    .fetchAll();
  return resources;
}

export async function getSession(
  userId: string,
  sessionId: string
): Promise<SessionDoc | null> {
  const container = await getContainer();
  try {
    const { resource } = await container.item(sessionId, userId).read<SessionDoc>();
    return resource ?? null;
  } catch {
    return null;
  }
}

export async function upsertSession(doc: SessionDoc): Promise<void> {
  const container = await getContainer();
  await container.items.upsert(doc);
}

export async function deleteSession(userId: string, sessionId: string): Promise<void> {
  const container = await getContainer();
  try {
    await container.item(sessionId, userId).delete();
  } catch {
    // already deleted — ignore
  }
}
