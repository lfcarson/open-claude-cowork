import { getServerSession } from 'next-auth';
import { redirect } from 'next/navigation';
import { authOptions } from '@/lib/auth';
import { LoginButton } from './LoginButton';

export default async function LoginPage() {
  const session = await getServerSession(authOptions);

  if (session) {
    redirect('/');
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-background to-muted">
      <div className="w-full max-w-md p-8 space-y-8">
        {/* Logo + branding */}
        <div className="text-center space-y-4">
          <div className="flex items-center justify-center">
            <div className="w-16 h-16 rounded-2xl bg-primary flex items-center justify-center shadow-lg">
              <span className="text-primary-foreground text-2xl font-bold">LF</span>
            </div>
          </div>
          <div>
            <h1 className="text-2xl font-bold tracking-tight">LF Cowork</h1>
            <p className="text-muted-foreground text-sm mt-1">
              Your AI-powered workspace for Li &amp; Fung
            </p>
          </div>
        </div>

        {/* Login card */}
        <div className="bg-card border border-border rounded-xl p-6 shadow-sm space-y-6">
          <div className="space-y-1">
            <h2 className="text-lg font-semibold">Sign in to continue</h2>
            <p className="text-sm text-muted-foreground">
              Use your Li &amp; Fung Microsoft account to access LF Cowork.
            </p>
          </div>

          <LoginButton />

          <p className="text-xs text-muted-foreground text-center">
            By signing in you agree to Li &amp; Fung&apos;s acceptable use policy.
            Your M365 access is governed by delegated permissions only.
          </p>
        </div>

        {/* Footer */}
        <p className="text-center text-xs text-muted-foreground">
          Powered by Claude &amp; Microsoft 365
        </p>
      </div>
    </div>
  );
}
