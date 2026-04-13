// import type { NextConfig } from 'next';
// import { execSync } from 'node:child_process';
// import { readFileSync } from 'node:fs';
// import { join } from 'node:path';

// // Validate environment variables at startup
// import './src/lib/config/env';

// function getPackageVersion(): string {
//   try {
//     const packagePath = join(process.cwd(), 'package.json');
//     const packageJson = JSON.parse(readFileSync(packagePath, 'utf-8'));
//     return packageJson.version ?? '0.0.0';
//   } catch {
//     return '0.0.0';
//   }
// }

// function getGitProjectVersion(): string {
//   const baseVersion = getPackageVersion();

//   try {
//     const commitCount = execSync('git rev-list --count HEAD', { encoding: 'utf-8' }).trim();
//     const shortSha = execSync('git rev-parse --short HEAD', { encoding: 'utf-8' }).trim();
//     return `ver. ${baseVersion}.${commitCount}+${shortSha}`;
//   } catch {
//     return `ver. ${baseVersion}`;
//   }
// }

// const appVersion = process.env.NEXT_PUBLIC_APP_VERSION || getGitProjectVersion();

// const nextConfig: NextConfig = {
//   output: 'standalone',
//   env: {
//     NEXT_PUBLIC_APP_VERSION: appVersion,
//   },
// };

// export default nextConfig;

// улучшенный конфиг
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
};

export default nextConfig;