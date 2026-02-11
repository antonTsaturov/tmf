// app/api/auth/login/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { AuthService } from '@/lib/auth/auth.service';
import { connectDB } from '@/lib/db';
import { UserQueries } from '@/lib/db/schema';
import { UserStatus } from '@/types/types';

export async function POST(request: NextRequest) {
  const client = await connectDB();
  
  try {
    const { email, password } = await request.json();

    // 1. Валидация
    if (!email || !password) {
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
      return NextResponse.json(
        { error: 'Invalid credentials' },
        { status: 401 }
      );
    }

    if (user.status === UserStatus.TERMINATED) {
      return NextResponse.json(
        { error: 'Account is deactivated' },
        { status: 403 }
      );
    }

    // 4. Проверить, первый ли это вход (last_login === null)
    const isFirstLogin = user.last_login === null || user.last_login === undefined;
    
    // 5. Если это первый вход
    if (isFirstLogin) {
      // Проверяем пароль как есть (предполагаем, что в БД хранится открытый пароль)
      // const isPasswordValid = password === user.password_hash;
      
      // if (!isPasswordValid) {
      //   return NextResponse.json(
      //     { error: 'Invalid credentials' },
      //     { status: 401 }
      //   );
      // }
      
      // Хэшируем пароль и сохраняем в БД
      const hashedPassword = await AuthService.hashPassword(password);
      
      await client.query(
        `UPDATE users 
         SET password_hash = $1, 
             password_changed_at = NOW(),
             last_login = NOW(),
             status = ${UserStatus.ACTIVE}
         WHERE id = $2`,
        [hashedPassword, user.id]
      );
      
      // Обновляем объект пользователя с новым хэшем для дальнейшего использования
      user.password_hash = hashedPassword;
      
    } else {
      // Обычная проверка через bcrypt
      const isValidPassword = await AuthService.comparePassword(
        password,
        user.password_hash
      );

      if (!isValidPassword) {
        // Увеличиваем счетчик неудачных попыток
        // TODO: сделать блокировку после 5 неудачных попыток
        const newAttempts = user.failed_login_attempts + 1;
        // let lockUntil = null;
        
        // // Блокировка после 5 неудачных попыток
        // if (newAttempts >= 5) {
        //   lockUntil = new Date(Date.now() + 15 * 60 * 1000); // 15 минут
        // }
        
        await client.query(
          `UPDATE users 
           SET failed_login_attempts = $1
           WHERE id = $2`,
          [newAttempts, user.id]
        );
        
        return NextResponse.json(
          { error: 'Invalid credentials' },
          { status: 401 }
        );
      }
      // if (!isValidPassword) {
      //   // Увеличиваем счетчик неудачных попыток
      //   const newAttempts = user.failed_login_attempts + 1;
      //   let lockUntil = null;
      //   let errorMessage = 'Invalid credentials';
      //   let statusCode = 401;
        
      //   // Блокировка после 5 неудачных попыток
      //   if (newAttempts >= 5) {
      //     lockUntil = new Date(Date.now() + 15 * 60 * 1000); // 15 минут
          
      //     // Проверяем, не заблокирован ли уже пользователь
      //     if (user.lock_until && new Date(user.lock_until) > new Date()) {
      //       const remainingTime = Math.ceil(
      //         (new Date(user.lock_until) - new Date()) / 60000
      //       );
      //       errorMessage = `Account is locked. Try again in ${remainingTime} minutes`;
      //     } else {
      //       errorMessage = 'Too many failed attempts. Account locked for 15 minutes';
      //     }
          
      //     // Устанавливаем код 423 (Locked) для заблокированного аккаунта
      //     if (newAttempts === 5) {
      //       statusCode = 423;
      //     }
      //   }
        
      //   // Обновляем данные пользователя
      //   await client.query(
      //     `UPDATE users 
      //     SET failed_login_attempts = $1,
      //         lock_until = $2,
      //         updated_at = CURRENT_TIMESTAMP
      //     WHERE id = $3`,
      //     [newAttempts, lockUntil, user.id]
      //   );
        
      //   return NextResponse.json(
      //     { 
      //       error: errorMessage,
      //       attempts: newAttempts,
      //       maxAttempts: 5,
      //       ...(lockUntil && { lockUntil: lockUntil.toISOString() })
      //     },
      //     { status: statusCode }
      //   );
      // }
      // Сбросить счетчик неудачных попыток при успешном входе
      await client.query(
        `UPDATE users 
         SET failed_login_attempts = 0
         WHERE id = $1`,
        [user.id]
      );
    }

    // 6. Обновить last_login (если это не первый вход, т.к. при первом уже обновили)
    if (!isFirstLogin) {
      await client.query(
        `UPDATE users SET last_login = NOW() WHERE id = $1`,
        [user.id]
      );
    }

    // 7. Создать JWT токен
    const token = AuthService.generateToken({
      id: user.id,
      email: user.email,
      role: user.roles,
      study_id: user.study_id,
      assigned_site_id: user.assigned_site_id,
    });

    // 8. Вернуть ответ с токеном
    const response = NextResponse.json({
      success: true,
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        role: user.role,
        assigned_site_id: user.assigned_site_id,
        study_id: user.study_id,
        is_first_login: isFirstLogin // Флаг для фронтенда
      }
    });

    // 9. Установить токен в cookie
    response.cookies.set('auth-token', token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'strict',
      maxAge: 24 * 60 * 60, // 24 часа
      path: '/'
    });

    return response;

  } catch (error) {
    console.error('Login error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  } finally {
    if (client) {
      client.release();
    }
  }
}