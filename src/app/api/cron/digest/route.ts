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