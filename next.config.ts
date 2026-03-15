import type { NextConfig } from 'next'

const nextConfig: NextConfig = {
  // Required for Capacitor static export builds
  // Comment this out for standard Vercel / server deployments
  // output: 'export',

  turbopack: {
    // Silence workspace root detection warning
    root: __dirname,
  },

  images: {
    // Allow Supabase storage images
    remotePatterns: [
      {
        protocol: 'https',
        hostname: 'twoesyyxaypygyajhdtd.supabase.co',
        pathname: '/storage/v1/object/public/**',
      },
    ],
  },
}

export default nextConfig


