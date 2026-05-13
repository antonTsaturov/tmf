// lib/config/timeouts.ts
const getEnvNumber = (key: string, defaultValue: number): number => {
  if (typeof window !== 'undefined') return defaultValue; // На клиенте используем дефолт
  const value = process.env[key];
  if (!value) return defaultValue;
  const parsed = parseInt(value, 10);
  return isNaN(parsed) ? defaultValue : parsed;
};

export const TIMEOUTS = {
  SESSION: {
    IDLE_TIMEOUT_SECONDS: (() => {
      const minutes = getEnvNumber('NEXT_PUBLIC_IDLE_TIMEOUT_MINUTES', 30);
      return minutes * 60;
    })(),
    
    MAX_DURATION_SECONDS: (() => {
      const hours = getEnvNumber('NEXT_PUBLIC_MAX_DURATION_HOURS', 24);
      return hours * 60 * 60;
    })(),
    
    WARNING_BEFORE_SECONDS: getEnvNumber('NEXT_PUBLIC_WARNING_BEFORE_SECONDS', 60),
  },
  
  TOKENS: {
    ACCESS_TOKEN_SECONDS: getEnvNumber('NEXT_PUBLIC_ACCESS_TOKEN_MINUTES', 15) * 60,
    REFRESH_TOKEN_SECONDS: getEnvNumber('NEXT_PUBLIC_REFRESH_TOKEN_DAYS', 7) * 24 * 60 * 60,
  },
  
  CLIENT: {
    SESSION_CHECK_INTERVAL_SECONDS: getEnvNumber('NEXT_PUBLIC_SESSION_CHECK_INTERVAL_SECONDS', 30),
    REFRESH_INTERVAL_SECONDS: getEnvNumber('NEXT_PUBLIC_REFRESH_INTERVAL_MINUTES', 12) * 60,
    ACTIVITY_CHECK_INTERVAL_SECONDS: getEnvNumber('NEXT_PUBLIC_ACTIVITY_CHECK_INTERVAL_SECONDS', 2),
  },
} as const;

// Для удобного импорта в разных частях приложения
export const SESSION_TIMEOUT_MS = TIMEOUTS.SESSION.IDLE_TIMEOUT_SECONDS * 1000;
export const SESSION_MAX_DURATION_MS = TIMEOUTS.SESSION.MAX_DURATION_SECONDS * 1000;
export const ACCESS_TOKEN_EXPIRY_MS = TIMEOUTS.TOKENS.ACCESS_TOKEN_SECONDS * 1000;
export const REFRESH_TOKEN_EXPIRY_MS = TIMEOUTS.TOKENS.REFRESH_TOKEN_SECONDS * 1000;

// Человеко-читаемые строки для логов
export const getTimeoutsDescription = () => ({
  idleTimeout: `${TIMEOUTS.SESSION.IDLE_TIMEOUT_SECONDS / 60} minutes`,
  maxDuration: `${TIMEOUTS.SESSION.MAX_DURATION_SECONDS / 60 / 60} hours`,
  accessToken: `${TIMEOUTS.TOKENS.ACCESS_TOKEN_SECONDS / 60} minutes`,
  refreshToken: `${TIMEOUTS.TOKENS.REFRESH_TOKEN_SECONDS / 60 / 60 / 24} days`,
});