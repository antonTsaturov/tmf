import { connectDB } from './index';
import { Study } from '@/types/types';
import { Tables } from './schema';

export async function createOrUpdateRecord(table: Tables, id: number, updates: Partial<Study>) {

  if (!table || !id || !updates || Object.keys(updates).length === 0) {
    throw new Error('updateStudy: Table, ID and at least one field are required.');
  }

  const client = await connectDB();

  try {
    // Проверяем существование записи
    const checkQuery = `SELECT id FROM ${table} WHERE id = $1`;
    const checkResult = await client.query(checkQuery, [id]);
    
    const jsonFields = ['users', 'folders_structure', 'audit_trail'];
    const fields = Object.keys(updates);
    const values = fields.map(field =>
      jsonFields.includes(field)
        ? JSON.stringify(updates[field as keyof typeof updates])
        : updates[field as keyof typeof updates]
    );
    
    if (checkResult.rowCount === 0) {
      // Создаем новую запись
      console.log(`createOrUpdateRecord: Creating new record in table ${table} with id ${id}`);
      
      const allFields = ['id', ...fields];
      const placeholders = allFields.map((_, idx) => `$${idx + 1}`).join(', ');
      const insertValues = [id, ...values];
      
      const insertQuery = `
        INSERT INTO ${table} (${allFields.join(', ')})
        VALUES (${placeholders})
        RETURNING *;
      `;
      
      const result = await client.query(insertQuery, insertValues);
      console.log(`createOrUpdateRecord: Record in table ${table} with id ${id} created.`);
      return result.rows[0];
      
    } else {
      // Обновляем существующую запись
      console.log(`createOrUpdateRecord: Updating record in table ${table} with id ${id}`);
      
      const setClause = fields.map((field, idx) => `${field} = $${idx + 1}`).join(', ');
      const updateValues = [...values, id];
      
      const updateQuery = `
        UPDATE ${table} 
        SET ${setClause}
        WHERE id = $${fields.length + 1}
        RETURNING *;
      `;
      
      const result = await client.query(updateQuery, updateValues);
      console.log(`createOrUpdateRecord: Record with id ${id} in table ${table} was updated.`);
      return result.rows[0];
    }
    
  } catch (err) {
    console.error('createOrUpdateRecord: Error:', err);
    throw err;
  } finally {
    client.release();
  }
}
