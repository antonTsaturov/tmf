// Маппер для преобразования данных между слоями
import { RawDocumentData } from './repository';
import { DocumentResponseDTO, DocumentVersionDTO } from './dto';
import { DocumentStatusService } from './status.service';

export class DocumentMapper {
  private statusService: DocumentStatusService;

  constructor() {
    this.statusService = new DocumentStatusService();
  }

  toDocumentResponse(rawDoc: RawDocumentData): DocumentResponseDTO {
    const versions = rawDoc.all_versions || [];
    const latest = this.statusService.getLatestVersion(versions);
    
    const status = this.statusService.determineStatus(
      rawDoc.is_archived,
      rawDoc.is_deleted,
      latest
    );

    const result: DocumentResponseDTO = {
      id: rawDoc.id,
      study_id: rawDoc.study_id,
      folder_id: rawDoc.folder_id,
      site_id: rawDoc.site_id || null,
      country: rawDoc.country || null,
      created_at: rawDoc.created_at,
      created_by: rawDoc.created_by,
      updated_at: rawDoc.updated_at,
      is_deleted: rawDoc.is_deleted,
      deleted_at: rawDoc.deleted_at,
      deleted_by: rawDoc.deleted_by,
      restored_at: rawDoc.restored_at,
      restored_by: rawDoc.restored_by,
      is_archived: rawDoc.is_archived,
      archived_at: rawDoc.archived_at,
      archived_by: rawDoc.archived_by,
      unarchived_at: rawDoc.unarchived_at,
      unarchived_by: rawDoc.unarchived_by,
      versions: versions,
      current_version: latest,
      file_type: latest.file_type,
      status: status,
      total_versions: versions.length,
      document_name: latest.document_name,
      document_number: latest.document_number,
      creator: rawDoc.creator
    };

    // Добавляем информацию об удалившем
    if (rawDoc.is_deleted && rawDoc.deleter_info) {
      result.deleted_by_info = {
        name: rawDoc.deleter_info.name,
        email: rawDoc.deleter_info.email,
        role: String(rawDoc.deleter_info.role),
        deleted_at: rawDoc.deleted_at!
      };
    }

    // Добавляем информацию о восстановившем
    if (rawDoc.restored_by && rawDoc.restorer_info) {
      result.restored_by_info = {
        name: rawDoc.restorer_info.name,
        email: rawDoc.restorer_info.email,
        role: String(rawDoc.restorer_info.role)
      };
    }

    // Добавляем информацию об архивировавшем
    if (rawDoc.is_archived && rawDoc.archiver_info) {
      result.archived_by_info = {
        name: rawDoc.archiver_info.name,
        email: rawDoc.archiver_info.email,
        role: String(rawDoc.archiver_info.role),
        archived_at: rawDoc.archived_at!
      };
    }

    // Добавляем информацию о разархивировавшем
    if (rawDoc.unarchived_by && rawDoc.unarchiver_info) {
      result.unarchived_by_info = {
        name: rawDoc.unarchiver_info.name,
        email: rawDoc.unarchiver_info.email,
        role: String(rawDoc.unarchiver_info.role)
      };
    }

    return result;
  }

  toDocumentsResponse(documents: RawDocumentData[]): {
    documents: DocumentResponseDTO[];
    count: number;
  } {
    const formattedDocuments = documents.map(doc => this.toDocumentResponse(doc));
    
    return {
      documents: formattedDocuments,
      count: formattedDocuments.length
    };
  }
}