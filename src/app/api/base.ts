// import { NextRequest, NextResponse } from 'next/server';
// import { createOrUpdateRecord } from '@/lib/db/study';
// import { connectDB, createTable } from '@/lib/db/index';
// import { Tables, UserQueries } from '@/lib/db/schema';
// import { bulkSaveData } from '@/lib/db/site';


// export class StudyApiHandler {
//   // GET: get all records from table
//   async getTable(table: Tables): Promise<NextResponse> {
//     let client;
//     try {
//       client = await connectDB();
      
//       try {
//         const result = await client.query(`SELECT * FROM ${table} ORDER BY id ASC`);
//         return NextResponse.json(result.rows, { status: 200 });
        
//       } catch (dbError) {
//         const errorMessage = String(dbError);
        
//         if (errorMessage.includes(`relation ${table} does not exist`) || 
//             errorMessage.includes(`table ${table} does not exist`)) {
          
//           console.log(`Table ${table} does not exist, creating it...`);
//           await createTable(table);
//           return NextResponse.json([], { status: 200 });
//         }
        
//         throw dbError;
//       }
      
//     } catch (err) {
//       console.error(`GET /api/${table} error: `, err);
//       return NextResponse.json({ 
//         error: 'Failed to fetch studies', 
//         details: String(err) 
//       }, { status: 500 });
      
//     } finally {
//       if (client) {
//         client.release();
//       }
//     }
//   }


//   async getTablePartial(table: Tables, request: NextRequest) {
//     let client;
    
//     try {
//       client = await connectDB();
//       console.log('request.nextUrl.searchParams', request.nextUrl.searchParams)
//       // Получаем ID исследования из параметров запроса
//       const studyId = request.nextUrl.searchParams.get('studyId');
      
//       if (!studyId) {
//         return NextResponse.json(
//           { error: 'Study ID is required' },
//           { status: 400 }
//         );
//       }
      
//       try {
//         // Оформляем запрос в зависимости от типа таблиы
//         const qureyText = table === Tables.USERS
//           ? UserQueries.getUsersByStudy(parseInt(studyId))
//           : `SELECT * FROM ${table} WHERE study_id = $1 ORDER BY number ASC`;
//         // Пытаемся получить часть таблицы по ID для исследования
//         // const result = await client.query(
//         //   `SELECT * FROM ${table} WHERE study_id = $1 ORDER BY number ASC`,
//         //   [studyId]
//         // );
//         const result = await client.query(qureyText, [studyId]);
        
//         return NextResponse.json(result.rows, { status: 200 });
        
//       } catch (dbError) {
//         const errorMessage = String(dbError);
        
//         // Если таблица не существует
//         if (errorMessage.includes(`relation "${table}" does not exist`) || 
//             errorMessage.includes(`table "${table}" does not exist`)) {
          
//           console.log(`Table ${table} does not exist, creating it...`);
          
//           // Создаем таблицу
//           await createTable(table);
          
//           // Проверяем, существует ли таблица study (для foreign key)
//           // try {
//           //   await client.query('SELECT 1 FROM study LIMIT 1');
//           // } catch {
//           //   // Если таблица study не существует, создаем и ее
//           //   await createTable(Tables.STUDY);
//           //   console.log('Table "study" created as prerequisite');
//           // }
          
//           // Возвращаем пустой массив, так как таблица только что создана
//           return NextResponse.json([], { status: 200 });
//         }
        
//         // Если это другая ошибка, пробрасываем ее
//         throw dbError;
//       }
      
//     } catch (err) {
//       console.error(`GET /api/${table} error:`, err);
//       return NextResponse.json(
//         { 
//           error: `Failed to fetch data from table ${table}`, 
//           details: String(err) 
//         }, 
//         { status: 500 }
//       );
      
//     } finally {
//       if (client) {
//         client.release();
//       }
//     }
//   }

//   // POST: create or update a table. Используется для построчного обновления/сохранения данных в БД.
//   async createOrUpdateTable(table: Tables, request: NextRequest): Promise<NextResponse> {
//     try {
//       const data = await request.json();
//       if (data.id) {
//         // Update existing table record
//         const id = Number(data.id);
//         const updates = { ...data };
//         delete updates.id;
//         await createOrUpdateRecord(table, id, updates);
//         return NextResponse.json({ message: `${table} updated with id `, id }, { status: 200 });

//       } else {
//         // Create empty table
//         await createTable(table);
//         return NextResponse.json({ message: `${table} table created`}, { status: 200 });
//         //return NextResponse.json({ message: 'Study creation not implemented yet' }, { status: 501 });
//       }
//     } catch (err) {
//       console.error(`POST /api/${table} error: `, err);
//       return NextResponse.json({ 
//         error: `Failed to create or update ${table}`, 
//         details: String(err) 
//       }, { status: 500 });
//     }
//   }

//   // POST: create or update a table. Используется для пакетного обновления/сохранения данных в БД.
//   async bulkCreateOrUpdateTable(table: Tables, request: NextRequest) {
//     try {
//       const data = await request.json();
      
//       if (!Array.isArray(data)) {
//         return NextResponse.json(
//           { error: `Expected an array of ${table}` },
//           { status: 400 }
//         );
//       }
      
//       const savedSites = await bulkSaveData(data);
      
//       return NextResponse.json({
//         message: `Successfully saved ${savedSites.length} sites`,
//         savedSites,
//         total: savedSites.length
//       }, { status: 200 });
      
//     } catch (error) {
//       console.error(`POST /api/${table} error:`, error);
//       return NextResponse.json(
//         { error: `Failed to save ${table}`, details: String(error) },
//         { status: 500 }
//       );
//     }
//   }

//   // DELETE: delete any record  by id
//   async deleteRecord(table: Tables, request: NextRequest): Promise<NextResponse> {
    
//     try {
//       const data = await request.json();

//       if (!data.id) {
//         return NextResponse.json({ error: 'Missing study id' }, { status: 400 });
//       }

//       const id = Number(data.id);
//       const client = await connectDB();

//       try {
//         const result = await client.query(`DELETE FROM ${table} WHERE id = $1 RETURNING *`, [id]);

//         if (result.rowCount === 0) {
//           return NextResponse.json({ error: `Record with id ${id} in table ${table} not found` }, { status: 404 });
//         }

//         return NextResponse.json({ message: `Record with id ${id} in table ${table} was deleted` }, { status: 200 });

//       } finally {
//         client.release();
//       }
//     } catch (err) {
//       console.error(`DELETE /api/${table} error: `, err);
//       return NextResponse.json({ 
//         error: `Failed to delete record in ${table}`, 
//         details: String(err) 
//       }, { status: 500 });
//     }
//   }
// }

// base.ts
import { NextRequest, NextResponse } from 'next/server';
import { createOrUpdateRecord } from '@/lib/db/study';
import { connectDB, createTable } from '@/lib/db/index';
import { Tables, UserQueries } from '@/lib/db/schema';
import { bulkSaveData } from '@/lib/db/site';
import { withAudit } from '@/lib/audit/audit.middleware';
import { AuditAction, AuditEntity } from '@/types/types';

export class StudyApiHandler {
  // GET: get all records from table
  async getTable(table: Tables): Promise<NextResponse> {
    let client;
    try {
      client = await connectDB();
      
      try {
        const result = await client.query(`SELECT * FROM ${table} ORDER BY id ASC`);
        
        // Аудит для READ операции (массовое чтение)
        const auditMiddleware = withAudit({
          action: 'READ',
          entityType: this.mapTableToEntity(table),
          skip: () => true // Пропускаем аудит для массовых чтений
        });

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

  // GET: get filtered records by study ID
  async getTablePartial(table: Tables, request: NextRequest) {
    let client;
    
    try {
      client = await connectDB();
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
        
        // Аудит для READ операции с фильтром
        const auditMiddleware = withAudit({
          action: 'READ',
          entityType: this.mapTableToEntity(table),
          getStudyId: () => studyId,
          skip: () => true // Пропускаем аудит для массовых чтений
        });

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
      
    } finally {
      if (client) {
        client.release();
      }
    }
  }

  // POST: create or update a record. Используется для построчного обновления/сохранения данных в БД.
async createOrUpdateTable(table: Tables, request: NextRequest): Promise<NextResponse> {
  // Читаем данные только ОДИН раз
  const data = await request.json().catch(() => ({}));
  const action: AuditAction = data.id ? 'UPDATE' : 'CREATE';
  
  const auditMiddleware = withAudit({
    action,
    entityType: this.mapTableToEntity(table),
    getEntityId: () => data?.id || 0,
    getStudyId: () => data?.study_id || data?.studyId || '',
    getSiteId: () => data?.site_id || data?.siteId || '',
    getOldValue: async () => {
      if (data?.id) {
        const client = await connectDB();
        try {
          const result = await client.query(
            `SELECT * FROM ${table} WHERE id = $1`,
            [data.id]
          );
          return result.rows[0] || null;
        } catch {
          return null;
        } finally {
          client.release();
        }
      }
      return null;
    },
    getNewValue: () => data
  });

  // Передаем данные в middleware, чтобы он не пытался читать request снова
  return auditMiddleware(request, async () => {
    try {
      if (data.id) {
        // Update existing record
        const id = Number(data.id);
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
  });
}

  // POST: bulk create or update. Используется для пакетного обновления/сохранения данных в БД.
  async bulkCreateOrUpdateTable(table: Tables, request: NextRequest) {
    try {
      const data = await request.json();
      
      if (!Array.isArray(data)) {
        return NextResponse.json(
          { error: `Expected an array of ${table}` },
          { status: 400 }
        );
      }

      // Аудит для массовой операции
      const savedSites = await bulkSaveData(data);
      
      // Логируем массовую операцию (одна запись на весь bulk)
      const auditMiddleware = withAudit({
        action: data.length > 0 && data[0].id ? 'UPDATE' : 'CREATE',
        entityType: this.mapTableToEntity(table),
        getEntityId: () => 0, // 0 означает массовую операцию
        getStudyId: (req) => {
          const firstItem = data[0];
          return firstItem?.study_id || firstItem?.studyId || '';
        },
        getNewValue: () => ({ 
          count: savedSites.length,
          ids: savedSites.map(s => s.id)
        })
      });

      return auditMiddleware(request, async () => {
        return NextResponse.json({
          message: `Successfully saved ${savedSites.length} ${table}`,
          savedSites,
          total: savedSites.length
        }, { status: 200 });
      });

    } catch (error) {
      console.error(`POST /api/${table} error:`, error);
      return NextResponse.json(
        { error: `Failed to save ${table}`, details: String(error) },
        { status: 500 }
      );
    }
  }

  // DELETE: delete any record by id
  async deleteRecord(table: Tables, request: NextRequest): Promise<NextResponse> {
    const auditMiddleware = withAudit({
      action: 'DELETE',
      entityType: this.mapTableToEntity(table),
      getEntityId: (req, body) => body?.id || 0,
      getStudyId: (req, body) => body?.study_id || body?.studyId || '',
      getSiteId: (req, body) => body?.site_id || body?.siteId || '',
      getOldValue: async (req, body) => {
        if (body?.id) {
          const client = await connectDB();
          try {
            const result = await client.query(
              `SELECT * FROM ${table} WHERE id = $1`,
              [body.id]
            );
            return result.rows[0] || null;
          } catch {
            return null;
          } finally {
            client.release();
          }
        }
        return null;
      }
    });

    return auditMiddleware(request, async () => {
      try {
        const data = await request.json();

        if (!data.id) {
          return NextResponse.json(
            { error: `Missing ${table} id` }, 
            { status: 400 }
          );
        }

        const id = Number(data.id);
        const client = await connectDB();

        try {
          const result = await client.query(
            `DELETE FROM ${table} WHERE id = $1 RETURNING *`, 
            [id]
          );

          if (result.rowCount === 0) {
            return NextResponse.json(
              { error: `Record with id ${id} in table ${table} not found` }, 
              { status: 404 }
            );
          }

          return NextResponse.json(
            { message: `Record with id ${id} in table ${table} was deleted` }, 
            { status: 200 }
          );

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
    });
  }

  // Вспомогательный метод для маппинга таблиц на типы сущностей аудита
  private mapTableToEntity(table: Tables): AuditEntity {
    const mapping: Record<Tables, AuditEntity> = {
      [Tables.STUDY]: 'study',
      [Tables.SITE]: 'site',
      [Tables.USERS]: 'user',
      [Tables.DOCUMENT]: 'document',
      [Tables.AUDIT]: 'audit',
    };
    
    return mapping[table] || 'document';
  }

  // Специализированный метод для логина (используется в auth routes)
  async logLoginAttempt(request: NextRequest, userId: number, userEmail: string, success: boolean, errorMessage?: string) {
    const auditMiddleware = withAudit({
      action: success ? 'LOGIN' : 'LOGIN_FAILED',
      entityType: 'user',
      getEntityId: () => userId,
      getStudyId: () => '',
      getSiteId: () => ''
    });

    return auditMiddleware(request, async () => {
      return NextResponse.json({ success });
    });
  }

  // Специализированный метод для экспорта
  async logExport(request: NextRequest, entityType: AuditEntity, entityId: number, studyId: string | number) {
    const auditMiddleware = withAudit({
      action: 'EXPORT',
      entityType,
      getEntityId: () => entityId,
      getStudyId: () => studyId
    });

    return auditMiddleware(request, async () => {
      return NextResponse.json({ success: true });
    });
  }

  // Специализированный метод для approve/reject
  async logApproval(request: NextRequest, action: 'APPROVE' | 'REJECT', entityType: AuditEntity, entityId: number, studyId: string | number, reason?: string) {
    const auditMiddleware = withAudit({
      action,
      entityType,
      getEntityId: () => entityId,
      getStudyId: () => studyId,
      getNewValue: () => ({ status: action, reason })
    });

    return auditMiddleware(request, async () => {
      return NextResponse.json({ success: true });
    });
  }
}

// Создаем и экспортируем singleton instance
export const studyApiHandler = new StudyApiHandler();