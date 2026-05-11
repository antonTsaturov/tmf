// // src/app/api/study/route.ts

import { StudyApiHandler } from '@/app/api/base';
import { NextRequest, NextResponse } from 'next/server';
import { Tables } from '@/lib/db/schema';
import { logger } from '@/lib/utils/logger';
import { getPool } from '@/lib/db';
import { getAuthenticatedUser } from '@/lib/auth/check-auth';

// Создаем экземпляр класса
const studyApiHandler = new StudyApiHandler();

export async function GET(request: NextRequest) {
  //return studyApiHandler.getTable(Tables.STUDY);
    let client;
    try {
      client = getPool();

      // Получаем текущего пользователя
      const user = await getAuthenticatedUser(request);
      //const assignedSiteIds = user?.assigned_site_id || [];
      const assignedStudiesIds = user?.assigned_study_id || [];
      const isAdmin = user?.role?.includes("admin") || false;

      let queryText = '';
      let queryParams: any[] = [];      
      // if (!DB_INITIALIZED) {
      // // Проверяем существование таблицы
      //   const tableExists = await this.checkTableExists(client, table);

      //   if (!tableExists) {
      //     logger.info(`Table ${table} does not exist, creating it...`);
      //     await createTable(table);
      //     // Возвращаем пустой массив, так как таблица только что создана
      //     return NextResponse.json([], { status: 200 });
      //   }
      // }

      
      if (isAdmin) {
        // Админ: получаем все исследования со всеми центрами
        queryText = `
          SELECT 
            s.*,
            COALESCE(
              json_agg(
                json_build_object(
                  'id', st.id,
                  'study_id', st.study_id,
                  'study_protocol', st.study_protocol,
                  'name', st.name,
                  'number', st.number,
                  'country', st.country,
                  'city', st.city,
                  'principal_investigator', st.principal_investigator,
                  'status', st.status,
                  'created_at', st.created_at
                )
              ) FILTER (WHERE st.id IS NOT NULL),
              '[]'::json
            ) AS sites
          FROM study s
          LEFT JOIN site st ON st.study_id = s.id
          GROUP BY s.id
          ORDER BY s.id ASC
        `;
        queryParams = [];
      } else {
        // Обычный пользователь: получаем исследования только с его центрами
        queryText = `
          SELECT 
            s.*,
            COALESCE(
              json_agg(
                json_build_object(
                  'id', st.id,
                  'study_id', st.study_id,
                  'study_protocol', st.study_protocol,
                  'name', st.name,
                  'number', st.number,
                  'country', st.country,
                  'city', st.city,
                  'principal_investigator', st.principal_investigator,
                  'status', st.status,
                  'created_at', st.created_at
                )
              ) FILTER (WHERE st.id IS NOT NULL),
              '[]'
            ) AS sites
          FROM study s
          LEFT JOIN site st ON st.study_id = s.id
          WHERE $1::integer[] IS NULL OR $1 = '{}'::integer[] OR s.id::integer = ANY($1)
          GROUP BY s.id
          ORDER BY s.id ASC
        `;

        queryParams = [assignedStudiesIds.length > 0 ? assignedStudiesIds : null];
      }

      const result = await client.query(queryText, queryParams);

      return NextResponse.json(result.rows, { status: 200 });
      
    } catch (err) {
      logger.error('GET /api/study error', err instanceof Error ? err : null);
      return NextResponse.json({ 
        error: `Failed to fetch data from study`, 
        details: String(err) 
      }, { status: 500 });
      
    }
  
}

export async function POST(request: NextRequest) {
  return studyApiHandler.createOrUpdateTable(Tables.STUDY, request);
}

export async function DELETE(request: NextRequest) {
  return studyApiHandler.deleteRecord(Tables.STUDY, request);
}