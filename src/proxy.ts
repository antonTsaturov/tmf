// proxy.ts
import { NextRequest, NextResponse } from 'next/server';
import { AuthService } from './lib/auth/auth.service';

// Публичные пути (не требуют авторизации)
const PUBLIC_PATHS = [
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
  const authToken = request.cookies.get('auth-token')?.value;
  //console.log('authToken: ', authToken)
  const payload = authToken ? AuthService.verifyToken(authToken) : null;
  const isAuthenticated = !!payload;

  // Специальная обработка для страницы логина
  if (pathname === '/' || pathname === '/login' || pathname.startsWith('/login?')) {
    // Если пользователь уже авторизован - редирект на главную
    if (isAuthenticated) {
      console.log(`User ${payload.email} already authenticated, redirecting from /login to /home`);
      return NextResponse.redirect(new URL('/home', request.url));
    }
    // Иначе показываем страницу логина
    return NextResponse.next();
  }

  // Пропустить другие публичные пути
  if (PUBLIC_PATHS.some(path => pathname.startsWith(path))) {
    return NextResponse.next();
  }

  // Для всех остальных путей - проверка авторизации
  if (!isAuthenticated) {
    const loginUrl = new URL('/login', request.url);
    loginUrl.searchParams.set('from', pathname);
    return NextResponse.redirect(loginUrl);
  }

  // Токен невалиден
  if (!payload) {
    const response = NextResponse.redirect(new URL('/login', request.url));
    response.cookies.delete('auth-token');
    return response;
  }

  // Добавить информацию о пользователе в заголовки
  const requestHeaders = new Headers(request.headers);
  requestHeaders.set('x-user-id', payload.id.toString());
  requestHeaders.set('x-user-email', payload.email);

  const roles = payload.role || [];
  requestHeaders.set('x-user-roles', JSON.stringify(roles));
  //console.log('requestHeaders: ', requestHeaders)
  return NextResponse.next({
    headers: requestHeaders,
  });
}

export const config = {
  matcher: [
    '/((?!_next/static|_next/image|favicon.ico).*)',
  ],
};