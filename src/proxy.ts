// proxy.ts
/**
 * 🔐 NEXT.JS MIDDLEWARE / PROXY
 * Handles:
 * - Authentication checks
 * - Authorization redirects
 * - Security headers
 * - CORS headers
 * - Request logging
 */

import { NextRequest, NextResponse } from 'next/server';
import { AuthService } from './lib/auth/auth.service';
import { getSecurityHeaders } from './lib/security-headers';
import { applyCorsHeaders, handleCorsPreflight } from './lib/cors';

// Публичные пути (не требуют авторизации)
const PUBLIC_PATHS = [
  '/api/auth/login',
  '/api/auth/logout',
  '/api/csrf',
  '/_next/static',
  '/_next/image',
  '/favicon.ico'
];

// Paths that should skip middleware entirely (static assets)
const SKIP_MIDDLEWARE_PATHS = [
  /^\/_next\//,
  /^\/favicon\.ico$/,
  /^\/robots\.txt$/,
  /^\/sitemap\.xml$/,
  /^\/\.well-known\//,
  /\.png$/,
  /\.jpg$/,
  /\.jpeg$/,
  /\.gif$/,
  /\.svg$/,
  /\.ico$/,
  /\.webp$/,
];

// Флаг для отключения авторизации
export const AUTH_DISABLED = false;

/**
 * Check if path should skip middleware
 */
function shouldSkipMiddleware(pathname: string): boolean {
  return SKIP_MIDDLEWARE_PATHS.some(pattern => pattern.test(pathname));
}

export function proxy(request: NextRequest) {
  const pathname = request.nextUrl.pathname;

  // Skip middleware for static assets
  if (shouldSkipMiddleware(pathname)) {
    return NextResponse.next();
  }

  // Handle CORS preflight requests (OPTIONS)
  if (request.method === 'OPTIONS') {
    return handleCorsPreflight(request);
  }

  // Create response that will carry security headers
  let response: NextResponse;

  if (AUTH_DISABLED) {
    response = NextResponse.next();
  } else {
    const authToken = request.cookies.get('auth-token')?.value;
    const payload = authToken ? AuthService.verifyToken(authToken) : null;
    const isAuthenticated = !!payload;

    // Специальная обработка для страницы логина
    if (pathname === '/login' || pathname.startsWith('/login?')) {
      // Если пользователь уже авторизован - редирект на главную
      if (isAuthenticated) {
        response = NextResponse.redirect(new URL('/home', request.url));
      } else {
        // Иначе показываем страницу логина
        response = NextResponse.next();
      }
    } else if (pathname === '/') {
      // Корневой путь: если не авторизован - редирект на логин, если авторизован - на home
      if (isAuthenticated) {
        response = NextResponse.redirect(new URL('/home', request.url));
      } else {
        response = NextResponse.redirect(new URL('/login', request.url));
      }
    } else if (PUBLIC_PATHS.some(path => pathname.startsWith(path))) {
      // Пропустить другие публичные пути
      response = NextResponse.next();
    } else {
      // Для всех остальных путей - проверка авторизации
      if (!isAuthenticated) {
        const loginUrl = new URL('/login', request.url);
        loginUrl.searchParams.set('from', pathname);
        response = NextResponse.redirect(loginUrl);
      } else if (!payload) {
        // Токен невалиден
        response = NextResponse.redirect(new URL('/login', request.url));
        response.cookies.delete('auth-token');
      } else {
        // Добавить информацию о пользователе в заголовки
        const requestHeaders = new Headers(request.headers);
        requestHeaders.set('x-user-id', payload.id.toString());
        requestHeaders.set('x-user-email', payload.email);

        const roles = payload.role || [];
        requestHeaders.set('x-user-roles', JSON.stringify(roles));
        response = NextResponse.next({
          headers: requestHeaders,
        });
      }
    }
  }

  // Apply security headers
  const securityHeaders = getSecurityHeaders();
  Object.entries(securityHeaders).forEach(([key, value]) => {
    response.headers.set(key, value);
  });

  // Apply CORS headers
  response = applyCorsHeaders(request, response);

  return response;
}

export const config = {
  matcher: [
    '/((?!_next/static|_next/image|favicon.ico).*)',
  ],
};