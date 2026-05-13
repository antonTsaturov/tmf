// Контроллер - обработка HTTP запросов
import { NextRequest } from "next/server";
import { DocumentService } from "./service";
import { GetDocumentsQueryDTO, GetDocumentsResponseDTO } from "./dto";
import { logger } from '@/lib/utils/logger';

export class DocumentController {
  private service: DocumentService;

  constructor() {
    this.service = new DocumentService();
  }

  async getDocuments(request: NextRequest, user: any): Promise<GetDocumentsResponseDTO> {
    try {
      // Извлекаем параметры запроса
      const searchParams = request.nextUrl.searchParams;
      
      const query: GetDocumentsQueryDTO = {
        study_id: searchParams.get('study_id') || '',
        site_id: searchParams.get('site_id'),
        country: searchParams.get('country'),
        folder_id: searchParams.get('folder_id') || '',
        include_deleted: searchParams.get('include_deleted') === 'true',
        include_archived: searchParams.get('include_archived') === 'true'
      };

      // Валидация обязательных параметров
      if (!query.study_id) {
        throw new Error('study_id is required');
      }

      if (!query.folder_id) {
        throw new Error('folder_id is required');
      }

      // Вызываем сервис
      return await this.service.getDocuments(query);
    } catch (error) {
      logger.error('Error in DocumentController.getDocuments', error instanceof Error ? error : null);
      throw error;
    }
  }
}