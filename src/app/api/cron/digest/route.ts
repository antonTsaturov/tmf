// src/app/api/cron/digest/route.ts

/*
* Эндпойинт для отправки ежедневных email-уведомлений
* о новых документах
* 
* Ручной запуск локально:
* curl -i "http://localhost:3000/api/cron/digest?key=<CRON_SECRET>"
* 
* Запуск на сервере:
* curl -i "https://exploretmf.ru/api/cron/digest?key=<CRON_SECRET>"
* 
* Через cron:
* 0 2 * * * /usr/bin/curl -fsSL "https://exploretmf.ru/api/cron/digest?key=<CRON_SECRET>" >> /var/log/digest_cron.log 2>&1
* 
*/

import { DigestService } from '@/services/digest.service';
import { NextResponse } from 'next/server';

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  if (searchParams.get('key') !== process.env.CRON_SECRET) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }
  await DigestService.sendDailyDigests();
  return NextResponse.json({ success: true });
}