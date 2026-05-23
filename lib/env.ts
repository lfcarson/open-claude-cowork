// Validated at import time (server-side only).
// Call validateEnv() in critical paths to get a typed error list.

const REQUIRED = [
  'NEXTAUTH_SECRET',
  'NEXTAUTH_URL',
  'AZURE_AD_CLIENT_ID',
  'AZURE_AD_CLIENT_SECRET',
  'AZURE_AD_TENANT_ID',
  'OPENROUTER_API_KEY',
] as const;

export type RequiredEnvKey = (typeof REQUIRED)[number];

export function validateEnv(): { key: RequiredEnvKey; message: string }[] {
  return REQUIRED
    .filter((key) => !process.env[key])
    .map((key) => ({ key, message: `Missing required environment variable: ${key}` }));
}

export function assertEnv(): void {
  const missing = validateEnv();
  if (missing.length > 0) {
    throw new Error(
      `Server misconfiguration — missing env vars:\n${missing.map((e) => `  • ${e.key}`).join('\n')}`
    );
  }
}
