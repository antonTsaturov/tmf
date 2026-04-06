/**
 * S3/Yandex Object Storage path structure:
 * documents/{study_id}/{folder_id}/{document_id}/v{number}/{version_id}.{ext}
 */
export function getDocumentVersionS3Key(
  studyId: number | string,
  folderId: string,
  documentId: string,
  versionNumber: number,
  versionId: string,
  fileExtension: string
): string {
  return `documents/${studyId}/${folderId}/${documentId}/v${versionNumber}/${versionId}.${fileExtension}`;
}
