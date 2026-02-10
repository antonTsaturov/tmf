// lib/auth/auth.service.ts
import jwt from 'jsonwebtoken';
import bcrypt from 'bcryptjs';

const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key-change-in-production';
const JWT_EXPIRES_IN = '24h';

export interface JwtPayload {
  id: number;
  email: string;
  role: string[];
  study_id: number;
  assigned_site_id: number[];
}

export class AuthService {
  // Генерация JWT токена
  static generateToken(payload: JwtPayload): string {
    return jwt.sign(payload, JWT_SECRET, {
      expiresIn: JWT_EXPIRES_IN
    });
  }

  // Проверка JWT токена
  static verifyToken(token: string): JwtPayload | null {
    try {
      return jwt.verify(token, JWT_SECRET) as JwtPayload;
    } catch {
      return null;
    }
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
}