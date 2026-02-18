// app/api/documents/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { connectDB, createTable } from '@/lib/db/index';
import { Tables } from '@/lib/db/schema';
import { v4 as uuidv4 } from 'uuid';

// export async function GET(request: NextRequest) {
//   const searchParams = request.nextUrl.searchParams;
//   const study_id = searchParams.get('study_id');
//   const site_id = searchParams.get('site_id');
//   const folder_id = searchParams.get('folder_id');
  
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

//     // Получаем документы с их последними версиями
//     const { rows: documents } = await client.query(`
//       WITH latest_versions AS (
//         SELECT DISTINCT ON (dv.document_id)
//           dv.document_id,
//           dv.id as version_id,
//           dv.document_number,
//           dv.document_name,
//           dv.file_name,
//           dv.file_path,
//           dv.file_type,
//           dv.file_size,
//           dv.checksum,
//           dv.uploaded_by,
//           dv.uploaded_at,
//           dv.change_reason
//         FROM document_version dv
//         ORDER BY dv.document_id, dv.document_number DESC
//       )
//       SELECT 
//         d.*,
//         lv.version_id,
//         lv.document_number,
//         lv.document_name,
//         lv.file_name,
//         lv.file_path,
//         lv.file_type,
//         lv.file_size,
//         lv.checksum,
//         lv.uploaded_by as last_uploaded_by,
//         lv.uploaded_at as last_uploaded_at,
//         lv.change_reason as last_change_reason,
//         CASE 
//           WHEN lv.document_id IS NOT NULL THEN json_build_object(
//             'id', lv.version_id,
//             'document_number', lv.document_number,
//             'document_name', lv.document_name,
//             'file_name', lv.file_name,
//             'file_path', lv.file_path,
//             'file_type', lv.file_type,
//             'file_size', lv.file_size,
//             'checksum', lv.checksum,
//             'uploaded_by', lv.uploaded_by,
//             'uploaded_at', lv.uploaded_at,
//             'change_reason', lv.change_reason
//           )
//           ELSE NULL
//         END as latest_version
//       FROM document d
//       LEFT JOIN latest_versions lv ON d.id = lv.document_id
//       WHERE 
//         d.study_id = $1 AND
//         d.site_id = $2 AND
//         d.folder_id = $3 AND
//         d.is_deleted = false
//       ORDER BY d.created_at DESC
//     `, [parseInt(study_id), parseInt(site_id), folder_id]);

//     // Получаем все версии для каждого документа
//     const documentsWithVersions = await Promise.all(
//       documents.map(async (doc) => {
//         const { rows: versions } = await client.query(`
//           SELECT 
//             id,
//             document_number,
//             document_name,
//             file_name,
//             file_path,
//             file_type,
//             file_size,
//             checksum,
//             uploaded_by,
//             uploaded_at,
//             change_reason
//           FROM document_version
//           WHERE document_id = $1
//           ORDER BY document_number DESC
//         `, [doc.id]);

//         return {
//           ...doc,
//           versions: versions,
//           total_versions: versions.length
//         };
//       })
//     );

//     return NextResponse.json({
//       documents: documentsWithVersions,
//       count: documentsWithVersions.length,
//       filters: {
//         study_id: parseInt(study_id),
//         site_id: parseInt(site_id),
//         folder_id
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

// app/api/documents/route.ts (фрагмент с обновленным GET запросом)
export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams;
  const study_id = searchParams.get('study_id');
  const site_id = searchParams.get('site_id');
  const folder_id = searchParams.get('folder_id');
  const include_deleted = searchParams.get('include_deleted') === 'true';
  
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

    // Добавляем поле deleted_at в запрос
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
          dv.change_reason
        FROM document_version dv
        ORDER BY dv.document_id, dv.document_number DESC
      )
      SELECT 
        d.*,
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
        CASE 
          WHEN lv.document_id IS NOT NULL THEN json_build_object(
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
            'change_reason', lv.change_reason
          )
          ELSE NULL
        END as latest_version
      FROM document d
      LEFT JOIN latest_versions lv ON d.id = lv.document_id
      WHERE 
        d.study_id = $1 AND
        d.site_id = $2 AND
        d.folder_id = $3 AND
        (${include_deleted ? 'TRUE' : 'd.is_deleted = false'})
      ORDER BY d.created_at DESC
    `, [parseInt(study_id), parseInt(site_id), folder_id]);

    // Получаем все версии для каждого документа
    const documentsWithVersions = await Promise.all(
      documents.map(async (doc) => {
        const { rows: versions } = await client.query(`
          SELECT 
            id,
            document_number,
            document_name,
            file_name,
            file_path,
            file_type,
            file_size,
            checksum,
            uploaded_by,
            uploaded_at,
            change_reason
          FROM document_version
          WHERE document_id = $1
          ORDER BY document_number DESC
        `, [doc.id]);

        return {
          ...doc,
          versions: versions,
          total_versions: versions.length,
          is_deleted: doc.is_deleted || false,
          deleted_at: doc.deleted_at || null
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
        include_deleted
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

    // Создаем таблицу document_version если её нет
    await createTable(Tables.DOCUMENT_VERSION);
    console.log('Table "document_version" ensured');

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
      CREATE INDEX IF NOT EXISTS idx_document_status ON document(status);
      CREATE INDEX IF NOT EXISTS idx_document_is_deleted ON document(is_deleted);
      CREATE INDEX IF NOT EXISTS idx_document_created_at ON document(created_at);
    `);

    // Проверяем существование индексов для document_version таблицы
    await client.query(`
      CREATE INDEX IF NOT EXISTS idx_document_version_document_id ON document_version(document_id);
      CREATE INDEX IF NOT EXISTS idx_document_version_number ON document_version(document_number);
      CREATE INDEX IF NOT EXISTS idx_document_version_uploaded_at ON document_version(uploaded_at);
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
      status = 'draft',
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
        tmf_zone, tmf_artifact, status, created_by
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
      RETURNING *
    `, [
      documentId, 
      parseInt(study_id), 
      parseInt(site_id), 
      folder_id, 
      folder_name, 
      tmf_zone || null, 
      tmf_artifact || null, 
      status, 
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

// Опционально: DELETE метод для мягкого удаления
export async function DELETE(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams;
  const document_id = searchParams.get('id');

  if (!document_id) {
    return NextResponse.json(
      { error: 'document_id is required' },
      { status: 400 }
    );
  }

  const client = await connectDB();
  
  try {
    const { rowCount } = await client.query(`
      UPDATE document 
      SET is_deleted = true 
      WHERE id = $1
    `, [document_id]);

    if (rowCount === 0) {
      return NextResponse.json(
        { error: 'Document not found' },
        { status: 404 }
      );
    }

    return NextResponse.json({ 
      message: 'Document soft deleted successfully',
      id: document_id 
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