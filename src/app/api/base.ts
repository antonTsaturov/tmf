import { NextRequest, NextResponse } from 'next/server';
import { createOrUpdateRecord } from '@/lib/db/study';
import { connectDB, createTable } from '@/lib/db/index';
import { Tables, UserQueries } from '@/lib/db/schema';
import { bulkSaveData } from '@/lib/db/site';


export class StudyApiHandler {
  // GET: get all records from table
  async getTable(table: Tables): Promise<NextResponse> {
    let client;
    try {
      client = await connectDB();
      
      try {
        const result = await client.query(`SELECT * FROM ${table} ORDER BY id ASC`);
        return NextResponse.json(result.rows, { status: 200 });
        
      } catch (dbError) {
        const errorMessage = String(dbError);
        
        if (errorMessage.includes(`relation ${table} does not exist`) || 
            errorMessage.includes(`table ${table} does not exist`)) {
          
          console.log(`Table ${table} does not exist, creating it...`);
          await createTable(table);
          return NextResponse.json([], { status: 200 });
        }
        
        throw dbError;
      }
      
    } catch (err) {
      console.error(`GET /api/${table} error: `, err);
      return NextResponse.json({ 
        error: 'Failed to fetch studies', 
        details: String(err) 
      }, { status: 500 });
      
    } finally {
      if (client) {
        client.release();
      }
    }
  }


  async getTablePartial(table: Tables, request: NextRequest) {
    let client;
    
    try {
      client = await connectDB();
      console.log('request.nextUrl.searchParams', request.nextUrl.searchParams)
      // Получаем ID исследования из параметров запроса
      const studyId = request.nextUrl.searchParams.get('studyId');
      
      if (!studyId) {
        return NextResponse.json(
          { error: 'Study ID is required' },
          { status: 400 }
        );
      }
      
      try {
        // Оформляем запрос в зависимости от типа таблиы
        const qureyText = table === Tables.USERS
          ? UserQueries.getUsersByStudy(parseInt(studyId))
          : `SELECT * FROM ${table} WHERE study_id = $1 ORDER BY number ASC`;
        // Пытаемся получить часть таблицы по ID для исследования
        // const result = await client.query(
        //   `SELECT * FROM ${table} WHERE study_id = $1 ORDER BY number ASC`,
        //   [studyId]
        // );
        const result = await client.query(qureyText, [studyId]);
        
        return NextResponse.json(result.rows, { status: 200 });
        
      } catch (dbError) {
        const errorMessage = String(dbError);
        
        // Если таблица не существует
        if (errorMessage.includes(`relation "${table}" does not exist`) || 
            errorMessage.includes(`table "${table}" does not exist`)) {
          
          console.log(`Table ${table} does not exist, creating it...`);
          
          // Создаем таблицу
          await createTable(table);
          
          // Проверяем, существует ли таблица study (для foreign key)
          // try {
          //   await client.query('SELECT 1 FROM study LIMIT 1');
          // } catch {
          //   // Если таблица study не существует, создаем и ее
          //   await createTable(Tables.STUDY);
          //   console.log('Table "study" created as prerequisite');
          // }
          
          // Возвращаем пустой массив, так как таблица только что создана
          return NextResponse.json([], { status: 200 });
        }
        
        // Если это другая ошибка, пробрасываем ее
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
      
    } finally {
      if (client) {
        client.release();
      }
    }
  }

  // POST: create or update a table. Используется для построчного обновления/сохранения данных в БД.
  async createOrUpdateTable(table: Tables, request: NextRequest): Promise<NextResponse> {
    try {
      const data = await request.json();
      console.log('data id: ', data)
      if (data.id) {
        // Update existing table record
        const id = Number(data.id);
        const updates = { ...data };
        delete updates.id;
        await createOrUpdateRecord(table, id, updates);
        return NextResponse.json({ message: `${table} updated with id `, id }, { status: 200 });

      } else {
        // Create empty table
        await createTable(table);
        return NextResponse.json({ message: `${table} table created`}, { status: 200 });
        //return NextResponse.json({ message: 'Study creation not implemented yet' }, { status: 501 });
      }
    } catch (err) {
      console.error(`POST /api/${table} error: `, err);
      return NextResponse.json({ 
        error: `Failed to create or update ${table}`, 
        details: String(err) 
      }, { status: 500 });
    }
  }

  // POST: create or update a table. Используется для пакетного обновления/сохранения данных в БД.
  async bulkCreateOrUpdateTable(table: Tables, request: NextRequest) {
    try {
      const data = await request.json();
      
      if (!Array.isArray(data)) {
        return NextResponse.json(
          { error: `Expected an array of ${table}` },
          { status: 400 }
        );
      }
      
      const savedSites = await bulkSaveData(data);
      
      return NextResponse.json({
        message: `Successfully saved ${savedSites.length} sites`,
        savedSites,
        total: savedSites.length
      }, { status: 200 });
      
    } catch (error) {
      console.error(`POST /api/${table} error:`, error);
      return NextResponse.json(
        { error: `Failed to save ${table}`, details: String(error) },
        { status: 500 }
      );
    }
  }

  // DELETE: delete any record  by id
  async deleteRecord(table: Tables, request: NextRequest): Promise<NextResponse> {
    
    try {
      const data = await request.json();

      if (!data.id) {
        return NextResponse.json({ error: 'Missing study id' }, { status: 400 });
      }

      const id = Number(data.id);
      const client = await connectDB();

      try {
        const result = await client.query(`DELETE FROM ${table} WHERE id = $1 RETURNING *`, [id]);

        if (result.rowCount === 0) {
          return NextResponse.json({ error: `Record with id ${id} in table ${table} not found` }, { status: 404 });
        }

        return NextResponse.json({ message: `Record with id ${id} in table ${table} was deleted` }, { status: 200 });

      } finally {
        client.release();
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

