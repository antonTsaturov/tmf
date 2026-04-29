// src/lib/cloud/s3-csv.ts

/* 
  Компонент для построения CSV-файлов при экспорте всех документов исследования
  full = ВСЕ версии документов, включая удаленные
  final = только последние версии документов
*/

export type CSVType = "full" | "final";

interface BaseDocument {
  study_id: string;
  site_id: string | null;
  country: string | null;
  site_name: string | null;
  tmf_zone: string | null;
  tmf_artifact: string | null;
  folder_id: string | null;
  document_name: string;
  document_number: string | null;
  file_name: string;
  file_path: string;
  checksum: string;
  uploaded_at: Date;
  review_status: string;
  uploaded_by: string | null;
  // Поля только для type === "full"
  is_deleted?: boolean;
  deleted_at?: Date | null;
  deletion_reason?: string | null;
}
type DocsWithPaths = Array<
  Omit<BaseDocument, 'is_deleted' | 'deleted_at' | 'deletion_reason'> & {
    computedFolderPath: string;
    hasMultipleCountries: boolean;
    protocol: string;
    // Опциональные поля для full type
    is_deleted?: boolean;
    deleted_at?: Date | null;
    deletion_reason?: string | null;
  }
>;

const getLevel = (folderId: string) => {

  if (folderId.includes('general')) {
    return 'General Level';
  } else if (folderId.includes('site')) {
    return 'Site Level';
  } else {
    return 'Country Level';
  }
}

export const createCSVFile = (
  docsWithPaths: DocsWithPaths, 
  mode: CSVType,
  folderMap: Map<string, string>
): string => {


  if (mode === "full") {

    let csv = "document_name, version, status, level, site, country, folder_path, uploaded_by, date, checksum, deleted, deleted_at, deletion_reason\n";
    for (const doc of docsWithPaths) {
      const folderPath = doc.computedFolderPath || folderMap.get(String(doc.folder_id)) || "Unknown";
      const level = getLevel(String(doc.folder_id))
      csv += [
        doc.document_name, 
        doc.document_number, 
        doc.review_status, 
        level,
        doc.site_name || "", 
        doc.country || "",
        folderPath, // Теперь здесь полный путь
        doc.uploaded_by, 
        doc.uploaded_at?.toISOString(), 
        doc.checksum,
        doc.is_deleted,
        doc.deleted_at || '',
        doc.deletion_reason || ''
      ].join(",") + "\n";
    };
    return csv;
  };

  if (mode === "final") {
    let csv = "document_name, version, status, level, site, country, folder_path, uploaded_by, date, checksum\n";
    for (const doc of docsWithPaths) {
      const folderPath = doc.computedFolderPath || folderMap.get(String(doc.folder_id)) || "Unknown";
      const level = getLevel(String(doc.folder_id))
      csv += [
        doc.document_name, 
        doc.document_number, 
        doc.review_status, 
        level,
        doc.site_name || "",
        doc.country || "",
        folderPath, // Теперь здесь полный путь
        doc.uploaded_by, 
        doc.uploaded_at?.toISOString(), 
        doc.checksum
      ].join(",") + "\n";
    };
    return csv;
  }
  throw new Error(`Unsupported mode: ${mode}`);  
  
};