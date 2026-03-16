// app/api/documents/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { getPool } from '@/lib/db/index';
import { v4 as uuidv4 } from 'uuid';
import { DocumentLifeCycleStatus } from '@/types/document.status';
import { ensureTablesExist } from '@/lib/db/document';

// Проверки существования таблиц выключены
const isDbInitialized = true;


// Получение документов при просмотре содержимого папки
export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams;
  const study_id = searchParams.get('study_id');
  const site_id = searchParams.get('site_id');
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
    if (!isDbInitialized) {
      await ensureTablesExist();
    }

    // Подготовка фильтра site_id
    const queryParams: any[] = [parseInt(study_id), folder_id];
    let siteCondition = site_id ? `AND d.site_id = $3` : `AND d.site_id IS NULL`;
    if (site_id) queryParams.push(parseInt(site_id));

    // Единый запрос с агрегацией JSON
    const { rows: documents } = await client.query(`
      SELECT 
        d.*,
        -- Информация о создателе
        json_build_object('id', uc.id, 'name', uc.name, 'email', uc.email) as creator,
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
      WHERE d.study_id = $1 AND d.folder_id = $2 ${siteCondition}
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
        // Очищаем служебное поле из SQL-запроса
        all_versions: undefined 
      }

      return docObject;
    });

    return NextResponse.json({
      documents: formattedDocuments,
      count: formattedDocuments.length
    });

  } catch (error) {
    console.error('Error fetching documents:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  } 
}

// Создание документа
export async function POST(request: NextRequest) {
  const client = getPool();
  
  try {
    // Убеждаемся что таблицы существуют
    if (isDbInitialized) {
      await ensureTablesExist();
    }
   

    const body = await request.json();
    const { 
      study_id, 
      site_id, 
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
        id, study_id, site_id, folder_id, folder_name, 
        tmf_zone, tmf_artifact, created_by,
        is_deleted, is_archived
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, false, false)
      RETURNING *
    `, [
      documentId, 
      parseInt(study_id), 
      normalizedSiteId,
      folder_id, 
      folder_name, 
      tmf_zone || null, 
      tmf_artifact || null, 
      created_by
    ]);

    return NextResponse.json(newDocument, { status: 201 });

  } catch (error) {
    console.error('Error creating document:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}