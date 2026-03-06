// app/api/documents/reviews/pending/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { connectDB } from '@/lib/db/index';
import { AuditService } from '@/lib/audit/audit.service';
import { DocumentLifeCycleStatus } from '@/types/document';

export async function GET(request: NextRequest) {
  const client = await connectDB();
  
  try {
    // Получаем текущего пользователя из сессии
    const user = AuditService.getUserFromRequest(request);
    const userId = user.user_id?.toString();
    const userRoles = user.user_role || [];

    if (!userId) {
      return NextResponse.json(
        { error: 'User not authenticated' },
        { status: 401 }
      );
    }

    // Проверяем, есть ли у пользователя права на ревью
    const canReview = userRoles.some((role: string) => 
      ['admin', 'study_manager', 'data_manager', 'monitor', 'qa', 'auditor'].includes(role)
    );

    if (!canReview) {
      return NextResponse.json(
        { error: 'User does not have permission to review documents' },
        { status: 403 }
      );
    }

    // Получаем параметры фильтрации из URL
    const searchParams = request.nextUrl.searchParams;
    const study_id = searchParams.get('study_id');
    const site_id = searchParams.get('site_id');
    const folder_id = searchParams.get('folder_id');
    const limit = parseInt(searchParams.get('limit') || '50');
    const offset = parseInt(searchParams.get('offset') || '0');

    // Replace the previous "let query = ..." block with this:
    let query = `
    SELECT 
        d.id,
        d.study_id,
        d.site_id,
        d.folder_id,
        d.folder_name,
        d.tmf_zone,
        d.tmf_artifact,
        d.created_at,
        d.created_by,
        dv.id as version_id,
        dv.document_number,
        dv.document_name,
        dv.file_name,
        dv.file_path,
        dv.file_type,
        dv.file_size,
        dv.checksum,
        dv.uploaded_by,
        dv.uploaded_at,
        dv.change_reason,
        dv.review_status,
        dv.review_submitted_at,
        dv.review_submitted_by,
        dv.review_submitted_to,
        dv.review_comment,
        uploader.name as uploader_name,
        uploader.email as uploader_email,
        submitter.name as submitter_name,
        submitter.email as submitter_email,
        creator.name as creator_name,
        creator.email as creator_email
    FROM document_version dv
    JOIN document d ON d.id = dv.document_id
    LEFT JOIN users uploader ON dv.uploaded_by = uploader.id
    LEFT JOIN users submitter ON dv.review_submitted_by = submitter.id
    LEFT JOIN users creator ON d.created_by = creator.id
    WHERE dv.review_status = 'submitted'
        AND dv.review_submitted_to = $1
        AND d.is_deleted = false
        AND (d.is_archived = false OR d.is_archived IS NULL)
    `;
    const queryParams: any[] = [userId];
    let paramIndex = 2;

    // Добавляем фильтры, если они указаны
    if (study_id) {
      query += ` AND d.study_id = $${paramIndex}`;
      queryParams.push(parseInt(study_id));
      paramIndex++;
    }

    if (site_id) {
      query += ` AND d.site_id = $${paramIndex}`;
      queryParams.push(site_id);
      paramIndex++;
    }

    if (folder_id) {
      query += ` AND d.folder_id = $${paramIndex}`;
      queryParams.push(folder_id);
      paramIndex++;
    }

    // Добавляем сортировку и пагинацию
    query += `
      ORDER BY dv.review_submitted_at DESC
      LIMIT $${paramIndex} OFFSET $${paramIndex + 1}
    `;
    queryParams.push(limit, offset);

    // Выполняем запрос
    const { rows: documents } = await client.query(query, queryParams);

    // Получаем общее количество для пагинации
    let countQuery = `
      SELECT COUNT(*) as total
      FROM document_version dv
      JOIN document d ON d.id = dv.document_id
      WHERE dv.review_status = 'submitted'
        AND dv.review_submitted_to = $1
        AND d.is_deleted = false
        AND (d.is_archived = false OR d.is_archived IS NULL)
    `;

    const countParams: any[] = [userId];
    let countParamIndex = 2;

    if (study_id) {
      countQuery += ` AND d.study_id = $${countParamIndex}`;
      countParams.push(parseInt(study_id));
      countParamIndex++;
    }

    if (site_id) {
      countQuery += ` AND d.site_id = $${countParamIndex}`;
      countParams.push(site_id);
      countParamIndex++;
    }

    if (folder_id) {
      countQuery += ` AND d.folder_id = $${countParamIndex}`;
      countParams.push(folder_id);
      countParamIndex++;
    }

    const { rows: countResult } = await client.query(countQuery, countParams);
    const total = parseInt(countResult[0].total);

    // Форматируем результат
    const formattedDocuments = documents.map(doc => ({
      id: doc.id,
      study_id: doc.study_id,
      site_id: doc.site_id,
      folder_id: doc.folder_id,
      folder_name: doc.folder_name,
      tmf_zone: doc.tmf_zone,
      tmf_artifact: doc.tmf_artifact,
      document_name: doc.document_name,
      document_number: doc.document_number,
      file_name: doc.file_name,
      file_path: doc.file_path,
      file_type: doc.file_type,
      file_size: doc.file_size,
      status: DocumentLifeCycleStatus.ACTIVE,
      review_status: doc.review_status,
      review_submitted_at: doc.review_submitted_at,
      review_comment: doc.review_comment,
      created_at: doc.created_at,
      created_by: doc.created_by,
      creator: doc.creator_name ? {
        id: doc.created_by,
        name: doc.creator_name,
        email: doc.creator_email
      } : null,
      uploader: doc.uploader_name ? {
        id: doc.uploaded_by,
        name: doc.uploader_name,
        email: doc.uploader_email
      } : null,
      submitter: doc.submitter_name ? {
        id: doc.review_submitted_by,
        name: doc.submitter_name,
        email: doc.submitter_email
      } : null,
      version_id: doc.version_id,
      uploaded_at: doc.uploaded_at,
      change_reason: doc.change_reason
    }));

    return NextResponse.json({
      documents: formattedDocuments,
      pagination: {
        total,
        limit,
        offset,
        hasMore: offset + limit < total
      }
    });

  } catch (error) {
    console.error('Error fetching pending reviews:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  } finally {
    client.release();
  }
}