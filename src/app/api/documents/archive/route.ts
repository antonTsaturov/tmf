// app/api/documents/archive/route.ts

/*
  Глобальная архивация. Архивирует все документы по исследованию Может использоваться,
  если выполняются следующие условия:
  1) Исследование в статусе completed or terminated
  2) Все документы исследования в статусе approved

*/
import { NextRequest, NextResponse } from 'next/server';
import { getPool, DB_INITIALIZED } from '@/lib/db/index';
import { ensureTablesExist } from '@/lib/db/document';
import { AuditService } from '@/lib/audit/audit.service';
import { logger } from '@/lib/utils/logger';

// Получить документы исследования для проверки перед архивацией
export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams;
  const study_id = searchParams.get('study_id');

  if (!study_id) {
    return NextResponse.json(
      { error: 'study_id is required' },
      { status: 400 }
    );
  }

  const client = getPool();

  try {
    if (!DB_INITIALIZED) {
      await ensureTablesExist();
    }

    // Получаем все документы исследования с их статусами (включая удаленные)
    const { rows: documents } = await client.query(`
      SELECT
        d.id,
        d.study_id,
        d.site_id,
        d.folder_id,
        d.folder_name,
        d.is_archived,
        d.is_deleted,
        d.created_at,
        dv.review_status,
        dv.document_name,
        dv.document_number
      FROM document d
      LEFT JOIN LATERAL (
        SELECT review_status, document_name, document_number
        FROM document_version
        WHERE document_id = d.id
        ORDER BY document_number DESC
        LIMIT 1
      ) dv ON true
      WHERE d.study_id = $1
      ORDER BY d.created_at ASC
    `, [parseInt(study_id)]);

    // Преобразуем в формат Document
    const formattedDocuments = documents.map((doc: {
      id: string;
      study_id: number;
      site_id: string | null;
      folder_id: string;
      folder_name: string;
      is_archived: boolean;
      is_deleted: boolean;
      created_at: string;
      review_status: string | null;
      document_name: string;
      document_number: number;
    }) => {
      // Определяем статус документа
      let status = doc.review_status === 'approved' ? 'approved' :
                   doc.review_status === 'submitted' ? 'in_review' : 'draft';

      if (doc.is_archived) status = 'archived';
      if (doc.is_deleted) status = 'deleted';

      return {
        id: doc.id,
        study_id: doc.study_id,
        site_id: doc.site_id,
        folder_name: doc.folder_name,
        folder_id: doc.folder_id,
        tmf_zone: null,
        tmf_artifact: null,
        status,
        created_by: '',
        created_at: doc.created_at,
        is_deleted: doc.is_deleted,
        deleted_at: null,
        deleted_by: '',
        deletion_reason: '',
        restored_by: '',
        restored_at: '',
        is_archived: doc.is_archived,
        archived_at: null,
        archived_by: '',
        document_number: doc.document_number,
        document_name: doc.document_name,
        file_name: '',
        file_path: '',
        file_type: '',
        file_size: 0,
        checksum: '',
        current_version: null,
        version_id: null
      };
    });

    // Подсчитываем статистику
    const stats = {
      total: formattedDocuments.length,
      draft: formattedDocuments.filter((d: { status: string }) => d.status === 'draft').length,
      in_review: formattedDocuments.filter((d: { status: string }) => d.status === 'in_review').length,
      approved: formattedDocuments.filter((d: { status: string }) => d.status === 'approved').length,
      archived: formattedDocuments.filter((d: { status: string }) => d.status === 'archived').length,
      deleted: formattedDocuments.filter((d: { status: string }) => d.status === 'deleted').length
    };

    // canArchive: все активные документы (не удаленные) должны быть approved или archived
    const activeDocuments = stats.total - stats.deleted;
    const canArchive = (stats.approved + stats.archived) === activeDocuments && activeDocuments > 0;

    return NextResponse.json({
      documents: formattedDocuments,
      stats: {
        ...stats,
        draftPercent: stats.total > 0 ? (stats.draft / stats.total) * 100 : 0,
        inReviewPercent: stats.total > 0 ? (stats.in_review / stats.total) * 100 : 0,
        approvedPercent: stats.total > 0 ? (stats.approved / stats.total) * 100 : 0,
        archivedPercent: stats.total > 0 ? (stats.archived / stats.total) * 100 : 0,
        deletedPercent: stats.total > 0 ? (stats.deleted / stats.total) * 100 : 0,
        canArchive
      }
    });

  } catch (error) {
    logger.error('Error fetching documents for archivation:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

// Архивировать все одобренные документы исследования
export async function POST(request: NextRequest) {
  const pool = getPool();
  const client = await pool.connect(); // Берем клиент из пула для транзакции

  try {
    const body = await request.json();
    const { study_id } = body;
    
    // Используем данные из заголовков (извлеченные через middleware/service)
    // Это надежнее, чем верить ID из body.
    const user = AuditService.getUserFromRequest(request); 
    const metadata = AuditService.extractMetadata(request);

    if (!study_id || !user.user_id) {
      return NextResponse.json({ error: 'Missing required data' }, { status: 400 });
    }

    await client.query('BEGIN'); // Начало транзакции

    // 1. Находим документы, которые нужно архивировать
    const { rows: toArchive } = await client.query(`
      SELECT d.id, d.site_id, d.study_id
      FROM document d
      LEFT JOIN LATERAL (
        SELECT review_status FROM document_version
        WHERE document_id = d.id ORDER BY document_number DESC LIMIT 1
      ) dv ON true
      WHERE d.study_id = $1 AND d.is_deleted = false 
        AND d.is_archived = false AND dv.review_status = 'approved'
      FOR UPDATE; -- Блокируем строки от изменений другими процессами
    `, [parseInt(study_id)]);

    if (toArchive.length === 0) {
      await client.query('ROLLBACK');
      return NextResponse.json({ message: 'No documents to archive', count: 0 });
    }

    const ids = toArchive.map(d => d.id);
    const now = new Date().toISOString();

    // 2. Обновляем все документы одним запросом
    const { rows: updatedDocs } = await client.query(`
      UPDATE document
      SET is_archived = true, archived_at = $2, archived_by = $3
      WHERE id = ANY($1)
      RETURNING id, site_id, study_id, archived_at
    `, [ids, now, user.user_id]);

    // 3. Формируем массив записей для аудита
    const auditEntries = updatedDocs.map(doc => ({
      ...metadata,
      user_id: user.user_id,
      user_email: user.user_email,
      user_role: user.user_role,
      action: 'UPDATE' as const,
      entity_type: 'document' as const,
      entity_id: doc.id,
      old_value: { is_archived: false },
      new_value: { 
        is_archived: true, 
        archived_at: doc.archived_at,
        archived_by: doc.archived_by,
      },
      status: 'SUCCESS' as const,
      site_id: doc.site_id,
      study_id: doc.study_id,
      
    }));

    // 4. Пишем весь аудит в той же транзакции
    await AuditService.bulkLog(client, auditEntries);

    await client.query('COMMIT'); // Фиксируем изменения

    return NextResponse.json({
      message: 'Successfully archived',
      archived_count: updatedDocs.length
    });

  } catch (error) {
    await client.query('ROLLBACK'); // Откатываем всё при любой ошибке
    logger.error('Archivation failed:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  } finally {
    client.release(); // Возвращаем клиента в пул
  }
}