import type { NextConfig } from 'next';

// Validate environment variables at startup
import './src/lib/config/env';

const nextConfig: NextConfig = {
  output: 'standalone'
};

export default nextConfig;