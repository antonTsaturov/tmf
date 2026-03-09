// app/api/ping/route.ts
import { NextResponse } from 'next/server';
import { connectDB } from '@/lib/db/index'; // Ваша функция подключения

export const dynamic = 'force-dynamic';

export async function GET() {
  let client;
  try {
    // 1. Пытаемся получить клиент из пула (это проверка соединения)
    client = await connectDB();
    
    // 2. Делаем легчайший запрос к БД (проверка сети до Postgres)
    await client.query('SELECT 1');
    
    return NextResponse.json({ 
      status: 'ok', 
      timestamp: Date.now(),
      db: 'connected' 
    });
    
  } catch (error) {
    console.error('❌ Ping failed (DB connection error):', error);
    
    // Возвращаем 503, чтобы фронтенд понял, что проблема на сервере/в сети
    return NextResponse.json({ 
      status: 'error', 
      message: 'Database connection failed' 
    }, { status: 503 });
  } finally {
    // 3. Обязательно освобождаем клиент обратно в пул
    if (client) {
      client.release();
    }
  }
}