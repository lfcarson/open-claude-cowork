/** @type {import('next').NextConfig} */
const isDev = process.env.NODE_ENV === 'development';

const nextConfig = {
  async headers() {
    return [
      {
        source: '/(.*)',
        headers: [
          { key: 'X-Content-Type-Options', value: 'nosniff' },
          { key: 'X-Frame-Options', value: 'DENY' },
          { key: 'X-XSS-Protection', value: '1; mode=block' },
          { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
          { key: 'Permissions-Policy', value: 'camera=(), microphone=(), geolocation=()' },
          {
            key: 'Strict-Transport-Security',
            value: 'max-age=63072000; includeSubDomains; preload',
          },
          {
            key: 'Content-Security-Policy',
            value: [
              "default-src 'self'",
              // Azure AD login redirect + Graph + OpenRouter + Cosmos
              "connect-src 'self' https://login.microsoftonline.com https://graph.microsoft.com https://openrouter.ai https://*.documents.azure.com",
              // unsafe-eval / unsafe-inline are only needed for Next.js HMR in dev;
              // production builds use compiled output and need neither.
              isDev
                ? "script-src 'self' 'unsafe-eval' 'unsafe-inline'"
                : "script-src 'self'",
              "style-src 'self' 'unsafe-inline'",
              "img-src 'self' data: https://graph.microsoft.com",
              "frame-ancestors 'none'",
            ].join('; '),
          },
        ],
      },
    ];
  },
};

export default nextConfig;
