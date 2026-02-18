import { StudyApiHandler } from '@/app/api/base';
import { NextRequest } from 'next/server';
import { Tables } from '@/lib/db/schema';

// Создаем экземпляр класса
const studyApiHandler = new StudyApiHandler();

export async function GET(request?: NextRequest) {
  // console.log('request: ',request)
  // if (request) {
  //   return studyApiHandler.getTablePartial(Tables.USERS, request);
  // } else {
    return studyApiHandler.getTable(Tables.USERS);
  // }

}

export async function POST(request: NextRequest) {
  return studyApiHandler.createOrUpdateTable(Tables.USERS, request);
}

export async function DELETE(request: NextRequest) {
  return studyApiHandler.deleteRecord(Tables.USERS, request);
}