// next.config.ts

import type { NextConfig } from 'next';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { execSync } from 'node:child_process';

// Валидация переменных (убедитесь, что этот файл не делает лишних FS-запросов)
import './src/lib/config/env';

function getVersion() {
  // 1. Если версия передана через Docker ARG -> ENV, используем её (самый приоритетный путь)
  if (process.env.NEXT_PUBLIC_APP_VERSION) {
    return process.env.NEXT_PUBLIC_APP_VERSION;
  }

  // 2. Локальная разработка: пытаемся достать из git
  try {
    const pkgPath = join(process.cwd(), 'package.json');
    const pkg = JSON.parse(readFileSync(pkgPath, 'utf-8'));
    const commitCount = execSync('git rev-list --count HEAD', { encoding: 'utf-8' }).trim();
    return `ver. ${pkg.version}.${commitCount}`;
  } catch {
    return '0.0.0-dev';
  }
}

const nextConfig: NextConfig = {
  output: 'standalone',
  env: {
    // Фиксируем версию на этапе сборки
    NEXT_PUBLIC_APP_VERSION: getVersion(),
  },
  turbopack: {
    resolveAlias: {
      canvas: './empty-module.js', // Можно ссылаться на пустой файл в корне
    },
  },
};

export default nextConfig;