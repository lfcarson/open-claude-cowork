import { getServerSession } from 'next-auth';
import { redirect } from 'next/navigation';
import { authOptions } from '@/lib/auth';
import { TopBar } from '@/components/layout/TopBar';

export default async function SettingsPage() {
  const session = await getServerSession(authOptions);
  if (!session) redirect('/login');

  return (
    <div className="flex flex-col h-screen">
      <TopBar />
      <main className="flex-1 overflow-y-auto p-8 max-w-2xl mx-auto w-full">
        <h1 className="text-2xl font-bold mb-6">Settings</h1>

        {/* Account info */}
        <section className="mb-8">
          <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider mb-3">
            Account
          </h2>
          <div className="bg-card border border-border rounded-lg p-4 space-y-2">
            <div className="flex justify-between">
              <span className="text-sm text-muted-foreground">Name</span>
              <span className="text-sm font-medium">{session.user?.name}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-sm text-muted-foreground">Email</span>
              <span className="text-sm font-medium">{session.user?.email}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-sm text-muted-foreground">Auth provider</span>
              <span className="text-sm font-medium">Microsoft Azure AD</span>
            </div>
          </div>
        </section>

        {/* MCP status */}
        <section className="mb-8">
          <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider mb-3">
            Microsoft 365 Integration
          </h2>
          <MCPStatusPanel />
        </section>

        {/* Permissions */}
        <section>
          <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider mb-3">
            Delegated Permissions
          </h2>
          <div className="bg-card border border-border rounded-lg p-4">
            <ul className="text-sm space-y-1.5 text-muted-foreground">
              {[
                'User.Read — read your profile',
                'Mail.Read / Mail.Send / Mail.ReadWrite — read and send email',
                'Calendars.ReadWrite — read and create calendar events',
                'Files.ReadWrite.All — access OneDrive files',
                'Sites.ReadWrite.All — access SharePoint sites',
                'Team.ReadBasic.All / ChannelMessage.Read.All — read Teams',
                'Chat.ReadWrite — read and send Teams chats',
                'Tasks.ReadWrite — manage Microsoft To Do / Planner',
                'Presence.Read — view presence status',
              ].map((p) => (
                <li key={p} className="flex items-start gap-2">
                  <span className="text-green-500 mt-0.5">✓</span>
                  <span>{p}</span>
                </li>
              ))}
            </ul>
          </div>
        </section>
      </main>
    </div>
  );
}

async function MCPStatusPanel() {
  let data: { status: string; servers: { name: string; status: string; capabilities: string[] }[] } | null = null;
  try {
    const res = await fetch(
      `${process.env.NEXTAUTH_URL ?? 'http://localhost:3000'}/api/mcp/status`,
      { cache: 'no-store' }
    );
    data = await res.json();
  } catch {
    // ignore
  }

  const server = data?.servers?.[0];

  return (
    <div className="bg-card border border-border rounded-lg p-4 space-y-3">
      <div className="flex items-center justify-between">
        <span className="text-sm font-medium">ms-365-mcp-server</span>
        <span
          className={`text-xs px-2 py-0.5 rounded-full font-medium ${
            server?.status === 'ready'
              ? 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400'
              : 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400'
          }`}
        >
          {server?.status ?? 'unknown'}
        </span>
      </div>
      {server && (
        <div>
          <p className="text-xs text-muted-foreground mb-1">Available tools ({server.capabilities.length})</p>
          <div className="flex flex-wrap gap-1">
            {server.capabilities.map((c) => (
              <span key={c} className="text-xs bg-muted rounded px-1.5 py-0.5 font-mono">
                {c}
              </span>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
