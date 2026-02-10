// proxy.ts
import { NextRequest, NextResponse } from 'next/server';
import { AuthService } from './lib/auth/auth.service';

// Публичные пути (не требуют авторизации)
const PUBLIC_PATHS = [
  '/login',
  '/api/auth/login',
  '/api/auth/logout',
  '/_next/static',
  '/_next/image',
  '/favicon.ico'
];

// Флаг для отключения авторизации
export const AUTH_DISABLED = false;

export function proxy(request: NextRequest) {

  if (AUTH_DISABLED) {
    return NextResponse.next();
  }

  const { pathname } = request.nextUrl;

  // Пропустить публичные пути
  if (PUBLIC_PATHS.some(path => pathname.startsWith(path))) {
    return NextResponse.next();
  }

  // Проверить авторизацию
  const authToken = request.cookies.get('auth-token')?.value;

  if (!authToken) {
    // Редирект на страницу логина
    const loginUrl = new URL('/login', request.url);
    loginUrl.searchParams.set('from', pathname);
    return NextResponse.redirect(loginUrl);
  }

  // Проверить валидность токена
  const payload = AuthService.verifyToken(authToken);
  
  if (!payload) {
    // Токен невалиден - очистить cookie и редирект
    const response = NextResponse.redirect(new URL('/login', request.url));
    response.cookies.delete('auth-token');
    return response;
  }

  // Добавить информацию о пользователе в заголовки
  const requestHeaders = new Headers(request.headers);
  requestHeaders.set('x-user-id', payload.id.toString());
  requestHeaders.set('x-user-email', payload.email);
  requestHeaders.set('x-user-roles', JSON.stringify(payload.role));

  return NextResponse.next({
    headers: requestHeaders,
  });
}

// Конфигурация middleware
export const config = {
  matcher: [
    /*
     * Защитить все пути кроме:
     * - Публичные пути
     * - Статические файлы
     */
    '/((?!_next/static|_next/image|favicon.ico).*)',
  ],
};