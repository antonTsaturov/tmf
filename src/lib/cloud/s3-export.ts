//  src/lib/cloud/s3-export.ts

interface ExportDoc {
  study_id: number | string;
  site_id?: string | null;
  site_name?: string | null;
  country?: string | null;
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
export function buildFolderPath(doc: ExportDoc, hasMultipleCountries: boolean = false) {
  const studyRoot = `Study_${doc.protocol || 'Unknown'}`;

  // Определяем уровень документа
  const isSiteLevel = !!doc.site_id;
  const isCountryLevel = !doc.site_id && !!doc.country && hasMultipleCountries;

  const levelFolder = isSiteLevel
    ? "Site Level Documents"
    : isCountryLevel
    ? "Country Level Documents"
    : "General Level Documents";

  // Для сайта добавляем промежуточную папку с именем сайта
  const siteFolder = doc.site_name
    ? `Site_${doc.site_name}`
    : (doc.site_id
    ? `Site_${doc.site_id}`
    : null);

  // Для Country level добавляем папку страны
  const countryFolder = isCountryLevel
    ? `Country_${doc.country}`
    : null;

  return [
    studyRoot,
    levelFolder,
    countryFolder,
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
  // 🔥 Используем computedFolderPath если он есть
  let base = doc.computedFolderPath;
  
  // Fallback если computedFolderPath нет
  if (!base) {
    // Старая логика для обратной совместимости
    const studyRoot = `Study_${doc.protocol || 'Unknown'}`;
    const isSiteLevel = !!doc.site_id;
    const levelFolder = isSiteLevel ? "Site Level Documents" : "General Level Documents";
    const siteFolder = doc.site_name ? `Site_${doc.site_name}` : (doc.site_id ? `Site_${doc.site_id}` : null);
    
    base = [studyRoot, levelFolder, siteFolder, doc.folder_name]
      .filter(Boolean)
      .map(part => String(part).trim().replace(/[/\\?%*:|"<>]/g, ' '))
      .join("/");
  }
  
  if (mode !== "full") {
    return base;
  }
    
  if (doc.is_deleted) {
    return `${base}/history/deleted`;
  }
    
  if (["approved", "archived"].includes(doc.review_status)) {
    return base;
  }

  return `${base}/history`;
}

/**
 * Строит полный путь к папке документа на основе структуры folders_structure
 * @param folderId - ID папки документа
 * @param folderStructure - массив/объект структуры папок
 * @param protocol - протокол исследования
 * @returns полный путь (Study_XXX/General Level Documents/папка1/папка2/...)
 */
// Добавьте эту функцию в файл src/lib/cloud/s3-export.ts

/**
 * Строит полный путь к папке документа на основе структуры folders_structure
 */
export function buildFullPathFromStructure(
  folderId: string,
  folderStructure: any,
  protocol: string,
  siteId?: string | null,
  siteName?: string | null,
  country?: string | null,
  hasMultipleCountries?: boolean
): string {
  // Нормализуем структуру в массив
  const structureArray = Array.isArray(folderStructure) 
    ? folderStructure 
    : [folderStructure];
  
  // Рекурсивный поиск пути
  function findPath(nodes: any[], targetId: string, currentPath: string[] = []): string[] | null {
    for (const node of nodes) {
      if (!node) continue;
      
      const newPath = [...currentPath, node.name];
      
      if (node.id === targetId) {
        return newPath;
      }
      
      if (node.children && Array.isArray(node.children) && node.children.length > 0) {
        const result = findPath(node.children, targetId, newPath);
        if (result) return result;
      }
    }
    return null;
  }
  
  const fullPath = findPath(structureArray, folderId);
  
  const studyRoot = `Study_${protocol || 'Unknown'}`;
  
  // Если документ на уровне сайта
  if (siteId) {
    const siteFolder = siteName ? `Site_${siteName}` : `Site_${siteId}`;
    
    if (fullPath && fullPath.length > 1) {
      // fullPath[0] - корень, fullPath[1] - "Site Level", fullPath[2+] - вложенные папки
      const nestedFolders = fullPath.slice(2);
      return [studyRoot, "Site Level Documents", siteFolder, ...nestedFolders]
        .filter(Boolean)
        .map(part => part.trim().replace(/[/\\?%*:|"<>]/g, ' '))
        .join("/");
    } else {
      return [studyRoot, "Site Level Documents", siteFolder]
        .filter(Boolean)
        .map(part => part.trim().replace(/[/\\?%*:|"<>]/g, ' '))
        .join("/");
    }
  }
  
  // Если документ на уровне страны
  if (country && hasMultipleCountries && !siteId) {
    const countryFolder = `Country_${country}`;
    
    if (fullPath && fullPath.length > 1) {
      const nestedFolders = fullPath.slice(2);
      return [studyRoot, "Country Level Documents", countryFolder, ...nestedFolders]
        .filter(Boolean)
        .map(part => part.trim().replace(/[/\\?%*:|"<>]/g, ' '))
        .join("/");
    } else {
      return [studyRoot, "Country Level Documents", countryFolder]
        .filter(Boolean)
        .map(part => part.trim().replace(/[/\\?%*:|"<>]/g, ' '))
        .join("/");
    }
  }
  
  // General level documents
  if (!fullPath || fullPath.length === 0) {
    return `${studyRoot}/General Level Documents`;
  }
  
  // fullPath[0] - корневая папка (название исследования)
  // fullPath[1] - уровень ("General" или "Site Level")
  // fullPath[2+] - вложенные папки
  
  let levelFolder = "General Level Documents";
  if (fullPath[1] === "Site Level") {
    levelFolder = "Site Level Documents";
  } else if (fullPath[1] === "Country Level") {
    levelFolder = "Country Level Documents";
  }
  
  // Вложенные папки (начиная с индекса 2)
  const nestedFolders = fullPath.slice(2);
  
  const allParts = [studyRoot, levelFolder, ...nestedFolders].filter(p => p && p.length > 0);
  
  return allParts
    .map(part => part.trim().replace(/[/\\?%*:|"<>]/g, ' '))
    .join("/");
}