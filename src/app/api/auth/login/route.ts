// app/api/auth/login/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { AuthService, JwtPayload } from '@/lib/auth/auth.service';
import { createSession } from '@/lib/auth/session';
import { getPool } from '@/lib/db';
import { UserQueries } from '@/lib/db/schema';
import { UserStatus } from '@/types/types';
import { logger } from '@/lib/utils/logger';
import { applyRateLimit, RATE_LIMIT_PRESETS } from '@/lib/security/rate-limit';

export async function POST(request: NextRequest) {
  // Apply rate limiting to login endpoint
  return applyRateLimit(RATE_LIMIT_PRESETS.login, request, async () => {
    return handleLogin(request);
  });
}

async function handleLogin(request: NextRequest) {
  const client = getPool();
  const clientIp = request.headers.get('x-forwarded-for') || request.headers.get('x-real-ip') || 'unknown';
  
  try {
    const { email, password } = await request.json();

    // 1. Валидация
    if (!email || !password) {
      logger.authError('LOGIN_INVALID_INPUT', undefined, 'Email and password are required');
      return NextResponse.json(
        { error: 'Email and password are required' },
        { status: 400 }
      );
    }

    // 2. Найти пользователя в БД
    const result = await client.query(
      UserQueries.getUserForAuthentication(email),
      [email]
    );

    const user = result.rows[0];

    // 3. Проверить пользователя
    if (!user) {
      logger.authError('LOGIN_USER_NOT_FOUND', undefined, `Email: ${email}`, { ip: clientIp });
      return NextResponse.json(
        { error: 'Invalid credentials' },
        { status: 401 }
      );
    }

    // 4. Проверить блокировку (до проверки пароля)
    //const _currentAttempts = Number(user.failed_login_attempts || 0);
    const lockUntil = user.lock_until ? new Date(user.lock_until) : null;
    const now = new Date();

    if (lockUntil && lockUntil > now) {
      const remainingMinutes = Math.ceil((lockUntil.getTime() - now.getTime()) / 60000);
      
      logger.authError('LOGIN_ACCOUNT_LOCKED', user.id, `Locked for ${remainingMinutes} min`, { ip: clientIp });
      
      return NextResponse.json(
        { 
          error: `Account is locked. Try again in ${remainingMinutes} minutes`,
          lockUntil: lockUntil.toISOString()
        },
        { status: 423 }
      );
    } 

    // Если блокировка была, но время вышло — сбрасываем в БД
    if (lockUntil && lockUntil <= now) {
      await client.query(
        `UPDATE users SET failed_login_attempts = 0, lock_until = NULL WHERE id = $1`,
        [user.id]
      );
      // Обновляем локальный объект, чтобы не сработали старые данные в Step 6
      user.failed_login_attempts = 0;
      user.lock_until = null;
    }

    // 5. Проверить, первый ли это вход (last_login === null)
    const isFirstLogin = user.last_login === null || user.last_login === undefined;
    
    // 6. Если это первый вход
    if (isFirstLogin) {
      // Хэшируем пароль и сохраняем в БД
      const hashedPassword = await AuthService.hashPassword(password);
      
      await client.query(
        `UPDATE users 
         SET password_hash = $1, 
             password_changed_at = NOW(),
             last_login = NOW(),
             status = $2
         WHERE id = $3`,
        [hashedPassword, UserStatus.ACTIVE, user.id]
      );
      
      user.password_hash = hashedPassword;
      logger.authLog('LOGIN_FIRST_LOGIN_SUCCESS', user.id, 'First login completed', { ip: clientIp });
      
    } else {
      // Обычная проверка через bcrypt
      const isValidPassword = await AuthService.comparePassword(
        password,
        user.password_hash
      );

      if (!isValidPassword) {
        const newAttempts = user.failed_login_attempts + 1;
        let lockUntilISOString: string | null = null;
        let updateQuery: string;
        let params: any[];

        // Блокировка после 5 неудачных попыток
        if (newAttempts >= 5) {
          const lockUntilDate = new Date(Date.now() + 15 * 60 * 1000); // 15 минут
          lockUntilISOString = lockUntilDate.toISOString();
          updateQuery = `UPDATE users SET failed_login_attempts = $1, lock_until = $2 WHERE id = $3`;
          params = [newAttempts, lockUntilISOString, user.id];
          logger.authError('LOGIN_ACCOUNT_BLOCKED', user.id, `Blocked after ${newAttempts} failed attempts`, { ip: clientIp, lockUntil: lockUntilISOString });
        } else {
          updateQuery = `UPDATE users SET failed_login_attempts = $1 WHERE id = $2`;
          params = [newAttempts, user.id];
          logger.authError('LOGIN_INVALID_PASSWORD', user.id, `Failed attempt ${newAttempts}/5`, { ip: clientIp });
        }
        
        const updateResult = await client.query(updateQuery, params);
        logger.debug('Login attempt recorded', { userId: user.id, newAttempts, rowsAffected: updateResult.rowCount, locked: newAttempts >= 5 });
        
        return NextResponse.json(
          { 
            error: newAttempts >= 5 
              ? 'Too many failed attempts. Account locked for 15 minutes'
              : 'Invalid credentials',
            attempts: newAttempts,
            maxAttempts: 5,
            ...(lockUntilISOString && { lockUntil: lockUntilISOString })
          },
          { status: newAttempts >= 5 ? 423 : 401 }
        );
      }

      // Сбросить счетчик неудачных попыток при успешном входе
      await client.query(
        `UPDATE users 
         SET failed_login_attempts = 0, lock_until = NULL
         WHERE id = $1`,
        [user.id]
      );

      // Обновить last_login
      await client.query(
        `UPDATE users SET last_login = NOW() WHERE id = $1`,
        [user.id]
      );

      logger.authLog('LOGIN_SUCCESS', user.id, 'Successfully logged in', { ip: clientIp });
    }

    // 7. Создать сессию
    const session = createSession({
      userId: user.id,
      userEmail: user.email,
      refreshTokenHash: AuthService.hashRefreshToken('login_' + Date.now()),
    });

    // 8. Создать JWT access token с sessionId
    const tokenPayload: JwtPayload = {
      id: user.id,
      email: user.email,
      role: user.role,
      assigned_study_id: user.assigned_study_id,
      assigned_site_id: user.assigned_site_id,
      assigned_country_by_study: user.assigned_country_by_study,
      sessionId: session.sessionId,
    };

    const token = AuthService.generateAccessToken(tokenPayload);

    // 9. Вернуть ответ с токеном
    const response = NextResponse.json({
      success: true,
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        role: user.role,
        assigned_site_id: user.assigned_site_id,
        assigned_study_id: user.assigned_study_id,
        assigned_country_by_study: user.assigned_country_by_study,
        is_first_login: isFirstLogin
      }
    });

    // 10. Установить токен в cookie
    response.cookies.set('auth-token', token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'strict',
      maxAge: 15 * 60, // 15 minutes (matches ACCESS_TOKEN_EXPIRY)
      path: '/'
    });

    return response;

  } catch (error) {
    logger.error('Login endpoint error', error instanceof Error ? error : null, { 
      ip: clientIp 
    });
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  } 
}
