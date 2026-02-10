// app/api/proxy/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { AuthService } from '@/lib/auth/auth.service';

// Список защищенных API endpoint'ов
const PROTECTED_API_PATHS = [
  '/api/users',
  '/api/site',
  '/api/study',
  '/api/documents'
];

export async function GET(request: NextRequest) {
  const url = new URL(request.url);
  const path = url.searchParams.get('path');

  if (!path) {
    return NextResponse.json(
      { error: 'Path parameter is required' },
      { status: 400 }
    );
  }

  // Проверить, требует ли путь авторизации
  const requiresAuth = PROTECTED_API_PATHS.some(apiPath => 
    path.startsWith(apiPath)
  );

  if (requiresAuth) {
    // Проверить авторизацию
    const authToken = request.cookies.get('auth-token')?.value;
    
    if (!authToken) {
      return NextResponse.json(
        { error: 'Authentication required' },
        { status: 401 }
      );
    }

    const payload = AuthService.verifyToken(authToken);
    
    if (!payload) {
      return NextResponse.json(
        { error: 'Invalid or expired token' },
        { status: 401 }
      );
    }

    // Добавить информацию о пользователе к запросу
    const headers = new Headers(request.headers);
    headers.set('x-user-id', payload.id.toString());
    
    // Перенаправить запрос к оригинальному API с заголовками пользователя
    const apiUrl = new URL(path, process.env.NEXT_PUBLIC_API_BASE_URL || request.nextUrl.origin);
    
    const response = await fetch(apiUrl.toString(), {
      headers,
      method: request.method,
      body: request.body
    });

    return response;
  }

  // Для незащищенных путей - просто проксировать запрос
  const apiUrl = new URL(path, process.env.NEXT_PUBLIC_API_BASE_URL || request.nextUrl.origin);
  const response = await fetch(apiUrl.toString(), {
    method: request.method,
    body: request.body
  });

  return response;
}

export async function POST(request: NextRequest) {
  return GET(request);
}

export async function PUT(request: NextRequest) {
  return GET(request);
}

export async function DELETE(request: NextRequest) {
  return GET(request);
}

export async function PATCH(request: NextRequest) {
  return GET(request);
}