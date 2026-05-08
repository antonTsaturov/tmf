import { NextRequest, NextResponse } from 'next/server';
import { getPool } from '@/lib/db';
import { checkAuth } from '@/lib/auth/check-auth';

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const query = (searchParams.get('q') || '').trim();
    const filter = searchParams.get('filter') || 'all';

    // 🔐 Auth
    const auth = await checkAuth(request);

    if (!auth.authenticated) {
      return auth.response;
    }
    
    const pool = getPool();

    // 📌 Получаем доступы пользователя
    const userPermissions = await pool.query(
      `SELECT assigned_study_id, assigned_site_id
       FROM users
       WHERE id = $1`,
      [auth.payload?.id]
    );

    const assignedStudyIds = userPermissions.rows[0]?.assigned_study_id || [];
    const assignedSiteIds = (userPermissions.rows[0]?.assigned_site_id || []).map(String);

    if (assignedStudyIds.length === 0 && assignedSiteIds.length === 0) {
      return NextResponse.json({ documents: [] });
    }

    // 🚫 Если нет текста — не ищем (важно для UX)
    if (!query) {
      return NextResponse.json({ documents: [] });
    }

    // ⚡ Быстрый query (без CTE, без DISTINCT)
    const result = await pool.query(
      `
      SELECT 
        d.id AS document_id,  -- явный алиас
        d.folder_id,
        d.country,
        dv.document_name,
        dv.review_status AS status,
        -- Явно перечисляем поля study с алиасами
        s.id AS study_id,
        s.title AS study_title,
        s.protocol AS study_protocol,
        s.sponsor AS study_sponsor,
        s.cro AS study_cro,
        s.countries AS study_countries,
        s.status AS study_status,
        -- Поля site (оставляем как у вас)
        si.id AS site_id,
        si.study_id AS site_study_id,
        si.study_protocol AS site_study_protocol,
        si.name AS site_name,
        si.number AS site_number,
        si.country AS site_country,
        si.city AS site_city,
        si.principal_investigator AS site_pi,
        si.status AS site_status,
        si.created_at AS site_created_at
      FROM document d
      JOIN document_version dv ON d.current_version_id = dv.id
      JOIN study s ON d.study_id = s.id
      LEFT JOIN site si ON d.site_id = si.id
      WHERE 
          -- 1. Ограничение по правам доступа
          (d.study_id = ANY($1) OR d.site_id = ANY($2))
          
          -- 2. Поиск по названию документа
          AND dv.document_name ILIKE '%' || $4 || '%'
          
          -- 3. Обработка фильтра[cite: 1]
          AND (
              $3 = 'all' 
              OR ($3 = 'studies' AND d.site_id IS NULL) 
              OR ($3 = 'sites' AND d.site_id IS NOT NULL)
          )
          
          -- 4. Исключаем удаленные документы
          AND d.is_deleted = FALSE
      ORDER BY dv.uploaded_at DESC
      LIMIT 50;
      `,
      [
        assignedStudyIds,
        assignedSiteIds,
        filter,
        query
      ]
    );

    // 🧠 Маппинг в lightweight модель
    const documents = result.rows.map(row => ({
      id: row.document_id,
      document_name: row.document_name,
      folder_id: row.folder_id,
      country: row.country,
      status: row.status || 'draft',
      study: {
        id: row.study_id,
        title: row.study_title,
        protocol: row.study_protocol,
        sponsor: row.study_sponsor,
        cro: row.study_cro,
        countries: row.study_countries,
        status: row.study_status,
        users: null,
        total_documents: null,
        folders_structure: null,
        sites: null
      },
      site: row.site_id ? {
        id: row.site_id,
        study_id: row.site_study_id,
        study_protocol: row.site_study_protocol,
        name: row.site_name,
        number: row.site_number,
        country: row.site_country,
        city: row.site_city,
        principal_investigator: row.site_pi,
        status: row.site_status,
        created_at: row.site_created_at
      } : null
    }));

    return NextResponse.json({
      documents,
      count: documents.length
    });

  } catch (error) {
    console.error('[DocumentSuggest] Error:', error);

    return NextResponse.json(
      {
        error: 'Internal server error'
      },
      { status: 500 }
    );
  }
}