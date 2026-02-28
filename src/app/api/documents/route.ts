// // app/api/documents/route.ts
// import { NextRequest, NextResponse } from 'next/server';
// import { connectDB, createTable } from '@/lib/db/index';
// import { Tables } from '@/lib/db/schema';
// import { v4 as uuidv4 } from 'uuid';

// // Получение документов при просмотре содержимого папки
// export async function GET(request: NextRequest) {
//   const searchParams = request.nextUrl.searchParams;
//   const study_id = searchParams.get('study_id');
//   const site_id = searchParams.get('site_id');
//   const folder_id = searchParams.get('folder_id');
//   const include_deleted = searchParams.get('include_deleted') === 'true';
  
//   // Валидация обязательных параметров
//   if (!study_id) {
//     return NextResponse.json(
//       { error: 'study_id is required' },
//       { status: 400 }
//     );
//   }

//   if (!site_id) {
//     return NextResponse.json(
//       { error: 'site_id is required' },
//       { status: 400 }
//     );
//   }

//   if (!folder_id) {
//     return NextResponse.json(
//       { error: 'folder_id is required' },
//       { status: 400 }
//     );
//   }

//   const client = await connectDB();
  
//   try {
//     // Проверяем и создаем таблицы если их нет
//     await ensureTablesExist();

//     // Получаем документы с их последними версиями и информацией о пользователях
//   const { rows: documents } = await client.query(`
//     WITH latest_versions AS (
//       SELECT DISTINCT ON (dv.document_id)
//         dv.document_id,
//         dv.id as version_id,
//         dv.document_number,
//         dv.document_name,
//         dv.file_name,
//         dv.file_path,
//         dv.file_type,
//         dv.file_size,
//         dv.checksum,
//         dv.uploaded_by,
//         dv.uploaded_at,
//         dv.change_reason,
//         dv.review_status,
//         dv.review_submitted_by,
//         dv.review_submitted_at,
//         dv.review_submitted_to,
//         dv.reviewed_by,
//         dv.reviewed_at,
//         dv.review_comment,

//         -- Определяем статус документа на основе review_status
//         CASE 
//           WHEN dv.review_status = 'approved' THEN 'approved'
//           WHEN dv.review_status = 'rejected' THEN 'draft'
//           WHEN dv.review_status = 'submitted' THEN 'in_review'
//           ELSE 'draft'
//         END as document_status,
//         -- Информация о загрузившем версию
//         uploader.id as uploader_id,
//         uploader.name as uploader_name,
//         uploader.email as uploader_email,
//         uploader.role as uploader_role,
//         -- Информация о ревьюере
//         reviewer.id as reviewer_id,
//         reviewer.name as reviewer_name,
//         reviewer.email as reviewer_email,
//         -- Информация об утверждающем
//         approver.id as approver_id,
//         approver.name as approver_name,
//         approver.email as approver_email
//       FROM document_version dv
//       LEFT JOIN users uploader ON dv.uploaded_by = uploader.id
//       LEFT JOIN users reviewer ON dv.review_submitted_by = reviewer.id
//       LEFT JOIN users approver ON dv.reviewed_by = approver.id
//       ORDER BY dv.document_id, dv.document_number DESC
//     )
//     SELECT 
//       d.*,
//       -- Статус документа из последней версии
//       lv.document_status,
//       lv.review_status,
//       lv.version_id,
//       lv.document_number,
//       lv.document_name,
//       lv.file_name,
//       lv.file_path,
//       lv.file_type,
//       lv.file_size,
//       lv.checksum,
//       lv.uploaded_by as last_uploaded_by,
//       lv.uploaded_at as last_uploaded_at,
//       lv.change_reason as last_change_reason,
//       lv.review_submitted_at,
//       lv.reviewed_at,
//       lv.review_comment,
//       -- Информация о загрузившем последнюю версию
//       lv.uploader_id as last_uploader_id,
//       lv.uploader_name as last_uploader_name,
//       lv.uploader_email as last_uploader_email,
//       -- Информация о ревьюере
//       lv.reviewer_id,
//       lv.reviewer_name,
//       lv.reviewer_email,
//       -- Информация об утверждающем
//       lv.approver_id,
//       lv.approver_name,
//       lv.approver_email,
//       -- Информация о том, кому отправлено на ревью
//       assigned.id as assigned_reviewer_id,
//       assigned.name as assigned_reviewer_name,
//       assigned.email as assigned_reviewer_email,
//       -- ДОБАВЛЯЕМ ИНФОРМАЦИЮ О СОЗДАТЕЛЕ
//       creator.id as creator_id,
//       creator.name as creator_name,
//       creator.email as creator_email,
//       creator.role as creator_role,      
//       CASE 
//         WHEN lv.version_id IS NOT NULL THEN json_build_object(
//           'id', lv.version_id,
//           'document_number', lv.document_number,
//           'document_name', lv.document_name,
//           'file_name', lv.file_name,
//           'file_path', lv.file_path,
//           'file_type', lv.file_type,
//           'file_size', lv.file_size,
//           'checksum', lv.checksum,
//           'uploaded_by', lv.uploaded_by,
//           'uploaded_at', lv.uploaded_at,
//           'change_reason', lv.change_reason,
//           'review_status', lv.review_status,
//           'review_submitted_by', lv.reviewer_id,
//           'review_submitted_at', lv.review_submitted_at,
//           'review_submitted_to', lv.review_submitted_to,
//           'reviewed_by', lv.approver_id,
//           'reviewed_at', lv.reviewed_at,
//           'review_comment', lv.review_comment,
//           'uploader', json_build_object(
//             'id', lv.uploader_id,
//             'name', lv.uploader_name,
//             'email', lv.uploader_email
//           )
//         )
//         ELSE NULL
//       END as latest_version
//     FROM document d
//     LEFT JOIN users creator ON d.created_by = creator.id
//     LEFT JOIN latest_versions lv ON d.id = lv.document_id
//     LEFT JOIN users assigned ON lv.review_submitted_to = assigned.id
//     WHERE 
//       d.study_id = $1 AND
//       d.site_id = $2 AND
//       d.folder_id = $3 AND
//       (${include_deleted ? 'TRUE' : 'd.is_deleted = false'})
//     ORDER BY d.created_at DESC
//   `, [parseInt(study_id), parseInt(site_id), folder_id]);
  
//     // Получаем все версии для каждого документа с информацией о пользователях
//     const documentsWithVersions = await Promise.all(
//       documents.map(async (doc) => {
//         const { rows: versions } = await client.query(`
//           SELECT 
//             dv.id,
//             dv.document_number,
//             dv.document_name,
//             dv.file_name,
//             dv.file_path,
//             dv.file_type,
//             dv.file_size,
//             dv.checksum,
//             dv.uploaded_by,
//             dv.uploaded_at,
//             dv.change_reason,
//             dv.review_status,
//             dv.review_submitted_by,
//             dv.review_submitted_at,
//             dv.review_submitted_to,
//             dv.reviewed_by,
//             dv.reviewed_at,
//             dv.review_comment,
//             -- Информация о загрузившем версию
//             uploader.id as uploader_id,
//             uploader.name as uploader_name,
//             uploader.email as uploader_email,
//             -- Информация о ревьюере
//             reviewer.id as reviewer_id,
//             reviewer.name as reviewer_name,
//             reviewer.email as reviewer_email,
//             -- Информация об утверждающем
//             approver.id as approver_id,
//             approver.name as approver_name,
//             approver.email as approver_email,
//             -- Информация о том, кому назначено ревью
//             assigned.id as assigned_reviewer_id,
//             assigned.name as assigned_reviewer_name,
//             assigned.email as assigned_reviewer_email
//           FROM document_version dv
//           LEFT JOIN users uploader ON dv.uploaded_by = uploader.id
//           LEFT JOIN users reviewer ON dv.review_submitted_by = reviewer.id
//           LEFT JOIN users approver ON dv.reviewed_by = approver.id
//           LEFT JOIN users assigned ON dv.review_submitted_to = assigned.id
//           WHERE dv.document_id = $1
//           ORDER BY dv.document_number DESC
//         `, [doc.id]);

//         // Форматируем версии с пользовательскими данными
//         const formattedVersions = versions.map(v => ({
//           id: v.id,
//           document_number: v.document_number,
//           document_name: v.document_name,
//           file_name: v.file_name,
//           file_path: v.file_path,
//           file_type: v.file_type,
//           file_size: v.file_size,
//           checksum: v.checksum,
//           uploaded_by: v.uploaded_by,
//           uploaded_at: v.uploaded_at,
//           change_reason: v.change_reason,
//           review_status: v.review_status,
//           review_submitted_at: v.review_submitted_at,
//           reviewed_at: v.reviewed_at,
//           review_comment: v.review_comment,
//           uploader: v.uploader_id ? {
//             id: v.uploader_id,
//             name: v.uploader_name,
//             email: v.uploader_email
//           } : null,
//           reviewer: v.reviewer_id ? {
//             id: v.reviewer_id,
//             name: v.reviewer_name,
//             email: v.reviewer_email
//           } : null,
//           approver: v.approver_id ? {
//             id: v.approver_id,
//             name: v.approver_name,
//             email: v.approver_email
//           } : null,
//           assigned_reviewer: v.assigned_reviewer_id ? {
//             id: v.assigned_reviewer_id,
//             name: v.assigned_reviewer_name,
//             email: v.assigned_reviewer_email
//           } : null
//         }));

//         return {
//           // Основные поля документа
//           id: doc.id,
//           study_id: doc.study_id,
//           site_id: doc.site_id,
//           folder_id: doc.folder_id,
//           folder_name: doc.folder_name,
//           tmf_zone: doc.tmf_zone,
//           tmf_artifact: doc.tmf_artifact,
//           current_version_id: doc.current_version_id,
//           created_at: doc.created_at,
//           is_deleted: doc.is_deleted,
//           deleted_at: doc.deleted_at,
          
//           // Информация о создателе
//           created_by: doc.created_by,
//           creator: doc.creator_id ? {
//             id: doc.creator_id,
//             name: doc.creator_name,
//             email: doc.creator_email,
//             role: doc.creator_role
//           } : null,
          
//           // Информация об удалившем
//           deleted_by: doc.deleted_by,
//           deleter: doc.deleter_id ? {
//             id: doc.deleter_id,
//             name: doc.deleter_name,
//             email: doc.deleter_email
//           } : null,
          
//           // Информация о восстановившем
//           restored_by: doc.restored_by,
//           restorer: doc.restorer_id ? {
//             id: doc.restorer_id,
//             name: doc.restorer_name,
//             email: doc.restorer_email
//           } : null,
          
//           // Текущая версия и статус
//           current_version: doc.latest_version,
//           status: doc.document_status || 'draft',
          
//           // Поля последней версии (для обратной совместимости)
//           document_number: doc.document_number,
//           document_name: doc.document_name,
//           file_name: doc.file_name,
//           file_path: doc.file_path,
//           file_type: doc.file_type,
//           file_size: doc.file_size,
//           checksum: doc.checksum,
//           last_uploaded_by: doc.last_uploaded_by,
//           last_uploaded_at: doc.last_uploaded_at,
//           last_change_reason: doc.last_change_reason,
          
//           // Информация о последнем загрузившем
//           last_uploader: doc.last_uploader_id ? {
//             id: doc.last_uploader_id,
//             name: doc.last_uploader_name,
//             email: doc.last_uploader_email
//           } : null,
          
//           // Статус ревью
//           review_status: doc.review_status,
//           review_submitted_at: doc.review_submitted_at,
//           reviewed_at: doc.reviewed_at,
//           review_comment: doc.review_comment,
          
//           // Информация о ревьюере
//           reviewer: doc.reviewer_id ? {
//             id: doc.reviewer_id,
//             name: doc.reviewer_name,
//             email: doc.reviewer_email
//           } : null,
          
//           // Информация об утверждающем
//           approver: doc.approver_id ? {
//             id: doc.approver_id,
//             name: doc.approver_name,
//             email: doc.approver_email
//           } : null,
          
//           // Информация о назначенном ревьюере
//           assigned_reviewer: doc.assigned_reviewer_id ? {
//             id: doc.assigned_reviewer_id,
//             name: doc.assigned_reviewer_name,
//             email: doc.assigned_reviewer_email
//           } : null,
          
//           // Все версии
//           versions: formattedVersions,
//           total_versions: formattedVersions.length
//         };
//       })
//     );

//     return NextResponse.json({
//       documents: documentsWithVersions,
//       count: documentsWithVersions.length,
//       filters: {
//         study_id: parseInt(study_id),
//         site_id: parseInt(site_id),
//         folder_id,
//         include_deleted
//       }
//     });

//   } catch (error) {
//     console.error('Error fetching documents:', error);
//     return NextResponse.json(
//       { error: 'Internal server error' },
//       { status: 500 }
//     );
//   } finally {
//     client.release();
//   }
// }

// async function ensureTablesExist() {
//   try {
//     // Создаем таблицу document если её нет
//     // Document version создастся автоматически - см. createTable
//     await createTable(Tables.DOCUMENT);
//     console.log('Table "document" ensured');

//     // Дополнительно: создаем индексы и триггеры после создания таблиц
//     await ensureIndexesAndTriggers();

//   } catch (error) {
//     console.error('Error ensuring tables exist:', error);
//     throw error;
//   }
// }

// async function ensureIndexesAndTriggers() {
//   const client = await connectDB();
  
//   try {
//     // Проверяем существование индексов для document таблицы
//     await client.query(`
//       CREATE INDEX IF NOT EXISTS idx_document_study_id ON document(study_id);
//       CREATE INDEX IF NOT EXISTS idx_document_site_id ON document(site_id);
//       CREATE INDEX IF NOT EXISTS idx_document_folder_id ON document(folder_id);
//       CREATE INDEX IF NOT EXISTS idx_document_is_deleted ON document(is_deleted);
//       CREATE INDEX IF NOT EXISTS idx_document_created_at ON document(created_at);
//     `);

//     // Проверяем существование индексов для document_version таблицы
//     await client.query(`
//       CREATE INDEX IF NOT EXISTS idx_document_version_document_id ON document_version(document_id);
//       CREATE INDEX IF NOT EXISTS idx_document_version_number ON document_version(document_number);
//       CREATE INDEX IF NOT EXISTS idx_document_version_uploaded_at ON document_version(uploaded_at);
//     `);

//     // Создаем функцию для автоматического обновления current_version_id если её нет
//     await client.query(`
//       CREATE OR REPLACE FUNCTION update_document_current_version()
//       RETURNS TRIGGER AS $$
//       BEGIN
//         UPDATE document 
//         SET current_version_id = NEW.id
//         WHERE id = NEW.document_id;
//         RETURN NEW;
//       END;
//       $$ LANGUAGE plpgsql;
//     `);

//     // Проверяем существование триггера и создаем если его нет
//     const { rows: triggerExists } = await client.query(`
//       SELECT EXISTS (
//         SELECT 1 FROM pg_trigger 
//         WHERE tgname = 'trigger_update_document_current_version'
//       );
//     `);

//     if (!triggerExists[0].exists) {
//       await client.query(`
//         CREATE TRIGGER trigger_update_document_current_version
//           AFTER INSERT ON document_version
//           FOR EACH ROW
//           EXECUTE FUNCTION update_document_current_version();
//       `);
//       console.log('Trigger "trigger_update_document_current_version" created');
//     }

//   } catch (error) {
//     console.error('Error ensuring indexes and triggers:', error);
//     throw error;
//   } finally {
//     client.release();
//   }
// }

// // Создание документа
// export async function POST(request: NextRequest) {
//   const client = await connectDB();
  
//   try {
//     // Убеждаемся что таблицы существуют
//     await ensureTablesExist();

//     const body = await request.json();
//     const { 
//       study_id, 
//       site_id, 
//       folder_id, 
//       folder_name, 
//       tmf_zone, 
//       tmf_artifact, 
//       status = 'draft',
//       created_by 
//     } = body;

//     // Валидация обязательных полей
//     if (!study_id || !site_id || !folder_id || !folder_name || !created_by) {
//       return NextResponse.json(
//         { error: 'Missing required fields: study_id, site_id, folder_id, folder_name, created_by' },
//         { status: 400 }
//       );
//     }

//     const documentId = uuidv4();

//     const { rows: [newDocument] } = await client.query(`
//       INSERT INTO document (
//         id, study_id, site_id, folder_id, folder_name, 
//         tmf_zone, tmf_artifact, status, created_by
//       ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
//       RETURNING *
//     `, [
//       documentId, 
//       parseInt(study_id), 
//       parseInt(site_id), 
//       folder_id, 
//       folder_name, 
//       tmf_zone || null, 
//       tmf_artifact || null, 
//       status, 
//       created_by
//     ]);

//     return NextResponse.json(newDocument, { status: 201 });

//   } catch (error) {
//     console.error('Error creating document:', error);
//     return NextResponse.json(
//       { error: 'Internal server error' },
//       { status: 500 }
//     );
//   } finally {
//     client.release();
//   }
// }

// // Опционально: DELETE метод для мягкого удаления
// export async function DELETE(request: NextRequest) {
//   const searchParams = request.nextUrl.searchParams;
//   const document_id = searchParams.get('id');

//   if (!document_id) {
//     return NextResponse.json(
//       { error: 'document_id is required' },
//       { status: 400 }
//     );
//   }

//   const client = await connectDB();
  
//   try {
//     const { rowCount } = await client.query(`
//       UPDATE document 
//       SET is_deleted = true 
//       WHERE id = $1
//     `, [document_id]);

//     if (rowCount === 0) {
//       return NextResponse.json(
//         { error: 'Document not found' },
//         { status: 404 }
//       );
//     }

//     return NextResponse.json({ 
//       message: 'Document soft deleted successfully',
//       id: document_id 
//     });

//   } catch (error) {
//     console.error('Error deleting document:', error);
//     return NextResponse.json(
//       { error: 'Internal server error' },
//       { status: 500 }
//     );
//   } finally {
//     client.release();
//   }
// }

// app/api/documents/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { connectDB, createTable } from '@/lib/db/index';
import { Tables } from '@/lib/db/schema';
import { v4 as uuidv4 } from 'uuid';
import { DocumentLifeCycleStatus } from '@/types/document';

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

  if (!site_id) {
    return NextResponse.json(
      { error: 'site_id is required' },
      { status: 400 }
    );
  }

  if (!folder_id) {
    return NextResponse.json(
      { error: 'folder_id is required' },
      { status: 400 }
    );
  }

  const client = await connectDB();
  
  try {
    // Проверяем и создаем таблицы если их нет
    await ensureTablesExist();

    // Получаем документы с их последними версиями и информацией о пользователях
    const { rows: documents } = await client.query(`
      WITH latest_versions AS (
        SELECT DISTINCT ON (dv.document_id)
          dv.document_id,
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
          dv.review_submitted_by,
          dv.review_submitted_at,
          dv.review_submitted_to,
          dv.reviewed_by,
          dv.reviewed_at,
          dv.review_comment,
          -- Определяем статус документа на основе review_status
          CASE 
            WHEN dv.review_status = 'approved' THEN 'approved'
            WHEN dv.review_status = 'rejected' THEN 'draft'
            WHEN dv.review_status = 'submitted' THEN 'in_review'
            ELSE 'draft'
          END as document_status,
          -- Информация о загрузившем версию
          uploader.id as uploader_id,
          uploader.name as uploader_name,
          uploader.email as uploader_email,
          uploader.role as uploader_role,
          -- Информация о ревьюере
          reviewer.id as reviewer_id,
          reviewer.name as reviewer_name,
          reviewer.email as reviewer_email,
          -- Информация об утверждающем
          approver.id as approver_id,
          approver.name as approver_name,
          approver.email as approver_email
        FROM document_version dv
        LEFT JOIN users uploader ON dv.uploaded_by = uploader.id
        LEFT JOIN users reviewer ON dv.review_submitted_by = reviewer.id
        LEFT JOIN users approver ON dv.reviewed_by = approver.id
        ORDER BY dv.document_id, dv.document_number DESC
      )
      SELECT 
        d.*,
        -- Статус документа из последней версии
        lv.document_status,
        lv.review_status,
        lv.version_id,
        lv.document_number,
        lv.document_name,
        lv.file_name,
        lv.file_path,
        lv.file_type,
        lv.file_size,
        lv.checksum,
        lv.uploaded_by as last_uploaded_by,
        lv.uploaded_at as last_uploaded_at,
        lv.change_reason as last_change_reason,
        lv.review_submitted_at,
        lv.reviewed_at,
        lv.review_comment,
        -- Информация о загрузившем последнюю версию
        lv.uploader_id as last_uploader_id,
        lv.uploader_name as last_uploader_name,
        lv.uploader_email as last_uploader_email,
        -- Информация о ревьюере
        lv.reviewer_id,
        lv.reviewer_name,
        lv.reviewer_email,
        -- Информация об утверждающем
        lv.approver_id,
        lv.approver_name,
        lv.approver_email,
        -- Информация о том, кому отправлено на ревью
        assigned.id as assigned_reviewer_id,
        assigned.name as assigned_reviewer_name,
        assigned.email as assigned_reviewer_email,
        -- Информация о создателе документа
        creator.id as creator_id,
        creator.name as creator_name,
        creator.email as creator_email,
        creator.role as creator_role,
        -- Информация об удалившем документ
        deleter.id as deleter_id,
        deleter.name as deleter_name,
        deleter.email as deleter_email,
        -- Информация о восстановившем документ
        restorer.id as restorer_id,
        restorer.name as restorer_name,
        restorer.email as restorer_email,
        -- Информация об архивировавшем документ
        archiver.id as archiver_id,
        archiver.name as archiver_name,
        archiver.email as archiver_email,
        CASE 
          WHEN lv.version_id IS NOT NULL THEN json_build_object(
            'id', lv.version_id,
            'document_number', lv.document_number,
            'document_name', lv.document_name,
            'file_name', lv.file_name,
            'file_path', lv.file_path,
            'file_type', lv.file_type,
            'file_size', lv.file_size,
            'checksum', lv.checksum,
            'uploaded_by', lv.uploaded_by,
            'uploaded_at', lv.uploaded_at,
            'change_reason', lv.change_reason,
            'review_status', lv.review_status,
            'review_submitted_by', lv.reviewer_id,
            'review_submitted_at', lv.review_submitted_at,
            'review_submitted_to', lv.review_submitted_to,
            'reviewed_by', lv.approver_id,
            'reviewed_at', lv.reviewed_at,
            'review_comment', lv.review_comment,
            'uploader', json_build_object(
              'id', lv.uploader_id,
              'name', lv.uploader_name,
              'email', lv.uploader_email
            )
          )
          ELSE NULL
        END as latest_version
      FROM document d
      LEFT JOIN users creator ON d.created_by = creator.id
      LEFT JOIN users deleter ON d.deleted_by = deleter.id
      LEFT JOIN users restorer ON d.restored_by = restorer.id
      LEFT JOIN users archiver ON d.archived_by = archiver.id
      LEFT JOIN latest_versions lv ON d.id = lv.document_id
      LEFT JOIN users assigned ON lv.review_submitted_to = assigned.id
      WHERE 
        d.study_id = $1 AND
        d.site_id = $2 AND
        d.folder_id = $3 AND
        (${include_deleted ? 'TRUE' : 'd.is_deleted = false'}) AND
        (${include_archived ? 'TRUE' : '(d.is_archived = false OR d.is_archived IS NULL)'})
      ORDER BY d.created_at DESC
    `, [parseInt(study_id), parseInt(site_id), folder_id]);
  
    // Получаем все версии для каждого документа с информацией о пользователях
    const documentsWithVersions = await Promise.all(
      documents.map(async (doc) => {
        const { rows: versions } = await client.query(`
          SELECT 
            dv.id,
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
            dv.review_submitted_by,
            dv.review_submitted_at,
            dv.review_submitted_to,
            dv.reviewed_by,
            dv.reviewed_at,
            dv.review_comment,
            -- Информация о загрузившем версию
            uploader.id as uploader_id,
            uploader.name as uploader_name,
            uploader.email as uploader_email,
            -- Информация о ревьюере
            reviewer.id as reviewer_id,
            reviewer.name as reviewer_name,
            reviewer.email as reviewer_email,
            -- Информация об утверждающем
            approver.id as approver_id,
            approver.name as approver_name,
            approver.email as approver_email,
            -- Информация о том, кому назначено ревью
            assigned.id as assigned_reviewer_id,
            assigned.name as assigned_reviewer_name,
            assigned.email as assigned_reviewer_email
          FROM document_version dv
          LEFT JOIN users uploader ON dv.uploaded_by = uploader.id
          LEFT JOIN users reviewer ON dv.review_submitted_by = reviewer.id
          LEFT JOIN users approver ON dv.reviewed_by = approver.id
          LEFT JOIN users assigned ON dv.review_submitted_to = assigned.id
          WHERE dv.document_id = $1
          ORDER BY dv.document_number DESC
        `, [doc.id]);

        // Форматируем версии с пользовательскими данными
        const formattedVersions = versions.map(v => ({
          id: v.id,
          document_number: v.document_number,
          document_name: v.document_name,
          file_name: v.file_name,
          file_path: v.file_path,
          file_type: v.file_type,
          file_size: v.file_size,
          checksum: v.checksum,
          uploaded_by: v.uploaded_by,
          uploaded_at: v.uploaded_at,
          change_reason: v.change_reason,
          review_status: v.review_status,
          review_submitted_at: v.review_submitted_at,
          reviewed_at: v.reviewed_at,
          review_comment: v.review_comment,
          uploader: v.uploader_id ? {
            id: v.uploader_id,
            name: v.uploader_name,
            email: v.uploader_email
          } : null,
          reviewer: v.reviewer_id ? {
            id: v.reviewer_id,
            name: v.reviewer_name,
            email: v.reviewer_email
          } : null,
          approver: v.approver_id ? {
            id: v.approver_id,
            name: v.approver_name,
            email: v.approver_email
          } : null,
          assigned_reviewer: v.assigned_reviewer_id ? {
            id: v.assigned_reviewer_id,
            name: v.assigned_reviewer_name,
            email: v.assigned_reviewer_email
          } : null
        }));

        return {
          // Основные поля документа
          id: doc.id,
          study_id: doc.study_id,
          site_id: doc.site_id,
          folder_id: doc.folder_id,
          folder_name: doc.folder_name,
          tmf_zone: doc.tmf_zone,
          tmf_artifact: doc.tmf_artifact,
          current_version_id: doc.current_version_id,
          created_at: doc.created_at,
          
          // Информация о создателе
          created_by: doc.created_by,
          creator: doc.creator_id ? {
            id: doc.creator_id,
            name: doc.creator_name,
            email: doc.creator_email,
            role: doc.creator_role
          } : null,
          
          // Информация об удалении
          is_deleted: doc.is_deleted || false,
          deleted_at: doc.deleted_at,
          deleted_by: doc.deleted_by,
          deletion_reason: doc.deletion_reason,
          deleter: doc.deleter_id ? {
            id: doc.deleter_id,
            name: doc.deleter_name,
            email: doc.deleter_email
          } : null,
          
          // Информация о восстановлении
          restored_at: doc.restored_at,
          restored_by: doc.restored_by,
          restorer: doc.restorer_id ? {
            id: doc.restorer_id,
            name: doc.restorer_name,
            email: doc.restorer_email
          } : null,
          
          // Информация об архивации
          is_archived: doc.is_archived || false,
          archived_at: doc.archived_at,
          archived_by: doc.archived_by,
          archiver: doc.archiver_id ? {
            id: doc.archiver_id,
            name: doc.archiver_name,
            email: doc.archiver_email
          } : null,
          
          // Текущая версия и статус
          current_version: doc.latest_version,
          //status: doc.document_status || 'draft',
          status: doc.is_archived
          ? DocumentLifeCycleStatus.ARCHIVED
          : doc.is_deleted
          ? DocumentLifeCycleStatus.DELETED
          : doc.document_status,
          
          // Поля последней версии (для обратной совместимости)
          document_number: doc.document_number,
          document_name: doc.document_name,
          file_name: doc.file_name,
          file_path: doc.file_path,
          file_type: doc.file_type,
          file_size: doc.file_size,
          checksum: doc.checksum,
          last_uploaded_by: doc.last_uploaded_by,
          last_uploaded_at: doc.last_uploaded_at,
          last_change_reason: doc.last_change_reason,
          
          // Информация о последнем загрузившем
          last_uploader: doc.last_uploader_id ? {
            id: doc.last_uploader_id,
            name: doc.last_uploader_name,
            email: doc.last_uploader_email
          } : null,
          
          // Статус ревью
          review_status: doc.review_status,
          review_submitted_at: doc.review_submitted_at,
          reviewed_at: doc.reviewed_at,
          review_comment: doc.review_comment,
          
          // Информация о ревьюере
          reviewer: doc.reviewer_id ? {
            id: doc.reviewer_id,
            name: doc.reviewer_name,
            email: doc.reviewer_email
          } : null,
          
          // Информация об утверждающем
          approver: doc.approver_id ? {
            id: doc.approver_id,
            name: doc.approver_name,
            email: doc.approver_email
          } : null,
          
          // Информация о назначенном ревьюере
          assigned_reviewer: doc.assigned_reviewer_id ? {
            id: doc.assigned_reviewer_id,
            name: doc.assigned_reviewer_name,
            email: doc.assigned_reviewer_email
          } : null,
          
          // Все версии
          versions: formattedVersions,
          total_versions: formattedVersions.length
        };
      })
    );

    return NextResponse.json({
      documents: documentsWithVersions,
      count: documentsWithVersions.length,
      filters: {
        study_id: parseInt(study_id),
        site_id: parseInt(site_id),
        folder_id,
        include_deleted,
        include_archived
      }
    });

  } catch (error) {
    console.error('Error fetching documents:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  } finally {
    client.release();
  }
}

async function ensureTablesExist() {
  try {
    // Создаем таблицу document если её нет
    await createTable(Tables.DOCUMENT);
    console.log('Table "document" ensured');

    // Дополнительно: создаем индексы и триггеры после создания таблиц
    await ensureIndexesAndTriggers();

  } catch (error) {
    console.error('Error ensuring tables exist:', error);
    throw error;
  }
}

async function ensureIndexesAndTriggers() {
  const client = await connectDB();
  
  try {
    // Проверяем существование индексов для document таблицы
    await client.query(`
      CREATE INDEX IF NOT EXISTS idx_document_study_id ON document(study_id);
      CREATE INDEX IF NOT EXISTS idx_document_site_id ON document(site_id);
      CREATE INDEX IF NOT EXISTS idx_document_folder_id ON document(folder_id);
      CREATE INDEX IF NOT EXISTS idx_document_is_deleted ON document(is_deleted);
      CREATE INDEX IF NOT EXISTS idx_document_is_archived ON document(is_archived);
      CREATE INDEX IF NOT EXISTS idx_document_created_at ON document(created_at);
      CREATE INDEX IF NOT EXISTS idx_document_deleted_at ON document(deleted_at);
      CREATE INDEX IF NOT EXISTS idx_document_archived_at ON document(archived_at);
    `);

    // Проверяем существование индексов для document_version таблицы
    await client.query(`
      CREATE INDEX IF NOT EXISTS idx_document_version_document_id ON document_version(document_id);
      CREATE INDEX IF NOT EXISTS idx_document_version_number ON document_version(document_number);
      CREATE INDEX IF NOT EXISTS idx_document_version_uploaded_at ON document_version(uploaded_at);
      CREATE INDEX IF NOT EXISTS idx_document_version_review_status ON document_version(review_status);
    `);

    // Создаем функцию для автоматического обновления current_version_id если её нет
    await client.query(`
      CREATE OR REPLACE FUNCTION update_document_current_version()
      RETURNS TRIGGER AS $$
      BEGIN
        UPDATE document 
        SET current_version_id = NEW.id
        WHERE id = NEW.document_id;
        RETURN NEW;
      END;
      $$ LANGUAGE plpgsql;
    `);

    // Проверяем существование триггера и создаем если его нет
    const { rows: triggerExists } = await client.query(`
      SELECT EXISTS (
        SELECT 1 FROM pg_trigger 
        WHERE tgname = 'trigger_update_document_current_version'
      );
    `);

    if (!triggerExists[0].exists) {
      await client.query(`
        CREATE TRIGGER trigger_update_document_current_version
          AFTER INSERT ON document_version
          FOR EACH ROW
          EXECUTE FUNCTION update_document_current_version();
      `);
      console.log('Trigger "trigger_update_document_current_version" created');
    }

  } catch (error) {
    console.error('Error ensuring indexes and triggers:', error);
    throw error;
  } finally {
    client.release();
  }
}

// Создание документа
export async function POST(request: NextRequest) {
  const client = await connectDB();
  
  try {
    // Убеждаемся что таблицы существуют
    await ensureTablesExist();

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
    if (!study_id || !site_id || !folder_id || !folder_name || !created_by) {
      return NextResponse.json(
        { error: 'Missing required fields: study_id, site_id, folder_id, folder_name, created_by' },
        { status: 400 }
      );
    }

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
      site_id, // site_id уже строка, не нужно parseInt
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
  } finally {
    client.release();
  }
}

// DELETE метод для мягкого удаления
export async function DELETE(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams;
  const document_id = searchParams.get('id');
  const user_id = searchParams.get('user_id');
  const reason = searchParams.get('reason');

  if (!document_id) {
    return NextResponse.json(
      { error: 'document_id is required' },
      { status: 400 }
    );
  }

  if (!user_id) {
    return NextResponse.json(
      { error: 'user_id is required' },
      { status: 400 }
    );
  }

  if (!reason || reason.length < 10) {
    return NextResponse.json(
      { error: 'Deletion reason is required and must be at least 10 characters' },
      { status: 400 }
    );
  }

  const client = await connectDB();
  
  try {
    const { rowCount, rows } = await client.query(`
      UPDATE document 
      SET 
        is_deleted = true,
        deleted_at = NOW(),
        deleted_by = $1,
        deletion_reason = $2
      WHERE id = $3 AND is_deleted = false
      RETURNING *
    `, [user_id, reason, document_id]);

    if (rowCount === 0) {
      return NextResponse.json(
        { error: 'Document not found or already deleted' },
        { status: 404 }
      );
    }

    return NextResponse.json({ 
      message: 'Document soft deleted successfully',
      document: rows[0]
    });

  } catch (error) {
    console.error('Error deleting document:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  } finally {
    client.release();
  }
}