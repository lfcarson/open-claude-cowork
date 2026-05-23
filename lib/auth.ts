import { NextAuthOptions } from 'next-auth';
import AzureADProvider from 'next-auth/providers/azure-ad';

const SCOPES = [
  'openid', 'profile', 'email', 'offline_access',
  'User.Read',
  'Mail.Read', 'Mail.Send', 'Mail.ReadWrite',
  'Calendars.ReadWrite',
  'Files.ReadWrite.All', 'Sites.ReadWrite.All',
  'Tasks.ReadWrite',
  'People.Read',
].join(' ');

async function refreshAccessToken(refreshToken: string) {
  const url = `https://login.microsoftonline.com/${process.env.AZURE_AD_TENANT_ID}/oauth2/v2.0/token`;

  const res = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      grant_type: 'refresh_token',
      client_id: process.env.AZURE_AD_CLIENT_ID!,
      client_secret: process.env.AZURE_AD_CLIENT_SECRET!,
      refresh_token: refreshToken,
      scope: SCOPES,
    }),
  });

  const data = await res.json();
  if (!res.ok) throw new Error(data.error_description ?? 'Token refresh failed');

  return {
    accessToken: data.access_token as string,
    refreshToken: (data.refresh_token as string) ?? refreshToken,
    expiresAt: Math.floor(Date.now() / 1000) + (data.expires_in as number),
  };
}

export const authOptions: NextAuthOptions = {
  providers: [
    AzureADProvider({
      clientId: process.env.AZURE_AD_CLIENT_ID!,
      clientSecret: process.env.AZURE_AD_CLIENT_SECRET!,
      tenantId: process.env.AZURE_AD_TENANT_ID!,
      authorization: { params: { scope: SCOPES } },
    }),
  ],
  callbacks: {
    async jwt({ token, account }) {
      // Initial sign-in
      if (account) {
        return {
          ...token,
          accessToken: account.access_token,
          refreshToken: account.refresh_token,
          expiresAt: account.expires_at,
          error: undefined,
        };
      }

      // Token still valid (5-minute buffer)
      if (Date.now() / 1000 < (token.expiresAt as number) - 300) {
        return token;
      }

      // Token expired — try to refresh
      try {
        const refreshed = await refreshAccessToken(token.refreshToken as string);
        return { ...token, ...refreshed, error: undefined };
      } catch (err) {
        console.error('[auth] Token refresh failed:', err);
        // Set expiresAt far in the future so the expiry check is skipped on
        // subsequent requests — prevents hammering the Microsoft token endpoint
        // on every page load when the refresh token is permanently revoked.
        return { ...token, error: 'RefreshAccessTokenError', expiresAt: Number.MAX_SAFE_INTEGER };
      }
    },
    async session({ session, token }) {
      session.accessToken = token.accessToken as string;
      session.error = token.error as string | undefined;
      return session;
    },
  },
  pages: {
    signIn: '/login',
    error: '/login',
  },
  secret: process.env.NEXTAUTH_SECRET,
};
