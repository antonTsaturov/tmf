/*
* Вспомогательные функции для генерирования человекочитаемых путей
* (названий папок и файлов)
*/

export function buildFolderPath(doc: any) {
  return [
    `Study_${doc.study_id}`,
    doc.site_id ? `Site_${doc.site_id}` : null,
    doc.tmf_zone,
    doc.tmf_artifact,
    doc.folder_name
  ]
    .filter(Boolean)
    .join("/");
}

export function buildFileName(doc: any) {
  const name = doc.document_name || "document";
  const version = `v${doc.document_number}`;
  const ext = doc.file_name.split(".").pop();
  return `${name}_${version}.${ext}`;
}

