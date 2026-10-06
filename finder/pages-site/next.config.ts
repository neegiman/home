import path from 'node:path'
import type { NextConfig } from 'next'

const nextConfig: NextConfig = {
  output: 'export',
  basePath: '/finder',
  trailingSlash: true,
  turbopack: {
    root: path.resolve(__dirname, '..'),
  },
}

export default nextConfig
