import type { NextConfig } from 'next'
import { isHeroUIProArtifactsInstalled } from './lib/heroui-pro/is-artifacts-installed'

const proArtifactsReady = isHeroUIProArtifactsInstalled()
const proReactAlias = proArtifactsReady
  ? '@heroui-pro/react'
  : './lib/heroui-pro/fallback.tsx'

const nextConfig: NextConfig = {
  transpilePackages: [
    '@heroui/react',
    '@heroui/theme',
    ...(proArtifactsReady ? ['@heroui-pro/react'] : []),
  ],
  turbopack: {
    resolveAlias: {
      '@heroui-pro/react': proReactAlias,
    },
  },
  webpack: (config) => {
    config.resolve.alias = {
      ...config.resolve.alias,
      '@heroui-pro/react': proReactAlias,
    }
    return config
  },
  async headers() {
    return [
      {
        source: '/(.*)',
        headers: [
          {
            key: 'Content-Security-Policy',
            value:
              "frame-src 'self' https://agent.heroui.pro https://staging-agent.heroui.pro",
          },
        ],
      },
    ]
  },
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: '*.supabase.co',
        pathname: '/storage/v1/object/public/**',
      },
    ],
  },
}

export default nextConfig
