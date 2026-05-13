// Сервисный слой - бизнес-логика
import { DocumentRepository, RawDocumentData } from './repository';
import { DocumentMapper } from './mapper';
import { GetDocumentsQueryDTO, GetDocumentsResponseDTO } from './dto';
import { logger } from '@/lib/utils/logger';

export class DocumentService {
  private repository: DocumentRepository;
  private mapper: DocumentMapper;

  constructor() {
    this.repository = new DocumentRepository();
    this.mapper = new DocumentMapper();
  }

  async getDocuments(query: GetDocumentsQueryDTO): Promise<GetDocumentsResponseDTO> {
    try {
      // Проверяем и создаем таблицы если их нет
      await this.repository.ensureDatabaseReady();

      // Получаем данные из репозитория
      const rawDocuments = await this.repository.getDocuments(query);

      // Маппим в DTO
      return this.mapper.toDocumentsResponse(rawDocuments);
    } catch (error) {
      logger.error('Error in DocumentService.getDocuments', error instanceof Error ? error : null);
      throw error;
    }
  }
}