import { getServerSession } from 'next-auth';
import { redirect } from 'next/navigation';
import { authOptions } from '@/lib/auth';
import { TopBar } from '@/components/layout/TopBar';
import { isCosmosConfigured } from '@/lib/cosmos';
import { validateEnv } from '@/lib/env';

export default async function SettingsPage() {
  const session = await getServerSession(authOptions);
  if (!session) redirect('/login');

  const envErrors = validateEnv();
  const cosmosConfigured = isCosmosConfigured();
  const tokenError = session.error === 'RefreshAccessTokenError';

  return (
    <div className="flex flex-col h-screen">
      <TopBar />
      <main className="flex-1 overflow-y-auto p-8 max-w-2xl mx-auto w-full space-y-8">
        <h1 className="text-2xl font-bold">Settings</h1>

        {/* Health banner */}
        {(envErrors.length > 0 || tokenError) && (
          <div className="rounded-lg border border-destructive/40 bg-destructive/10 p-4 text-sm text-destructive space-y-1">
            <p className="font-semibold">⚠ Configuration issues</p>
            {envErrors.map((e) => <p key={e.key}>• {e.message}</p>)}
            {tokenError && <p>• M365 access token could not be refreshed — please sign out and sign in again.</p>}
          </div>
        )}

        {/* Account */}
        <Section title="Account">
          <Row label="Name" value={session.user?.name ?? '—'} />
          <Row label="Email" value={session.user?.email ?? '—'} />
          <Row label="Auth provider" value="Microsoft Azure AD" />
          <Row
            label="Token status"
            value={tokenError ? '⚠ Expired — sign in again' : '✓ Valid'}
            valueClass={tokenError ? 'text-destructive' : 'text-green-600 dark:text-green-400'}
          />
        </Section>

        {/* M365 integration */}
        <Section title="Microsoft 365 Integration">
          <StatusRow
            label="Graph API"
            ok={!tokenError && Boolean(session.accessToken)}
            okText="Connected"
            failText="Not connected"
          />
          <StatusRow
            label="Session storage"
            ok={cosmosConfigured}
            okText="Cosmos DB"
            failText="localStorage (no Cosmos DB configured)"
          />
          <StatusRow
            label="LLM provider"
            ok={Boolean(process.env.OPENROUTER_API_KEY)}
            okText={`OpenRouter · ${process.env.OPENROUTER_MODEL ?? 'anthropic/claude-sonnet-4-5'}`}
            failText="OPENROUTER_API_KEY not set"
          />
        </Section>

        {/* Available tools */}
        <Section title="M365 Tools">
          <div className="flex flex-wrap gap-1.5">
            {[
              'mail_list', 'mail_get', 'mail_search', 'mail_send', 'mail_reply',
              'calendar_list_events', 'calendar_create_event',
              'files_list', 'files_search',
              'todo_list_tasks', 'todo_create_task',
              'people_search',
            ].map((t) => (
              <span key={t} className="text-xs bg-muted rounded px-1.5 py-0.5 font-mono">
                {t}
              </span>
            ))}
          </div>
        </Section>

        {/* Delegated permissions */}
        <Section title="Delegated Permissions">
          <ul className="text-sm space-y-1.5 text-muted-foreground">
            {[
              'User.Read — read your profile',
              'Mail.Read / Mail.Send / Mail.ReadWrite — read and send email',
              'Calendars.ReadWrite — read and create calendar events',
              'Files.ReadWrite.All — access OneDrive files',
              'Sites.ReadWrite.All — access SharePoint sites',
              'Tasks.ReadWrite — manage Microsoft To Do',
              'People.Read — search organisational directory',
            ].map((p) => (
              <li key={p} className="flex items-start gap-2">
                <span className="text-green-500 mt-0.5 shrink-0">✓</span>
                <span>{p}</span>
              </li>
            ))}
          </ul>
        </Section>
      </main>
    </div>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section>
      <h2 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-3">
        {title}
      </h2>
      <div className="bg-card border border-border rounded-lg p-4 space-y-2.5">
        {children}
      </div>
    </section>
  );
}

function Row({
  label,
  value,
  valueClass,
}: {
  label: string;
  value: string;
  valueClass?: string;
}) {
  return (
    <div className="flex justify-between items-center">
      <span className="text-sm text-muted-foreground">{label}</span>
      <span className={`text-sm font-medium ${valueClass ?? ''}`}>{value}</span>
    </div>
  );
}

function StatusRow({
  label,
  ok,
  okText,
  failText,
}: {
  label: string;
  ok: boolean;
  okText: string;
  failText: string;
}) {
  return (
    <div className="flex justify-between items-center gap-4">
      <span className="text-sm text-muted-foreground">{label}</span>
      <span
        className={`text-xs px-2 py-0.5 rounded-full font-medium ${
          ok
            ? 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400'
            : 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400'
        }`}
      >
        {ok ? okText : failText}
      </span>
    </div>
  );
}
