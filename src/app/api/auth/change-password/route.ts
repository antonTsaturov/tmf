// app/api/auth/change-password/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { hash, compare } from 'bcryptjs';
import { getPool } from '@/lib/db/index';
import { checkAuth } from '@/lib/auth/check-auth';

export async function POST(request: NextRequest) {
  // Проверяем авторизацию
  const auth = await checkAuth(request);
  if (!auth.authenticated) {
    return auth.response;
  }

  const client = getPool();

  try {
    const { currentPassword, newPassword, confirmPassword } = await request.json();

    // Получаем пользователя из базы
    const userResult = await client.query(
      `SELECT id, email, password_hash, status, failed_login_attempts 
       FROM users 
       WHERE id = $1`,
      [auth.payload?.id]
    );

    const user = userResult.rows[0];
    if (!user) {
      return NextResponse.json(
        { error: 'Пользователь не найден' },
        { status: 404 }
      );
    }
    // Проверяем статус пользователя
    if (user.status !== 'active') {
      return NextResponse.json(
        { error: 'Учетная запись неактивна' },
        { status: 403 }
      );
    }

    // Проверяем текущий пароль
    const isValid = await compare(currentPassword, user.password_hash);
    
    if (!isValid) {
      // Увеличиваем счетчик неудачных попыток
      await client.query(
        `UPDATE users 
         SET failed_login_attempts = failed_login_attempts + 1,
             updated_at = NOW()
         WHERE id = $1`,
        [user.id]
      );

      return NextResponse.json(
        { error: 'Неверный текущий пароль' },
        { status: 400 }
      );
    }

    // Проверяем, что новый пароль отличается от текущего
    const isSamePassword = await compare(newPassword, user.password_hash);
    if (isSamePassword) {
      return NextResponse.json(
        { error: 'Новый пароль должен отличаться от текущего' },
        { status: 400 }
      );
    }

    // Хешируем новый пароль
    const hashedPassword = await hash(newPassword, 10);

    // Обновляем пароль и сбрасываем счетчик неудачных попыток
    await client.query(
      `UPDATE users 
       SET password_hash = $1,
           password_changed_at = NOW(),
           failed_login_attempts = 0,
           updated_at = NOW()
       WHERE id = $2`,
      [hashedPassword, user.id]
    );

    // Логируем действие в audit
    await client.query(
      `INSERT INTO audit (
        audit_id, created_at, user_id, user_email, user_role, 
        action, entity_type, entity_id, ip_address, user_agent, 
        session_id, status, reason
      ) VALUES (
        gen_random_uuid(), NOW(), $1, $2, $3,
        'UPDATE', 'USER', $1::text, $4, $5,
        $6, 'SUCCESS', 'Password changed'
      )`,
      [
        user.id,
        user.email,
        JSON.stringify(auth.payload?.role || []),
        request.headers.get('x-forwarded-for') || 'unknown',
        request.headers.get('user-agent') || 'unknown',
        auth.payload?.id || 'unknown'
      ]
    );

    return NextResponse.json(
      { 
        message: 'Пароль успешно изменен',
        changedAt: new Date().toISOString()
      },
      { status: 200 }
    );

  } catch (error) {
    console.error('Change password error:', error);
    return NextResponse.json(
      { error: 'Внутренняя ошибка сервера' },
      { status: 500 }
    );
  }
}