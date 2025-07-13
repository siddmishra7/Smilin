import type { NextConfig } from 'next';

const nextConfig: NextConfig = {
  reactStrictMode: true,
  experimental: {
    serverActions: {}, 
    urlImports: {
      allowedUris: ['https://esm.sh/', 'https://cdn.skypack.dev/'], // ✅ required
    },
  },
};

export default nextConfig;