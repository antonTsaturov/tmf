import { StudyApiHandler } from '@/app/api/base';
import { NextRequest } from 'next/server';
import { Tables } from '@/lib/db/schema';

// Создаем экземпляр класса
const studyApiHandler = new StudyApiHandler();

export async function GET(request: NextRequest) {
  return studyApiHandler.getTable(Tables.SITE);
}

export async function POST(request: NextRequest) {
  return studyApiHandler.createOrUpdateTable(Tables.SITE, request);
}

export async function DELETE(request: NextRequest) {
  return studyApiHandler.deleteRecord(Tables.SITE, request);
}