/** @type {import('next').NextConfig} */
function resolveHost(value) {
  if (!value) return undefined;
  try {
    const url = new URL(value.replace(/\/$/, ''));
    return url.hostname;
  } catch {
    return undefined;
  }
}

const SUPABASE_HOST = resolveHost(process.env.NEXT_PUBLIC_SUPABASE_URL);
const SUPABASE_ASSETS_HOST = resolveHost(process.env.NEXT_PUBLIC_SUPABASE_ASSETS_URL);

const nextConfig = {
  reactStrictMode: true,
  compress: true,
  poweredByHeader: false,
  experimental: {
    optimizePackageImports: [],
  },
  images: {
    remotePatterns: [
      ...(SUPABASE_HOST
        ? [
            {
              protocol: 'https',
              hostname: SUPABASE_HOST,
              pathname: '/storage/v1/object/public/thumbnails/**',
            },
            {
              protocol: 'https',
              hostname: SUPABASE_HOST,
              pathname: '/storage/v1/object/public/lesson-assets/**',
            },
          ].filter(Boolean)
        : []),
      ...(SUPABASE_ASSETS_HOST && SUPABASE_ASSETS_HOST !== SUPABASE_HOST
        ? [
            {
              protocol: 'https',
              hostname: SUPABASE_ASSETS_HOST,
              pathname: '/storage/v1/object/public/thumbnails/**',
            },
            {
              protocol: 'https',
              hostname: SUPABASE_ASSETS_HOST,
              pathname: '/storage/v1/object/public/lesson-assets/**',
            },
          ]
        : []),
    ],
  },
};

module.exports = nextConfig;
