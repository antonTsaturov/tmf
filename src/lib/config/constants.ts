export enum Colors {
  GRAY = '#9E9E9E',
  BLUE = '#3d92d7',
  GREEN = '#38ba43',
  YELLOW = '#e18900',
  RED = '#c0392b'
}

export const COUNTRIES = [
  'Russia', 'Australia', 'China', 'India', 'Brazil', 'Mexico', 'South Korea', 'USA'
];

export type RadixColors =
  | 'green'
  | 'red'
  | 'gray'
  | 'blue'
  | 'orange'
  | 'purple'
  | 'ruby'
  | 'brown'
  | 'crimson'
  | 'cyan'
  | 'gold'
  | 'indigo'
  | 'lime'
  | 'pink'
  | 'plum'
  | 'teal'
  | 'tomato'
  | 'violet'
  | 'yellow'
  | 'bronze'
  | 'amber'
  | 'iris'
  | 'jade'
  | 'grass'
  | 'mint'
  | 'sky'
  | undefined;

// lib/constants/public-paths.ts
// Этот файл безопасен для импорта на клиенте

export const PUBLIC_PATHS = [
  '/api/ping',
  '/api/auth/login',
  '/api/auth/logout',
  '/api/auth/refresh',
  '/api/auth/forgot-password',
  '/api/auth/reset-password',
  '/reset-password',
  '/api/csrf',
  '/_next/static',
  '/favicon.ico',
  '/api/auth/check',
];

// Функция для проверки публичного пути
export function isPublicPath(pathname: string): boolean {
  return PUBLIC_PATHS.some(path => {
    if (pathname === path) return true;
    if (pathname.startsWith(path + '/')) return true;
    return false;
  });
}