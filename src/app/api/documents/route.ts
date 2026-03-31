// app/api/documents/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { getPool, DB_INITIALIZED } from '@/lib/db/index';
import { v4 as uuidv4 } from 'uuid';
import { DocumentLifeCycleStatus } from '@/types/document.status';
import { logger } from '@/lib/logger';
import { ensureTablesExist } from '@/lib/db/document';
import { applyRateLimit, RATE_LIMIT_PRESETS } from '@/lib/rate-limit-wrapper';


// Получение документов при просмотре содержимого папки
export async function GET(request: NextRequest) {
  return applyRateLimit(RATE_LIMIT_PRESETS.documentApi, request, async () => {
    return handleGetDocuments(request);
  });
}

async function handleGetDocuments(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams;
  const study_id = searchParams.get('study_id');
  const site_id = searchParams.get('site_id');
  const country = searchParams.get('country');
  const folder_id = searchParams.get('folder_id');
  const include_deleted = searchParams.get('include_deleted') === 'true';
  const include_archived = searchParams.get('include_archived') === 'true';
  
  // Валидация обязательных параметров
  if (!study_id) {
    return NextResponse.json(
      { error: 'study_id is required' },
      { status: 400 }
    );
  }

  if (!folder_id) {
    return NextResponse.json(
      { error: 'folder_id is required' },
      { status: 400 }
    );
  }

  const client = getPool();
  
  try {
    // Проверяем и создаем таблицы если их нет
    if (!DB_INITIALIZED) {
      await ensureTablesExist();
    }

    // Подготовка фильтра site_id или country
    const queryParams: any[] = [parseInt(study_id), folder_id];
    let siteOrCountryCondition = '';
    
    if (site_id) {
      siteOrCountryCondition = `AND d.site_id = $3`;
      queryParams.push(parseInt(site_id));
    } else if (country) {
      siteOrCountryCondition = `AND d.country = $3`;
      queryParams.push(country);
    } else {
      siteOrCountryCondition = `AND d.site_id IS NULL AND d.country IS NULL`;
    }

    // Единый запрос с агрегацией JSON
    const { rows: documents } = await client.query(`
      SELECT 
        d.*,
        -- Информация о создателе
        json_build_object('id', uc.id, 'name', uc.name, 'email', uc.email) as creator,
        -- Информация об удалившем (если документ удален)
        CASE 
          WHEN d.is_deleted = true AND d.deleted_by IS NOT NULL THEN
            json_build_object('id', del.id, 'name', del.name, 'email', del.email, 'role', del.role)
          ELSE
            NULL
        END as deleter_info,
        -- Информация о восстановившем документ (если документ восстановлен)
        CASE 
          WHEN d.restored_by IS NOT NULL THEN
            json_build_object('id', restore.id, 'name', restore.name, 'email', restore.email, 'role', restore.role)
          ELSE
            NULL
        END as restorer_info,        
        -- Информация об архивировавшем (если документ архивирован)
        CASE 
          WHEN d.is_archived = true AND d.archived_by IS NOT NULL THEN
            json_build_object('id', arch.id, 'name', arch.name, 'email', arch.email, 'role', arch.role)
          ELSE
            NULL
        END as archiver_info,
        -- Информация об разархивировавшем (если документ разархивирован)
        CASE 
          WHEN d.unarchived_by IS NOT NULL THEN
            json_build_object('id', unarch.id, 'name', unarch.name, 'email', unarch.email, 'role', unarch.role)
          ELSE
            NULL
        END as unarchiver_info,              
        -- Агрегация всех версий в массив объектов
        (
          SELECT jsonb_agg(v_info)
          FROM (
            SELECT 
              dv.*,
              json_build_object('id', u.id, 'name', u.name, 'email', u.email) as uploader,
              json_build_object('id', r.id, 'name', r.name, 'email', r.email, 'role', r.role) as review_submitter,
              json_build_object('id', a.id, 'name', a.name, 'email', a.email) as approver,
              json_build_object('id', asg.id, 'name', asg.name, 'email', asg.email) as assigned_reviewer
            FROM document_version dv
            LEFT JOIN users u ON dv.uploaded_by = u.id
            LEFT JOIN users r ON dv.review_submitted_by = r.id
            LEFT JOIN users a ON dv.reviewed_by = a.id
            LEFT JOIN users asg ON dv.review_submitted_to = asg.id
            WHERE dv.document_id = d.id
            ORDER BY dv.document_number DESC
          ) v_info
        ) as all_versions
      FROM document d
      LEFT JOIN users uc ON d.created_by = uc.id
      LEFT JOIN users del ON d.deleted_by = del.id  -- Добавлен LEFT JOIN для информации об удалившем
      LEFT JOIN users restore ON d.restored_by = restore.id  -- Добавлен LEFT JOIN для информации о восстановившем
      LEFT JOIN users arch ON d.archived_by = arch.id  -- JOIN для информации об архивировавшем
      LEFT JOIN users unarch ON d.unarchived_by = unarch.id  -- JOIN для информации об разархивировавшем
      WHERE d.study_id = $1 AND d.folder_id = $2 ${siteOrCountryCondition}
        AND (${include_deleted ? 'TRUE' : 'd.is_deleted = false'})
        AND (${include_archived ? 'TRUE' : '(d.is_archived = false OR d.is_archived IS NULL)'})
      ORDER BY d.created_at DESC
    `, queryParams);

    // трансформация данных
    const formattedDocuments = documents.map(doc => {
      const versions = doc.all_versions || [];
      const latest = versions[0] || {};
      
      // Определяем статус
      let status = latest.review_status === 'approved' ? 'approved' : 
                  latest.review_status === 'submitted' ? 'in_review' : 'draft';
      
      if (doc.is_archived) status = DocumentLifeCycleStatus.ARCHIVED;
      if (doc.is_deleted) status = DocumentLifeCycleStatus.DELETED;

      const docObject = {
        ...doc,
        versions,
        current_version: latest,
        status,
        total_versions: versions.length,
        document_name: latest.document_name,
        document_number: latest.document_number,
        // Добавляем информацию об удалившем только если документ удален
        ...(doc.is_deleted && doc.deleter_info ? {
          deleted_by_info: {
            name: doc.deleter_info.name,
            email: doc.deleter_info.email,
            role: String(doc.deleter_info.role),
            deleted_at: doc.deleted_at // предполагается, что есть поле deleted_at
          }
        } : {}),
        // Добавляем информацию о восстановившем
        ...(doc.restore_by && doc.restorer_info ? {
          restored_by_info: {
            name: doc.restorer_info.name,
            email: doc.restorer_info.email,
            role: String(doc.restorer_info.role),
          }
        } : {}),
        // Добавляем информацию об архивировавшем только если документ архивирован
        ...(doc.is_archived && doc.archiver_info ? {
          archived_by_info: {
            name: doc.archiver_info.name,
            email: doc.archiver_info.email,
            role: String(doc.archiver_info.role),
            archived_at: doc.archived_at
          }
        } : {}),
        // Добавляем информацию о разархивировавшем только если документ разархивирован
        ...(doc.unarchived_by && doc.unarchiver_info ? {
          unarchived_by_info: {
            name: doc.unarchiver_info.name,
            email: doc.unarchiver_info.email,
            role: String(doc.unarchiver_info.role),
          }
        } : {}),
        // Очищаем служебные поля из SQL-запроса
        all_versions: undefined,
        deleter_info: undefined,
        archiver_info: undefined
      }

      return docObject;
    });

    return NextResponse.json({
      documents: formattedDocuments,
      count: formattedDocuments.length
    });

  } catch (error) {
    logger.error('Error fetching documents', error instanceof Error ? error : null);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

// Создание документа
export async function POST(request: NextRequest) {
  return applyRateLimit(RATE_LIMIT_PRESETS.documentApi, request, async () => {
    return handlePostDocument(request);
  });
}

async function handlePostDocument(request: NextRequest) {
  const client = getPool();
  
  try {
    
    if (DB_INITIALIZED) {
      // Убеждаемся что таблицы существуют
      await ensureTablesExist();
    }
   

    const body = await request.json();
    const { 
      study_id,
      site_id, 
      country,
      folder_id, 
      folder_name, 
      tmf_zone, 
      tmf_artifact, 
      created_by 
    } = body;

    // Валидация обязательных полей
    if (!study_id || !folder_id || !folder_name || !created_by) {
      return NextResponse.json(
        { error: 'Missing required fields: site_id, folder_id, folder_name, created_by' },
        { status: 400 }
      );
    }

    const normalizedSiteId = (
      site_id === 'undefined' || 
      site_id === 'null' || 
      site_id === undefined || 
      site_id === null
    ) ? null : site_id;    

    const documentId = uuidv4();

    const { rows: [newDocument] } = await client.query(`
      INSERT INTO document (
        id, study_id, site_id, country, folder_id, folder_name, 
        tmf_zone, tmf_artifact, created_by,
        is_deleted, is_archived
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, false, false)
      RETURNING *
    `, [
      documentId, 
      parseInt(study_id), 
      normalizedSiteId,
      country || null,
      folder_id, 
      folder_name, 
      tmf_zone || null, 
      tmf_artifact || null, 
      created_by
    ]);

    return NextResponse.json(newDocument, { status: 201 });

  } catch (error) {
    logger.error('Error creating document', error instanceof Error ? error : null);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}