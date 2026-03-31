import { getPool } from './index';
import { StudySite } from '@/types/types';
import { logger } from '@/lib/logger';

export async function bulkSaveData(sites: StudySite[]) {
  if (!sites || sites.length === 0) {
    logger.info('bulkSaveSites: No sites to save');
    return [];
  }

  const client = getPool();
  
  try {
    logger.info(`bulkSaveSites: Saving ${sites.length} sites...`);

    // Начинаем транзакцию
    await client.query('BEGIN');
    
    const savedSites = [];
    
    for (const site of sites) {
      try {
        // Проверяем, существует ли уже такой сайт (по id или study_id + number)
        let existingSite;
        
        if (site.id && String(site.id) !== '') {
          // Если есть id, проверяем по нему
          const checkResult = await client.query(
            'SELECT id FROM site WHERE id = $1',
            [site.id]
          );
          existingSite = checkResult.rows[0];
        } else {
          // Иначе проверяем по study_id и number (уникальная комбинация)
          const checkResult = await client.query(
            'SELECT id FROM site WHERE study_id = $1 AND number = $2',
            [site.study_id, site.number]
          );
          existingSite = checkResult.rows[0];
          
          // Если нашли по study_id и number, обновим тот же id
          if (existingSite) {
            site.id = existingSite.id;
          }
        }
        
        // Подготавливаем данные для вставки
        const fields = Object.keys(site).filter(key => key !== 'id' && (site as Record<string, any>)[key] !== undefined);
        const values = fields.map(field => (site as Record<string, any>)[field]);
        
        if (existingSite) {
          // ОБНОВЛЯЕМ существующий сайт
          const setClause = fields.map((field, idx) => `${field} = $${idx + 1}`).join(', ');
          const updateValues = [...values, existingSite.id];
          
          const updateQuery = `
            UPDATE site 
            SET ${setClause}
            WHERE id = $${fields.length + 1}
            RETURNING *;
          `;
          
          const result = await client.query(updateQuery, updateValues);
          savedSites.push(result.rows[0]);
          logger.info(`bulkSaveSites: Site ${existingSite.id} updated`);
          
        } else {
          // СОЗДАЕМ новый сайт
          // Генерируем id, если не указан
          const siteId = site.id && String(site.id) !== '' ? site.id : 
            `site-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
          
          const allFields = ['id', ...fields];
          const placeholders = allFields.map((_, idx) => `$${idx + 1}`).join(', ');
          const insertValues = [siteId, ...values];
          
          const insertQuery = `
            INSERT INTO site (${allFields.join(', ')})
            VALUES (${placeholders})
            RETURNING *;
          `;
          
          const result = await client.query(insertQuery, insertValues);
          savedSites.push(result.rows[0]);
          logger.info(`bulkSaveSites: Site ${siteId} created`);
        }
        
      } catch (siteError) {
        logger.error(`bulkSaveSites: Error saving site:`, siteError, { siteData: site });
        // Продолжаем с другими сайтами
        continue;
      }
    }
    
    // Фиксируем транзакцию
    await client.query('COMMIT');

    logger.info(`bulkSaveSites: Successfully saved ${savedSites.length} out of ${sites.length} sites`);
    return savedSites;
    
  } catch (err) {
    // Откатываем транзакцию при ошибке
    await client.query('ROLLBACK');
    logger.error('bulkSaveSites: Transaction error:', err);
    throw err;
    
  }
}
