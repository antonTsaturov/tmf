// // src/app/api/study/route.ts

import { StudyApiHandler } from '@/app/api/base';
import { NextRequest } from 'next/server';
import { Tables } from '@/lib/db/schema';

// Создаем экземпляр класса
const studyApiHandler = new StudyApiHandler();

export async function GET() {
  return studyApiHandler.getTable(Tables.STUDY);
}

export async function POST(request: NextRequest) {
  return studyApiHandler.createOrUpdateTable(Tables.STUDY, request);
}

export async function DELETE(request: NextRequest) {
  return studyApiHandler.deleteRecord(Tables.STUDY, request);
}