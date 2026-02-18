// app/api/audit/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { connectDB } from '@/lib/db/index';
import { AuditFilters } from '@/types/types';

export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams;
  
  // Параметры пагинации
  const page = parseInt(searchParams.get('page') || '1');
  const limit = parseInt(searchParams.get('limit') || '20');
  const offset = (page - 1) * limit;
  
  // Фильтры
  const filters: AuditFilters = {
    startDate: searchParams.get('startDate') || undefined,
    endDate: searchParams.get('endDate') || undefined,
    userId: searchParams.get('userId') || undefined,
    userEmail: searchParams.get('userEmail') || undefined,
    action: searchParams.get('action') as any,
    entityType: searchParams.get('entityType') as any,
    entityId: searchParams.get('entityId') || undefined,
    status: searchParams.get('status') as any,
    siteId: searchParams.get('siteId') || undefined,
    studyId: searchParams.get('studyId') || undefined,
    search: searchParams.get('search') || undefined,
  };

  const client = await connectDB();
  
  try {
    // Базовый запрос
    let query = `
      SELECT 
        id, audit_id, created_at, user_id, user_email, user_role,
        action, entity_type, entity_id, old_value, new_value,
        ip_address, user_agent, session_id, status, error_message,
        reason, site_id, study_id
      FROM audit
      WHERE 1=1
    `;
    
    const queryParams: any[] = [];
    let paramIndex = 1;

    // Применяем фильтры
    if (filters.startDate) {
      query += ` AND created_at >= $${paramIndex}`;
      queryParams.push(filters.startDate);
      paramIndex++;
    }

    if (filters.endDate) {
      query += ` AND created_at <= $${paramIndex}`;
      queryParams.push(filters.endDate);
      paramIndex++;
    }

    if (filters.userId) {
      query += ` AND user_id = $${paramIndex}`;
      queryParams.push(filters.userId);
      paramIndex++;
    }

    if (filters.userEmail) {
      query += ` AND user_email ILIKE $${paramIndex}`;
      queryParams.push(`%${filters.userEmail}%`);
      paramIndex++;
    }

    if (filters.action) {
      query += ` AND action = $${paramIndex}`;
      queryParams.push(filters.action);
      paramIndex++;
    }

    if (filters.entityType) {
      query += ` AND entity_type = $${paramIndex}`;
      queryParams.push(filters.entityType);
      paramIndex++;
    }

    if (filters.entityId) {
      query += ` AND entity_id = $${paramIndex}`;
      queryParams.push(filters.entityId);
      paramIndex++;
    }

    if (filters.status) {
      query += ` AND status = $${paramIndex}`;
      queryParams.push(filters.status);
      paramIndex++;
    }

    if (filters.siteId) {
      query += ` AND site_id = $${paramIndex}`;
      queryParams.push(filters.siteId);
      paramIndex++;
    }

    if (filters.studyId) {
      query += ` AND study_id = $${paramIndex}`;
      queryParams.push(filters.studyId);
      paramIndex++;
    }

    if (filters.search) {
      query += ` AND (
        user_email ILIKE $${paramIndex} OR
        entity_id::text ILIKE $${paramIndex} OR
        reason ILIKE $${paramIndex} OR
        error_message ILIKE $${paramIndex}
      )`;
      queryParams.push(`%${filters.search}%`);
      paramIndex++;
    }

    // Подсчет общего количества
    const countQuery = query.replace(
      /SELECT .* FROM audit/,
      'SELECT COUNT(*) as total FROM audit'
    );
    
    const { rows: countResult } = await client.query(countQuery, queryParams);
    const total = parseInt(countResult[0].total);

    // Добавляем сортировку и пагинацию
    query += ` ORDER BY created_at DESC LIMIT $${paramIndex} OFFSET $${paramIndex + 1}`;
    queryParams.push(limit, offset);

    // Выполняем основной запрос
    const { rows } = await client.query(query, queryParams);

    return NextResponse.json({
      logs: rows,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit)
      }
    });

  } catch (error) {
    console.error('Error fetching audit logs:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  } finally {
    client.release();
  }
}