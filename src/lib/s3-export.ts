// @/lib/s3-export.ts

interface ExportDoc {
  study_id: number | string;
  site_id?: string | null;
  tmf_zone?: string | null;
  tmf_artifact?: string | null;
  folder_name?: string | null; // Сюда передаем уже разрешенное имя из JSON
  document_name?: string | null;
  document_number: number;
  file_name: string;
}

/**
 * Строит путь к папке внутри архива или S3 бакета.
 * folder_name здесь — это уже результат маппинга folder_id -> name
 */
export function buildFolderPath(doc: ExportDoc) {
  return [
    `Study_${doc.study_id}`,
    doc.site_id ? `Site_${doc.site_id}` : null,
    // doc.tmf_zone,
    // doc.tmf_artifact,
    doc.folder_name // Игнорируем ID, используем только человекочитаемое имя
  ]
    .filter(Boolean)
    .map(part => String(part).trim().replace(/[/\\?%*:|"<>]/g, '-')) // Очистка от спецсимволов
    .join("/");
}

/**
 * Формирует имя файла: Название_v1.pdf
 */
export function buildFileName(doc: ExportDoc) {
  const name = (doc.document_name || "document").trim().replace(/[/\\?%*:|"<>]/g, '-');
  const version = `v${doc.document_number}`;
  
  // Безопасное получение расширения
  const parts = doc.file_name.split(".");
  const ext = parts.length > 1 ? parts.pop() : "bin";
  
  return `${name}_${version}.${ext}`;
}