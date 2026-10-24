import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const DEFAULT_API_URL =
  process.env.NODE_ENV === 'production'
    ? 'https://n1-api.onrender.com'
    : 'http://localhost:5000';

const resolvedApiUrl = process.env.NEXT_PUBLIC_API_URL || DEFAULT_API_URL;

/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  transpilePackages: ['@n1/shared', '@n1/config', '@n1/validation'],
  outputFileTracingRoot: path.join(__dirname, '../../'),
  env: {
    NEXT_PUBLIC_API_URL: resolvedApiUrl,
  },
  async rewrites() {
    return [
      {
        source: '/api/:path*',
        destination: `${resolvedApiUrl}/api/:path*`,
      },
    ];
  },
};

export default nextConfig;
