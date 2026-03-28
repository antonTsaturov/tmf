// base.ts
import { NextRequest, NextResponse } from 'next/server';
import { createOrUpdateRecord } from '@/lib/db/study';
import { getPool, createTable, DB_INITIALIZED } from '@/lib/db/index';
import { Tables, UserQueries } from '@/lib/db/schema';

export class StudyApiHandler {
  // GET: get all records from table
  async getTable(table: Tables): Promise<NextResponse> {
    let client;
    try {
      client = getPool();
      
      if (!DB_INITIALIZED) {
      // Проверяем существование таблицы
        const tableExists = await this.checkTableExists(client, table);
        
        if (!tableExists) {
          console.log(`Table ${table} does not exist, creating it...`);
          await createTable(table);
          // Возвращаем пустой массив, так как таблица только что создана
          return NextResponse.json([], { status: 200 });
        }
      }
      
      // Если таблица существует, выполняем запрос
      const queryText = table === Tables.USERS
        ? UserQueries.getAllUsers()
        : `SELECT * FROM ${table} ORDER BY id ASC`;
      
      const result = await client.query(queryText);
      
      return NextResponse.json(result.rows, { status: 200 });
      
    } catch (err) {
      console.error(`GET /api/${table} error: `, err);
      return NextResponse.json({ 
        error: `Failed to fetch data from ${table}`, 
        details: String(err) 
      }, { status: 500 });
      
    }
  }

  // Вспомогательный метод для проверки существования таблицы
  private async checkTableExists(client: any, table: string): Promise<boolean> {
    try {
      const result = await client.query(`
        SELECT EXISTS (
          SELECT FROM information_schema.tables 
          WHERE table_schema = 'public' 
          AND table_name = $1
        );
      `, [table]);
      
      return result.rows[0].exists;
    } catch {
      return false;
    }
  }  

  // GET: get filtered records by study ID
  async getTablePartial(table: Tables, request: NextRequest) {
    let client;
    
    try {
      client = getPool();
      console.log('request.nextUrl.searchParams', request.nextUrl.searchParams);
      
      // Получаем ID исследования из параметров запроса
      const studyId = request.nextUrl.searchParams.get('studyId');
      
      if (!studyId) {
        return NextResponse.json(
          { error: 'Study ID is required' },
          { status: 400 }
        );
      }
      
      try {
        // Оформляем запрос в зависимости от типа таблицы
        const queryText = table === Tables.USERS
          ? UserQueries.getUsersByStudy(parseInt(studyId))
          : `SELECT * FROM ${table} WHERE study_id = $1 ORDER BY number ASC`;
        
        const result = await client.query(queryText, [studyId]);
        
        return NextResponse.json(result.rows, { status: 200 });
        
      } catch (dbError) {
        const errorMessage = String(dbError);
        
        if (errorMessage.includes(`relation "${table}" does not exist`) || 
            errorMessage.includes(`table "${table}" does not exist`)) {
          
          console.log(`Table ${table} does not exist, creating it...`);
          await createTable(table);
          return NextResponse.json([], { status: 200 });
        }
        
        throw dbError;
      }
      
    } catch (err) {
      console.error(`GET /api/${table} error:`, err);
      return NextResponse.json(
        { 
          error: `Failed to fetch data from table ${table}`, 
          details: String(err) 
        }, 
        { status: 500 }
      );
      
    }
  }

  // POST: create or update a record. Используется для построчного обновления/сохранения данных в БД.
  async createOrUpdateTable(table: Tables, request: NextRequest): Promise<NextResponse> {
    // Читаем данные только ОДИН раз
    const data = await request.json().catch(() => ({}));

    try {
      if (data.id) {
        // Update existing record
        const id = data.id;
        const updates = { ...data };
        delete updates.id;
        
        await createOrUpdateRecord(table, id, updates);
        
        return NextResponse.json(
          { message: `${table} updated with id ${id}`, id }, 
          { status: 200 }
        );

      } else {
        // Create new record
        await createTable(table);
        
        if (Object.keys(data).length > 0) {
          const newId = await createOrUpdateRecord(table, 0, data);
          return NextResponse.json(
            { message: `${table} record created with id ${newId}`, id: newId }, 
            { status: 201 }
          );
        }
        
        return NextResponse.json(
          { message: `${table} table created` }, 
          { status: 201 }
        );
      }
    } catch (err) {
      console.error(`POST /api/${table} error: `, err);
      return NextResponse.json({ 
        error: `Failed to create or update ${table}`, 
        details: String(err) 
      }, { status: 500 });
    }
  }

  // DELETE: delete any record by id с поддержкой каскадного удаления для сайтов
  async deleteRecord(table: Tables, request: NextRequest): Promise<NextResponse> {

    const client = getPool();
    
    try {
      const data = await request.json();

      if (!data.id) {
        return NextResponse.json(
          { error: `Missing ${table} id` }, 
          { status: 400 }
        );
      }

      const id = data.id;
      
      // Начинаем транзакцию
      await client.query('BEGIN');

      try {
        // Если удаляем сайт, нужно очистить assigned_site_id у пользователей
        if (table === Tables.SITE) {
          // Преобразуем ID сайта в число для сравнения с элементами массива
          const siteIdAsNumber = id;
          
          // Удаляем ID сайта из массива assigned_site_id всех пользователей
          await client.query(
            `UPDATE ${Tables.USERS} 
              SET assigned_site_id = array_remove(assigned_site_id, $1)
              WHERE $1 = ANY(assigned_site_id)`,
            [siteIdAsNumber]
          );
          
          console.log(`Cleaned up site ID ${siteIdAsNumber} from users' assigned_site_id arrays`);
        }
        
        // Удаляем саму запись
        const result = await client.query(
          `DELETE FROM ${table} WHERE id = $1 RETURNING *`, 
          [id]
        );

        if (result.rowCount === 0) {
          await client.query('ROLLBACK');
          return NextResponse.json(
            { error: `Record with id ${id} in table ${table} not found` }, 
            { status: 404 }
          );
        }

        // Подтверждаем транзакцию
        await client.query('COMMIT');

        return NextResponse.json(
          { 
            message: `Record with id ${id} in table ${table} was deleted`,
            cascaded: table === Tables.SITE ? 'Site ID removed from users' : undefined
          }, 
          { status: 200 }
        );

      } catch (err) {
        // Откатываем транзакцию в случае ошибки
        await client.query('ROLLBACK');
        throw err;
      }

    } catch (err) {
      console.error(`DELETE /api/${table} error: `, err);
      return NextResponse.json({ 
        error: `Failed to delete record in ${table}`, 
        details: String(err) 
      }, { status: 500 });
    }
  }
}

// Создаем и экспортируем singleton instance
export const studyApiHandler = new StudyApiHandler();