// app/api/documents/deleted/route.ts
// GET - список удалённых документов (только для ADMIN)
import { NextRequest, NextResponse } from 'next/server';
import { connectDB, createTable } from '@/lib/db/index';
import { Tables } from '@/lib/db/schema';
import { AuthService } from '@/lib/auth/auth.service';


export async function GET(request: NextRequest) {
  const authToken = request.cookies.get('auth-token')?.value;
  const payload = authToken ? AuthService.verifyToken(authToken) : null;

  console.log(payload)
  if (!payload) {
    return NextResponse.json({ error: 'Forbidden. Admin access required.' }, { status: 403 });
  }

  const client = await connectDB();

  try {
    await createTable(Tables.DOCUMENT);
    await createTable(Tables.DOCUMENT_VERSION);

    // const { rows: documents } = await client.query(`
    //   WITH latest_versions AS (
    //     SELECT DISTINCT ON (dv.document_id)
    //       dv.document_id,
    //       dv.id as version_id,
    //       dv.document_number,
    //       dv.document_name,
    //       dv.file_name,
    //       dv.file_path,
    //       dv.file_type,
    //       dv.file_size,
    //       dv.checksum,
    //       dv.uploaded_by,
    //       dv.uploaded_at,
    //       dv.change_reason
    //     FROM document_version dv
    //     ORDER BY dv.document_id, dv.document_number DESC
    //   )
    //   SELECT 
    //     d.id, d.study_id, d.site_id, d.folder_id, d.folder_name,
    //     d.tmf_zone, d.tmf_artifact, d.created_by, d.created_at,
    //     d.is_deleted, d.deleted_at, d.deleted_by, d.deletion_reason,
    //     lv.version_id, lv.document_number, lv.document_name, lv.file_name,
    //     lv.file_path, lv.file_type, lv.file_size, lv.checksum,
    //     lv.uploaded_by, lv.uploaded_at, lv.change_reason
    //   FROM document d
    //   LEFT JOIN latest_versions lv ON d.id = lv.document_id
    //   WHERE d.is_deleted = true
    //   ORDER BY d.deleted_at DESC NULLS LAST, d.created_at DESC
    // `);
    const { rows: documents } = await client.query(`
      SELECT 
        d.id,
        d.study_id,
        d.site_id,
        d.folder_id,
        d.folder_name,
        d.tmf_zone,
        d.tmf_artifact,
        d.created_at,
        d.is_deleted,
        d.deleted_at,
        d.deleted_by,
        d.deletion_reason,
        d.restored_at,
        d.restored_by,
        dv.document_name,
        dv.file_name,
        dv.file_type,
        dv.file_size,
        dv.document_number,
        u_deleted.name as deleted_by_name,
        u_deleted.email as deleted_by_email,
        u_restored.name as restored_by_name,
        u_restored.email as restored_by_email
      FROM document d
      LEFT JOIN LATERAL (
        SELECT * FROM document_version 
        WHERE document_id = d.id 
        ORDER BY document_number DESC 
        LIMIT 1
      ) dv ON true
      LEFT JOIN users u_deleted ON d.deleted_by = u_deleted.id
      LEFT JOIN users u_restored ON d.restored_by = u_restored.id
      WHERE d.is_deleted = true
      ORDER BY d.deleted_at DESC
    `);    

    return NextResponse.json({
      documents,
      count: documents.length,
    });
  } catch (error) {
    console.error('Error fetching deleted documents:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  } finally {
    client.release();
  }
}
