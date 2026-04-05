// app/api/documents/stats/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { getPool, DB_INITIALIZED } from '@/lib/db/index';
import { ensureTablesExist } from '@/lib/db/document';
import { logger } from '@/lib/logger';
import { applyRateLimit, RATE_LIMIT_PRESETS } from '@/lib/rate-limit-wrapper';

// Получить статистику документов по исследованию (независимо от статуса исследования)
export async function GET(request: NextRequest) {
  return applyRateLimit(RATE_LIMIT_PRESETS.documentApi, request, async () => {
    return handleGetStats(request);
  });
}

async function handleGetStats(request: NextRequest) {
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

    // Получаем все документы исследования с их статусами (включая удаленные и архивированные)
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

    // Определяем статус каждого документа
    const documentStats = documents.map((doc: {
      id: string;
      is_archived: boolean;
      is_deleted: boolean;
      review_status: string | null;
    }) => {
      let status = 'draft';
      
      if (doc.is_deleted) {
        status = 'deleted';
      } else if (doc.is_archived) {
        status = 'archived';
      } else if (doc.review_status === 'approved') {
        status = 'approved';
      } else if (doc.review_status === 'submitted') {
        status = 'in_review';
      }
      
      return status;
    });

    // Подсчитываем статистику
    const stats = {
      total: documentStats.length,
      draft: documentStats.filter(s => s === 'draft').length,
      in_review: documentStats.filter(s => s === 'in_review').length,
      approved: documentStats.filter(s => s === 'approved').length,
      archived: documentStats.filter(s => s === 'archived').length,
      deleted: documentStats.filter(s => s === 'deleted').length
    };

    // Вычисляем проценты
    const draftPercent = stats.total > 0 ? (stats.draft / stats.total) * 100 : 0;
    const inReviewPercent = stats.total > 0 ? (stats.in_review / stats.total) * 100 : 0;
    const approvedPercent = stats.total > 0 ? (stats.approved / stats.total) * 100 : 0;
    const archivedPercent = stats.total > 0 ? (stats.archived / stats.total) * 100 : 0;
    const deletedPercent = stats.total > 0 ? (stats.deleted / stats.total) * 100 : 0;

    // canArchive: все активные документы (не удаленные) должны быть approved или archived
    const activeDocuments = stats.total - stats.deleted;
    const canArchive = (stats.approved + stats.archived) === activeDocuments && activeDocuments > 0;

    return NextResponse.json({
      stats: {
        ...stats,
        draftPercent,
        inReviewPercent,
        approvedPercent,
        archivedPercent,
        deletedPercent,
        canArchive
      }
    });

  } catch (error) {
    logger.error('Error fetching document stats:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
