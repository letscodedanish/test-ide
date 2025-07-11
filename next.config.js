/** @type {import('next').NextConfig} */
const nextConfig = {
  eslint: {
    ignoreDuringBuilds: true,
  },
  images: { unoptimized: true },
  experimental: {
    serverComponentsExternalPackages: ['openai'],
  },
  // Enable standalone output for Docker
  output: 'standalone',
  // Skip build-time static generation for API routes
  trailingSlash: false,
  generateBuildId: () => 'build',
};

module.exports = nextConfig;
