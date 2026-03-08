// API эндпоинт для получения рецензентов
// app/api/users/reviewers/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { connectDB } from '@/lib/db/index';
import { Tables } from '@/lib/db/schema';
import { UserRole } from '@/types/types';

export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams;
  const studyId = searchParams.get('studyId');
  const siteId = searchParams.get('siteId');
  const role = searchParams.get('role');

  if (!studyId || !role) {
    return NextResponse.json(
      { error: 'Missing required parameters: studyId, role' },
      { status: 400 }
    );
  }

  const client = await connectDB();

  try {
    // Подготавливаем параметры запроса
    const queryParams: any[] = [role, studyId];
    let siteCondition = '';

    // Формируем условие для site_id если оно не null
    if (siteId) {
      siteCondition = `AND $3::text = ANY(assigned_site_id::text[])`;
      queryParams.push(siteId);
    } 

    // Ищем пользователей, которые:
    // 1. Имеют указанную роль
    // 2. Назначены на исследование (assigned_study_id содержит studyId)
    // 3. Назначены на центр (assigned_site_id содержит siteId) ИЛИ центр не указан
    const query = `
      SELECT 
        id,
        email,
        name,
        title,
        organisation,
        role,
        status,
        assigned_study_id,
        assigned_site_id
      FROM ${Tables.USERS}
      WHERE 
        $1::text = ANY(role) AND
        $2::text::integer = ANY(assigned_study_id)
        ${siteCondition}
      ORDER BY name ASC
    `;

    const { rows } = await client.query(query, queryParams);

    return NextResponse.json({
      users: rows,
      count: rows.length,
      filters: {
        studyId,
        siteId: siteId || null,
        role
      }
    });

  } catch (error) {
    console.error('Error fetching reviewers:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  } finally {
    client.release();
  }
}