// lib/auth/auth.service.ts
import jwt from 'jsonwebtoken';
import bcrypt from 'bcryptjs';
import crypto from 'crypto';
import { ENV } from '@/lib/config/env';

const JWT_SECRET = ENV.JWT_SECRET;
const REFRESH_SECRET = ENV.JWT_SECRET + '_refresh'; // Use different salt for refresh tokens

// Token expiry times
const ACCESS_TOKEN_EXPIRY = '15m'; // Short-lived access token
const REFRESH_TOKEN_EXPIRY = '7d'; // Long-lived refresh token

export interface JwtPayload {
  id: number;
  email: string;
  role: string;
  study_id: number[];
  assigned_site_id: number[];
  sessionId?: string; // Added for session tracking
}

export interface RefreshTokenPayload {
  id: number;
  email: string;
  sessionId: string;
  tokenVersion: number; // Incremented on logout to invalidate old refresh tokens
}

export interface ResetTokenPayload {
  type: 'password_reset';
  email: string;
}

export class AuthService {
  /**
   * Generate short-lived access token
   * Used for API requests, expires in 15 minutes
   */
  static generateAccessToken(payload: JwtPayload): string {
    return jwt.sign(payload, JWT_SECRET, {
      expiresIn: ACCESS_TOKEN_EXPIRY,
      algorithm: 'HS256'
    });
  }

  /**
   * Generate long-lived refresh token
   * Used to get new access tokens, expires in 7 days
   * @returns Refresh token string
   */
  static generateRefreshToken(payload: RefreshTokenPayload): string {
    return jwt.sign(payload, REFRESH_SECRET, {
      expiresIn: REFRESH_TOKEN_EXPIRY,
      algorithm: 'HS256'
    });
  }

  /**
   * Verify access token
   */
  static verifyAccessToken(token: string): JwtPayload | null {
    try {
      return jwt.verify(token, JWT_SECRET, {
        algorithms: ['HS256']
      }) as JwtPayload;
    } catch (_error) {
      return null;
    }
  }

  /**
   * Verify refresh token
   */
  static verifyRefreshToken(token: string): RefreshTokenPayload | null {
    try {
      return jwt.verify(token, REFRESH_SECRET, {
        algorithms: ['HS256']
      }) as RefreshTokenPayload;
    } catch (_error) {
      return null;
    }
  }

  /**
   * Generate hash of refresh token for secure storage
   * Used to compare tokens without storing actual token value
   */
  static hashRefreshToken(refreshToken: string): string {
    return crypto
      .createHash('sha256')
      .update(refreshToken)
      .digest('hex');
  }

  /**
   * Verify refresh token hash (timing-safe)
   */
  static verifyRefreshTokenHash(token: string, hash: string): boolean {
    const tokenHash = this.hashRefreshToken(token);
    return crypto.timingSafeEqual(
      Buffer.from(tokenHash),
      Buffer.from(hash)
    );
  }

  /**
   * Legacy method: Generate token (maintains backward compatibility)
   * Note: Uses short-lived access token
   */
  static generateToken(payload: JwtPayload): string {
    return this.generateAccessToken(payload);
  }

  /**
   * Legacy method: Verify token
   */
  static verifyToken(token: string): JwtPayload | null {
    return this.verifyAccessToken(token);
  }

  // Хеширование пароля
  static async hashPassword(password: string): Promise<string> {
    const salt = await bcrypt.genSalt(10);
    return bcrypt.hash(password, salt);
  }

  // Проверка пароля
  static async comparePassword(password: string, hashedPassword: string): Promise<boolean> {
    return bcrypt.compare(password, hashedPassword);
  }

  // Извлечение токена из заголовков
  static extractTokenFromHeaders(headers: Headers): string | null {
    const authHeader = headers.get('authorization');
    if (authHeader?.startsWith('Bearer ')) {
      return authHeader.substring(7);
    }
    return null;
  }

  // Проверка, является ли пароль уже хэшированным
  static isPasswordHashed(password: string): boolean {
    // bcrypt хэши начинаются с $2a$, $2b$, $2y$
    return password.startsWith('$2a$') ||
           password.startsWith('$2b$') ||
           password.startsWith('$2y$');
  }

  /**
   * Generate password reset token (15 min expiry)
   */
  static generateResetToken(email: string): string {
    const payload: ResetTokenPayload = {
      type: 'password_reset',
      email,
    };

    return jwt.sign(payload, JWT_SECRET, {
      expiresIn: '15m',
      algorithm: 'HS256'
    });
  }

  /**
   * Verify password reset token
   */
  static verifyResetToken(token: string): ResetTokenPayload | null {
    try {
      const decoded = jwt.verify(token, JWT_SECRET, {
        algorithms: ['HS256']
      }) as ResetTokenPayload;

      if (decoded.type !== 'password_reset') {
        return null;
      }

      return decoded;
    } catch (_error) {
      return null;
    }
  }
}
