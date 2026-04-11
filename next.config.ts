import type { NextConfig } from 'next';
import { execSync } from 'node:child_process';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';

// Validate environment variables at startup
import './src/lib/config/env';

function getPackageVersion(): string {
  try {
    const packagePath = join(process.cwd(), 'package.json');
    const packageJson = JSON.parse(readFileSync(packagePath, 'utf-8'));
    return packageJson.version ?? '0.0.0';
  } catch {
    return '0.0.0';
  }
}

function getGitProjectVersion(): string {
  const baseVersion = getPackageVersion();

  try {
    const commitCount = execSync('git rev-list --count HEAD', { encoding: 'utf-8' }).trim();
    const shortSha = execSync('git rev-parse --short HEAD', { encoding: 'utf-8' }).trim();
    return `ver. ${baseVersion}.${commitCount}+${shortSha}`;
  } catch {
    return `ver. ${baseVersion}`;
  }
}

const appVersion = process.env.NEXT_PUBLIC_APP_VERSION || getGitProjectVersion();

const nextConfig: NextConfig = {
  output: 'standalone',
  env: {
    NEXT_PUBLIC_APP_VERSION: appVersion,
  },
};

export default nextConfig;