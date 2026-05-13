// Repository слой - работа с базой данных
import { getPool, DB_INITIALIZED } from '@/lib/db/index';
import { ensureTablesExist } from '@/lib/db/document';
import { GetDocumentsQueryDTO, DocumentVersionDTO } from './dto';

export interface RawDocumentData {
  id: number;
  study_id: number;
  folder_id: number;
  site_id?: number | null;
  country?: string | null;
  created_at: Date;
  created_by: number;
  updated_at?: Date;
  is_deleted: boolean;
  deleted_at?: Date;
  deleted_by?: number;
  restored_at?: Date;
  restored_by?: number;
  is_archived: boolean;
  archived_at?: Date;
  archived_by?: number;
  unarchived_at?: Date;
  unarchived_by?: number;
  creator: {
    id: number;
    name: string;
    email: string;
  };
  deleter_info?: {
    id: number;
    name: string;
    email: string;
    role: number;
  };
  restorer_info?: {
    id: number;
    name: string;
    email: string;
    role: number;
  };
  archiver_info?: {
    id: number;
    name: string;
    email: string;
    role: number;
  };
  unarchiver_info?: {
    id: number;
    name: string;
    email: string;
    role: number;
  };
  all_versions: DocumentVersionDTO[];
}

export class DocumentRepository {
  async ensureDatabaseReady(): Promise<void> {
    if (!DB_INITIALIZED) {
      await ensureTablesExist();
    }
  }

  async getDocuments(query: GetDocumentsQueryDTO): Promise<RawDocumentData[]> {
    const client = getPool();
    
    const queryParams: any[] = [parseInt(query.study_id), query.folder_id];
    let siteOrCountryCondition = '';
    
    if (query.site_id) {
      siteOrCountryCondition = `AND d.site_id = $3`;
      queryParams.push(parseInt(query.site_id));
    } else if (query.country) {
      siteOrCountryCondition = `AND d.country = $3`;
      queryParams.push(query.country);
    } else {
      siteOrCountryCondition = `AND (d.site_id IS NULL OR d.country IS NOT NULL)`;
    }

    const { rows } = await client.query(`
      SELECT 
        d.*,
        json_build_object('id', uc.id, 'name', uc.name, 'email', uc.email) as creator,
        CASE 
          WHEN d.is_deleted = true AND d.deleted_by IS NOT NULL THEN
            json_build_object('id', del.id, 'name', del.name, 'email', del.email, 'role', del.role)
          ELSE NULL
        END as deleter_info,
        CASE 
          WHEN d.restored_by IS NOT NULL THEN
            json_build_object('id', restore.id, 'name', restore.name, 'email', restore.email, 'role', restore.role)
          ELSE NULL
        END as restorer_info,        
        CASE 
          WHEN d.is_archived = true AND d.archived_by IS NOT NULL THEN
            json_build_object('id', arch.id, 'name', arch.name, 'email', arch.email, 'role', arch.role)
          ELSE NULL
        END as archiver_info,
        CASE 
          WHEN d.unarchived_by IS NOT NULL THEN
            json_build_object('id', unarch.id, 'name', unarch.name, 'email', unarch.email, 'role', unarch.role)
          ELSE NULL
        END as unarchiver_info,              
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
      LEFT JOIN users del ON d.deleted_by = del.id
      LEFT JOIN users restore ON d.restored_by = restore.id
      LEFT JOIN users arch ON d.archived_by = arch.id
      LEFT JOIN users unarch ON d.unarchived_by = unarch.id
      WHERE d.study_id = $1 AND d.folder_id = $2 ${siteOrCountryCondition}
        AND (${query.include_deleted ? 'TRUE' : 'd.is_deleted = false'})
        AND (${query.include_archived ? 'TRUE' : '(d.is_archived = false OR d.is_archived IS NULL)'})
      ORDER BY d.created_at DESC
    `, queryParams);

    return rows;
  }
}