// next.config.js
/** @type {import('next').NextConfig} */
const nextConfig = {
  typescript: {
    ignoreBuildErrors: true,
  },
  eslint: {
    ignoreDuringBuilds: true,
  },
  images: {
    remotePatterns: [
      { protocol: 'https', hostname: '*.supabase.co' },
      { protocol: 'https', hostname: '*.supabase.in' },
      { protocol: 'https', hostname: 'images.unsplash.com' },
    ],
    formats: ['image/avif', 'image/webp'],
    deviceSizes: [375, 640, 750, 828, 1080, 1200, 1920],
    imageSizes: [16, 32, 64, 96, 128, 256],
    minimumCacheTTL: 86400,
  },
  compress: true,
  poweredByHeader: false,
  async headers() {
    return [
      { source: '/(.*)', headers: [
        { key: 'X-Frame-Options', value: 'DENY' },
        { key: 'X-Content-Type-Options', value: 'nosniff' },
      ]},
      { source: '/icons/(.*)', headers: [{ key: 'Cache-Control', value: 'public, max-age=31536000, immutable' }]},
      { source: '/sw.js', headers: [{ key: 'Cache-Control', value: 'no-cache' }]},
    ]
  },
  async redirects() {
    return [{ source: '/home', destination: '/', permanent: true }]
  },
}

module.exports = nextConfig