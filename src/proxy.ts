// proxy.ts
/**
 * NEXT.JS MIDDLEWARE / PROXY
 * Handles:
 * - Authentication checks
 * - Authorization redirects
 * - Security headers
 * - CORS headers
 * - Request logging
 */

import { NextRequest, NextResponse } from 'next/server';
import { AuthService } from './lib/auth/auth.service';
import { getSecurityHeaders } from './lib/security/security-headers';
import { applyCorsHeaders, handleCorsPreflight } from './lib/security/cors';

// Публичные пути (не требуют авторизации)
export const PUBLIC_PATHS = [
  '/api/ping',
  '/api/auth/login',
  '/api/auth/logout',
  '/api/auth/forgot-password',
  '/api/auth/reset-password',
  '/reset-password',
  '/share',
  '/api/csrf',
  '/_next/static',
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

  // Создаем response позже
  let response: NextResponse;

  if (AUTH_DISABLED) {
    response = NextResponse.next();
  } else {
    const authToken = request.cookies.get('auth-token')?.value;
    const payload = authToken ? AuthService.verifyToken(authToken) : null;
    const isAuthenticated = !!payload;

    // ВАЖНО: Сначала проверяем публичные пути
    const isPublicPath = PUBLIC_PATHS.some(path => {
      if (pathname === path) return true;
      if (pathname.startsWith(path + '/')) return true;
      // Для точного совпадения с query параметрами
      if (pathname === path.split('?')[0]) return true;
      return false;
    });


    // Публичные пути - пропускаем без проверки авторизации
    if (isPublicPath) {
      response = NextResponse.next();
    }
    // Специальная обработка для страницы логина
    else if (pathname === '/login' || pathname.startsWith('/login?')) {
      if (isAuthenticated) {
        response = NextResponse.redirect(new URL('/home', request.url));
      } else {
        response = NextResponse.next();
      }
    }
    // Корневой путь
    else if (pathname === '/') {
      if (isAuthenticated) {
        response = NextResponse.redirect(new URL('/home', request.url));
      } else {
        response = NextResponse.redirect(new URL('/login', request.url));
      }
    }
    // API пути требуют авторизации
    else if (pathname.startsWith('/api/')) {
      if (!isAuthenticated) {
        return NextResponse.json(
          { error: 'Unauthorized' }, 
          { status: 401 }
        );
      }
      // Добавляем user info в headers для API
      const requestHeaders = new Headers(request.headers);
      if (payload) {
        requestHeaders.set('x-user-id', payload.id.toString());
        requestHeaders.set('x-user-email', payload.email);
        requestHeaders.set('x-user-roles', JSON.stringify(payload.role || []));
      }
      response = NextResponse.next({
        request: {
          headers: requestHeaders,
        },
      });
    }
    // Все остальные пути (защищенные)
    else {
      if (!isAuthenticated) {
        const loginUrl = new URL('/login', request.url);
        loginUrl.searchParams.set('from', pathname);
        response = NextResponse.redirect(loginUrl);
      } else if (!payload) {
        response = NextResponse.redirect(new URL('/login', request.url));
        response.cookies.delete('auth-token');
      } else {
        // Добавляем информацию о пользователе
        const requestHeaders = new Headers(request.headers);
        requestHeaders.set('x-user-id', payload.id.toString());
        requestHeaders.set('x-user-email', payload.email);
        requestHeaders.set('x-user-roles', JSON.stringify(payload.role || []));
        response = NextResponse.next({
          request: {
            headers: requestHeaders,
          },
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
    '/((?!api/cron|_next/static|_next/image|favicon.ico).*)',
  ],
};