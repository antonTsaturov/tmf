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

  if (!studyId || !siteId || !role) {
    return NextResponse.json(
      { error: 'Missing required parameters: studyId, siteId, role' },
      { status: 400 }
    );
  }

  const client = await connectDB();

  try {
    // Ищем пользователей, которые:
    // 1. Имеют роль STUDY_MANAGER
    // 2. Назначены на исследование (assigned_study_id содержит studyId)
    // 3. Назначены на центр (assigned_site_id содержит siteId)
    const { rows } = await client.query(`
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
        $1 = ANY(role) AND
        $2::text::integer = ANY(assigned_study_id) AND
        $3::text = ANY(assigned_site_id::text[])
      ORDER BY name ASC
    `, [role, studyId, siteId]);

    return NextResponse.json({
      users: rows,
      count: rows.length
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