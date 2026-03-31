// app/api/ping/route.ts
import { NextResponse } from 'next/server';
import { getPool } from '@/lib/db'
import { logger } from '@/lib/logger';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    // 1. Пытаемся получить клиент из пула (это проверка соединения)
    const pool = getPool();
    
    // 2. Делаем легчайший запрос к БД (проверка сети до Postgres)
    await pool.query('SELECT 1');
    
    return NextResponse.json({ 
      status: 'ok', 
      timestamp: Date.now(),
      db: 'connected' 
    });
    
  } catch (error) {
    logger.error('❌ Ping failed (DB connection error):', error);

    // Возвращаем 503, чтобы фронтенд понял, что проблема на сервере/в сети
    return NextResponse.json({ 
      status: 'error', 
      message: 'Database connection failed' 
    }, { status: 503 });
  } 
}