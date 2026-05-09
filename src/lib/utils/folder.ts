import { ViewLevel } from "@/types/types";


// Функция для определения уровня документа по folder_id
export const getDocumentLevel = (folderId?: string): ViewLevel => {
  if (!folderId) return ViewLevel.ROOT;
  
  const lowerFolderId = folderId.toLowerCase();
  if (lowerFolderId.includes("general")) return ViewLevel.GENERAL;
  if (lowerFolderId.includes("country")) return ViewLevel.COUNTRY;
  if (lowerFolderId.includes("site")) return ViewLevel.SITE;
  
  return ViewLevel.ROOT;
};
