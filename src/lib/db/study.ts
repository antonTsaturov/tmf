import { connectDB } from './index';
import { Study } from '@/types/types';


/**
 * Updates a study row in the 'study' table by id.
 * Only provided fields will be updated.
 * @param id - The id of the study to update
 * @param updates - An object with the fields to update
 */
export async function updateOrCreateStudy(id: number, updates: Partial<Study>) {
  if (!id || !updates || Object.keys(updates).length === 0) {
    throw new Error('updateOrCreateStudy: ID and at least one field are required.');
  }

  const client = await connectDB();
  try {
    // Проверяем существование записи
    const checkQuery = 'SELECT id FROM study WHERE id = $1';
    const checkResult = await client.query(checkQuery, [id]);
    
    const fields = Object.keys(updates);
    const values = fields.map(field => 
      field === 'users' || field === 'audit_trail' 
        ? JSON.stringify(updates[field as keyof typeof updates]) 
        : updates[field as keyof typeof updates]
    );
    
    if (checkResult.rowCount === 0) {
      // Создаем новую запись
      console.log(`updateOrCreateStudy: Creating new study with id ${id}`);
      
      const allFields = ['id', ...fields];
      const placeholders = allFields.map((_, idx) => `$${idx + 1}`).join(', ');
      const insertValues = [id, ...values];
      
      const insertQuery = `
        INSERT INTO study (${allFields.join(', ')})
        VALUES (${placeholders})
        RETURNING *;
      `;
      
      const result = await client.query(insertQuery, insertValues);
      console.log(`updateOrCreateStudy: Study with id ${id} created.`);
      return result.rows[0];
      
    } else {
      // Обновляем существующую запись
      console.log(`updateOrCreateStudy: Updating study with id ${id}`);
      
      const setClause = fields.map((field, idx) => `${field} = $${idx + 1}`).join(', ');
      const updateValues = [...values, id];
      
      const updateQuery = `
        UPDATE study 
        SET ${setClause}
        WHERE id = $${fields.length + 1}
        RETURNING *;
      `;
      
      const result = await client.query(updateQuery, updateValues);
      console.log(`updateOrCreateStudy: Study with id ${id} updated.`);
      return result.rows[0];
    }
    
  } catch (err) {
    console.error('updateOrCreateStudy: Error:', err);
    throw err;
  } finally {
    client.release();
  }
}
/**
 * Creates the 'studies' table if it does not exist.
 * The table structure is based on the Study interface.
 * Arrays and complex types are stored as JSONB.
 */
export async function createStudyTable() {
  const client = await connectDB();
  try {
    const query = `
      CREATE TABLE IF NOT EXISTS study (
        id SERIAL PRIMARY KEY,
        title TEXT NOT NULL,
        protocol TEXT NOT NULL,
        sponsor TEXT,
        cro TEXT,
        countries TEXT[],
        status TEXT NOT NULL,
        users JSONB,
        sites_list JSONB,
        total_documents INTEGER,
        folders_structure JSONB,
        audit_trail JSONB
      );
    `;
    await client.query(query);
    console.log('createStudyTable: Table "study" is ready.');

  } catch (err) {
    console.error('createStudyTable: Error creating studies table:', err);
    throw err;

  } finally {
    client.release();
  }
}
