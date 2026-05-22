/** @type {import('next').NextConfig} */
const nextConfig = {
  experimental: {
    serverComponentsExternalPackages: ['@anthropic-ai/claude-agent-sdk'],
  },
};

export default nextConfig;
