import { getPool, createTable } from '@/lib/db/index';
import { Tables } from './schema';
import { logger } from '@/lib/utils/logger';

// Функция для получения документа (должна использоваться только в loadEntity)
export async function getDocumentById(id: string) {
  const client = getPool();
  try {
    const { rows } = await client.query(
      'SELECT * FROM document WHERE id = $1',
      [id]
    );
    return rows[0] || null;
  } catch (error) {
    logger.error('Error fetching document:', error);
    return null;
  }
}

export async function ensureTablesExist() {
  try {
    // Создаем таблицу document если её нет
    await createTable(Tables.DOCUMENT);
    logger.info('Table "document" ensured');

    // Дополнительно: создаем индексы и триггеры после создания таблиц
    await ensureIndexesAndTriggers();

  } catch (error) {
    logger.error('Error ensuring tables exist:', error);
    throw error;
  }
}

export async function ensureIndexesAndTriggers() {
  const client = getPool();
  
  try {
    // Проверяем существование индексов для document таблицы
    await client.query(`
      CREATE INDEX IF NOT EXISTS idx_document_study_id ON document(study_id);
      CREATE INDEX IF NOT EXISTS idx_document_site_id ON document(site_id);
      CREATE INDEX IF NOT EXISTS idx_document_country ON document(country);
      CREATE INDEX IF NOT EXISTS idx_document_folder_id ON document(folder_id);
      CREATE INDEX IF NOT EXISTS idx_document_is_deleted ON document(is_deleted);
      CREATE INDEX IF NOT EXISTS idx_document_is_archived ON document(is_archived);
      CREATE INDEX IF NOT EXISTS idx_document_created_at ON document(created_at);
      CREATE INDEX IF NOT EXISTS idx_document_deleted_at ON document(deleted_at);
      CREATE INDEX IF NOT EXISTS idx_document_archived_at ON document(archived_at);
      CREATE INDEX IF NOT EXISTS idx_document_current_version ON document(current_version_id) WHERE is_deleted = false;
    `);

    // Проверяем существование индексов для document_version таблицы
    await client.query(`
      CREATE INDEX IF NOT EXISTS idx_document_version_document_id ON document_version(document_id);
      CREATE INDEX IF NOT EXISTS idx_document_version_number ON document_version(document_number);
      CREATE INDEX IF NOT EXISTS idx_document_version_uploaded_at ON document_version(uploaded_at);
      CREATE INDEX IF NOT EXISTS idx_document_version_review_status ON document_version(review_status);
      CREATE INDEX IF NOT EXISTS idx_review_queue ON document_version (review_submitted_to, review_submitted_at DESC) WHERE review_status = 'submitted';
      CREATE INDEX IF NOT EXISTS idx_document_version_status ON document_version(review_status);
    `);

    // Проверяем существование индексов для user_sessions
    await client.query(`
      CREATE INDEX IF NOT EXISTS idx_sessions_user_id ON user_sessions(user_id);
      CREATE INDEX IF NOT EXISTS idx_sessions_expires_at ON user_sessions(expires_at);
      CREATE INDEX IF NOT EXISTS idx_sessions_last_activity ON user_sessions(last_activity_at);
      CREATE INDEX IF NOT EXISTS idx_sessions_valid ON user_sessions(is_valid);
    `);


    // Создаем функцию для автоматического обновления current_version_id если её нет
    await client.query(`
      CREATE OR REPLACE FUNCTION update_document_current_version()
      RETURNS TRIGGER AS $$
      BEGIN
        UPDATE document 
        SET current_version_id = NEW.id
        WHERE id = NEW.document_id;
        RETURN NEW;
      END;
      $$ LANGUAGE plpgsql;
    `);

    // Проверяем существование триггера и создаем если его нет
    const { rows: triggerExists } = await client.query(`
      SELECT EXISTS (
        SELECT 1 FROM pg_trigger 
        WHERE tgname = 'trigger_update_document_current_version'
      );
    `);

    if (!triggerExists[0].exists) {
      await client.query(`
        CREATE TRIGGER trigger_update_document_current_version
          AFTER INSERT ON document_version
          FOR EACH ROW
          EXECUTE FUNCTION update_document_current_version();
      `);
      logger.info('Trigger "trigger_update_document_current_version" created');
    }

  } catch (error) {
    logger.error('Error ensuring indexes and triggers:', error);
    throw error;
  }
}
