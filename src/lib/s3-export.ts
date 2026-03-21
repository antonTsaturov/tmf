// @/lib/s3-export.ts

interface ExportDoc {
  study_id: number | string;
  site_id?: string | null;
  site_name?: string | null;
  protocol?: string | null;
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
  const studyRoot = `Study_${doc.protocol || 'Unknown'}`;
  
  // Определяем папку уровня
  const levelFolder = doc.site_id ? "Site Level Documents" : "General Level Documents";
  
  // Для сайта добавляем промежуточную папку с ID сайта
  const siteFolder = doc.site_name 
    ? `Site_${doc.site_name}` 
    : (doc.site_id 
    ? `Site_${doc.site_id}` 
    : null);
  
  return [
    studyRoot,
    levelFolder,
    siteFolder,
    doc.folder_name
  ]
    .filter(Boolean)
    .map(part => String(part).trim().replace(/[/\\?%*:|"<>]/g, ' '))
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

// Хелпер с проверкой на массив
export function buildFolderMap(nodes: any, map: Map<string, string> = new Map()) {
  // Если nodes — это не массив, проверяем, не одиночный ли это объект
  if (!Array.isArray(nodes)) {
    if (nodes && typeof nodes === 'object' && nodes.id) {
      map.set(nodes.id, nodes.name);
      if (nodes.children) buildFolderMap(nodes.children, map);
    }
    return map;
  }

  // Если это массив, итерируемся
  for (const node of nodes) {
    if (!node) continue;
    map.set(node.id, node.name);
    
    // Рекурсия только если children существует и является массивом
    if (node.children && Array.isArray(node.children)) {
      buildFolderMap(node.children, map);
    }
  }
  return map;
}

export function buildFileNameWithMode(doc: any, mode: string) {
  const ext = doc.file_name.split(".").pop();

  if (mode === "full") {
    return `${doc.document_name}_v${doc.document_number}_${doc.review_status}.${ext}`;
  }

  return `${doc.document_name}_v${doc.document_number}.${ext}`;
}

export function buildFolderPathWithMode(doc: any, mode: string) {
  const base = buildFolderPath(doc);

  if (mode !== "full") {
    return base;
  }

  // 🔥 удалённые
  if (doc.is_deleted) {
    return `${base}/history/deleted`;
  }
    
  // 👉 финальные версии
  if (["approved", "archived"].includes(doc.review_status)) {
    return base;
  }

  // 👉 не финальные → history
  return `${base}/history`;
}
