/**
 * 🔐 ENVIRONMENT VALIDATION
 * 
 * This file validates that all required environment variables are set
 * at application startup. This ensures the app fails fast with clear
 * error messages rather than failing mysteriously at runtime.
 * 
 * This module is SERVER-ONLY and should never be imported into client code.
 * 
 * Required environment variables:
 * - JWT_SECRET: Secret key for JWT token signing
 * - DATABASE_URL: PostgreSQL connection string
 * - YC_IAM_KEY_PATH: Path to Yandex Cloud IAM service account key JSON
 * 
 * Optional environment variables:
 * - MAX_FILE_SIZE: Maximum file upload size in bytes (default: 104857600 = 100MB)
 * 
 * Usage in next.config.ts:
 *   export const config = {
 *     runtime: 'nodejs',
 *     // ... validateEnv() runs automatically on import
 *   };
 */

interface EnvConfig {
  JWT_SECRET: string;
  DATABASE_URL: string;
  YC_IAM_KEY_PATH: string;
  NODE_ENV: 'development' | 'production' | 'test';
  MAX_FILE_SIZE?: number;
}

/**
 * Validate that all required environment variables are set
 * Called automatically on module import
 * 
 * @throws Error if any required env var is missing or invalid
 */
export function validateEnv(): EnvConfig {
  const errors: string[] = [];

  // JWT_SECRET validation
  const jwtSecret = process.env.JWT_SECRET?.trim();
  if (!jwtSecret) {
    errors.push('❌ JWT_SECRET is not set. Set it in .env.local');
  } else if (jwtSecret === 'your-secret-key-change-in-production') {
    errors.push('❌ JWT_SECRET contains default value. Must set a strong random string in .env.local');
  } else if (jwtSecret.length < 32) {
    errors.push('⚠️  JWT_SECRET should be at least 32 characters long for production use');
  }

  // DATABASE_URL validation
  const dbUrl = process.env.DATABASE_URL?.trim();
  if (!dbUrl) {
    errors.push('❌ DATABASE_URL is not set. Set it in .env.local');
  } else if (!dbUrl.includes('postgresql://') && !dbUrl.includes('postgres://')) {
    errors.push('❌ DATABASE_URL must be a valid PostgreSQL connection string');
  }

  // YC_IAM_KEY_PATH validation
  const iamKeyPath = process.env.YC_IAM_KEY_PATH?.trim();
  if (!iamKeyPath) {
    errors.push('❌ YC_IAM_KEY_PATH is not set. Set it in .env.local');
  }

  // NODE_ENV validation
  const nodeEnv = process.env.NODE_ENV as string;
  if (!['development', 'production', 'test'].includes(nodeEnv)) {
    errors.push(`❌ NODE_ENV must be 'development', 'production', or 'test', got '${nodeEnv}'`);
  }

  // MAX_FILE_SIZE validation (optional, with default)
  let maxFileSize: number | undefined;
  if (process.env.MAX_FILE_SIZE) {
    const parsed = parseInt(process.env.MAX_FILE_SIZE, 10);
    if (isNaN(parsed) || parsed <= 0) {
      errors.push('❌ MAX_FILE_SIZE must be a positive number (in bytes)');
    } else if (parsed < 1024 * 1024) {
      errors.push('⚠️  MAX_FILE_SIZE is less than 1MB, file uploads may not work as expected');
    } else {
      maxFileSize = parsed;
    }
  }

  // Log all errors and fail if any exist
  if (errors.length > 0) {
    // Only log to stderr in Node.js (not in browser)
    if (typeof window === 'undefined' && typeof process !== 'undefined') {
      process.stderr.write('\n═══════════════════════════════════════════════════════════════════════════\n');
      process.stderr.write('🚨 ENVIRONMENT VALIDATION FAILED\n');
      process.stderr.write('═══════════════════════════════════════════════════════════════════════════\n\n');
      
      errors.forEach(error => {
        process.stderr.write(error + '\n');
      });
      
      process.stderr.write('\n═══════════════════════════════════════════════════════════════════════════\n');
      process.stderr.write('📝 Create .env.local with required variables:\n');
      process.stderr.write('═══════════════════════════════════════════════════════════════════════════\n');
      process.stderr.write('\nJWT_SECRET=<generate with: openssl rand -base64 32>\n');
      process.stderr.write('DATABASE_URL=postgresql://user:password@host:5432/dbname\n');
      process.stderr.write('YC_IAM_KEY_PATH=./ya_cloud-iam_key.json\n');
      process.stderr.write('NODE_ENV=production\n');
      process.stderr.write('\n═══════════════════════════════════════════════════════════════════════════\n\n');
      
      // Throw error only on server-side to fail at startup
      throw new Error(
        `ENVIRONMENT_VALIDATION_FAILED: ${errors.join(' | ')}`
      );
    } else {
      // Browser or other non-server environment
      console.error('WARN: Environment validation should only run on server. Errors:', errors);
    }
  }

  const config: EnvConfig = {
    JWT_SECRET: jwtSecret!,
    DATABASE_URL: dbUrl!,
    YC_IAM_KEY_PATH: iamKeyPath!,
    NODE_ENV: nodeEnv as any,
    MAX_FILE_SIZE: maxFileSize,
  };

  // Log success on first run (only in development, server-side)
  if (nodeEnv === 'development' && typeof window === 'undefined') {
    process.stdout.write('✅ Environment validation passed\n');
  }

  return config;
}

export const ENV = {
  JWT_SECRET: process.env.JWT_SECRET!,
  DATABASE_URL: process.env.DATABASE_URL!,
  YC_IAM_KEY_PATH: process.env.YC_IAM_KEY_PATH!,
  NODE_ENV: process.env.NODE_ENV as 'development' | 'production' | 'test',
  MAX_FILE_SIZE: process.env.MAX_FILE_SIZE ? parseInt(process.env.MAX_FILE_SIZE, 10) : 104857600, // 100MB default
};
