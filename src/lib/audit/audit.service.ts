// import { randomUUID } from 'crypto';
// import { NextRequest } from 'next/server';
// import { AuditLogEntry, AuditAction, AuditEntity, AuditStatus } from '@/types/types';
// import { connectDB } from '@/lib/db';

// export class AuditService {
//   static async log(entry: Omit<AuditLogEntry, 'audit_id' | 'created_at'>) {
//     try {

//       const client = await connectDB();

//       const auditEntry: AuditLogEntry = {
//         audit_id: randomUUID(),
//         created_at: new Date().toISOString(),
//         ...entry
//       };

//       const query = `
//         INSERT INTO audit_logs (
//           audit_id, timestamp, user_id, user_email, user_role,
//           action, entity_type, entity_id, old_value, new_value,
//           ip_address, user_agent, session_id, status, error_message,
//           reason, site_id, study_id
//         ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18)
//       `;

//       const values = [
//         auditEntry.audit_id,
//         auditEntry.created_at,
//         auditEntry.user_id,
//         auditEntry.user_email,
//         auditEntry.user_role,
//         auditEntry.action,
//         auditEntry.entity_type,
//         auditEntry.entity_id,
//         JSON.stringify(auditEntry.old_value),
//         JSON.stringify(auditEntry.new_value),
//         auditEntry.ip_address,
//         auditEntry.user_agent,
//         auditEntry.session_id,
//         auditEntry.status,
//         auditEntry.error_message,
//         auditEntry.reason,
//         auditEntry.site_id,
//         auditEntry.study_id
//       ];

//       await client.query(query, values);
//       return auditEntry;

//     } catch (error) {
//       console.error('Failed to write audit log:', error);
//       // Никогда не бросаем ошибку из аудита
//       return null;
//     }
//   }

//   static extractMetadata(request: NextRequest) {
//     // Получаем IP из различных заголовков
//     const forwardedFor = request.headers.get('x-forwarded-for');
//     const realIp = request.headers.get('x-real-ip');
//     const cfConnectingIp = request.headers.get('cf-connecting-ip'); // Cloudflare
    
//     let ip_address = '0.0.0.0';
    
//     if (forwardedFor) {
//       // X-Forwarded-For может содержать список IP: client, proxy1, proxy2
//       ip_address = forwardedFor.split(',')[0].trim();
//     } else if (realIp) {
//       ip_address = realIp;
//     } else if (cfConnectingIp) {
//       ip_address = cfConnectingIp;
//     }

//     return {
//       ip_address,
//       user_agent: request.headers.get('user-agent') || 'unknown',
//       session_id: request.cookies.get('session-id')?.value || 
//                   request.headers.get('x-session-id') || 
//                   randomUUID()
//     };
//   }

//   static getUserFromRequest(request: NextRequest) {
//     // Получаем пользователя из заголовков (устанавливается в middleware)
//     const userId = request.headers.get('x-user-id');
//     const userEmail = request.headers.get('x-user-email');
//     const userRole = request.headers.get('x-user-roles');

//     return {
//       user_id: userId ? parseInt(userId) : 0,
//       user_email: userEmail || 'system',
//       user_role: userRole ? JSON.parse(userRole) : []
//     };
//   }

//   static generateSessionId(): string {
//     return randomUUID();
//   }
// }

// lib/audit/audit.service.ts
import { randomUUID } from 'crypto';
import { NextRequest } from 'next/server';
import { AuditLogEntry, AuditAction, AuditEntity, AuditStatus } from '@/types/types';
import { connectDB } from '@/lib/db';
import { AuditTrialTable } from '@/lib/db/schema';

export class AuditService {
  // Проверка существования таблицы аудита и создание при необходимости
  private static async ensureAuditTable() {
    const client = await connectDB();
    try {
      // Проверяем существование таблицы audit
      const checkQuery = `
        SELECT EXISTS (
          SELECT FROM information_schema.tables 
          WHERE table_schema = 'public' 
          AND table_name = 'audit'
        );
      `;
      
      const result = await client.query(checkQuery);
      const tableExists = result.rows[0].exists;
      
      if (!tableExists) {
        console.log('⚠️ Audit table does not exist. Creating it now...');
        
        // Получаем SQL для создания таблицы аудита
        const createTableSQL = AuditTrialTable;
        
        // Создаем таблицу
        await client.query(createTableSQL);
        
        console.log('✅ Audit table created successfully');
        
        // Логируем создание таблицы аудита (рекурсивно, но skip проверит)
        await this.log({
          user_id: 0,
          user_email: 'system',
          user_role: [],
          action: 'CREATE',
          entity_type: 'audit',
          entity_id: 0,
          old_value: null,
          new_value: { table: 'audit', created_at: new Date().toISOString() },
          ip_address: '0.0.0.0',
          user_agent: 'system',
          session_id: randomUUID(),
          status: 'SUCCESS',
          error_message: '',
          reason: 'Automatic audit table creation',
          site_id: '',
          study_id: ''
        });
      }
      
      return tableExists;
    } catch (error) {
      console.error('Failed to ensure audit table exists:', error);
      throw error;
    } finally {
      client.release();
    }
  }

  static async log(entry: Omit<AuditLogEntry, 'audit_id' | 'created_at'>): Promise<AuditLogEntry | null> {
    let client;
    
    try {
      // Убеждаемся, что таблица аудита существует
      await this.ensureAuditTable();

      client = await connectDB();

      const auditEntry: AuditLogEntry = {
        audit_id: randomUUID(),
        created_at: new Date().toISOString(),
        ...entry
      };

      // Проверяем существование колонок для обратной совместимости
      await this.ensureAuditColumns(client);

      const query = `
        INSERT INTO audit (
          audit_id, created_at, user_id, user_email, user_role,
          action, entity_type, entity_id, old_value, new_value,
          ip_address, user_agent, session_id, status, error_message,
          reason, site_id, study_id
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18)
      `;

      const values = [
        auditEntry.audit_id,
        auditEntry.created_at,
        auditEntry.user_id,
        auditEntry.user_email,
        JSON.stringify(auditEntry.user_role),
        auditEntry.action,
        auditEntry.entity_type,
        auditEntry.entity_id,
        auditEntry.old_value ? JSON.stringify(auditEntry.old_value) : null,
        auditEntry.new_value ? JSON.stringify(auditEntry.new_value) : null,
        auditEntry.ip_address,
        auditEntry.user_agent,
        auditEntry.session_id,
        auditEntry.status,
        auditEntry.error_message || null,
        auditEntry.reason || null,
        auditEntry.site_id?.toString() || null,
        auditEntry.study_id?.toString() || null
      ];

      await client.query(query, values);
      return auditEntry;

    } catch (error) {
      console.error('Failed to write audit log:', error);
      
      // Специальная обработка для ошибки "column does not exist"
      if (error instanceof Error && error.message.includes('column')) {
        console.warn('⚠️ Audit table schema mismatch. Attempting to recreate table...');
        
        // Если ошибка связана с колонками, пробуем пересоздать таблицу
        if (client) {
          try {
            await this.recreateAuditTable();
            
            // Повторяем попытку записи
            return await this.retryLog(entry);
          } catch (recreateError) {
            console.error('Failed to recreate audit table:', recreateError);
          }
        }
      }
      
      // Никогда не бросаем ошибку из аудита
      return null;
    } finally {
      if (client) {
        client.release();
      }
    }
  }

  // Повторная попытка записи после создания таблицы
  private static async retryLog(entry: Omit<AuditLogEntry, 'audit_id' | 'created_at'>) {
    try {
      return await this.log(entry);
    } catch {
      return null;
    }
  }

  // Проверка и создание недостающих колонок
  private static async ensureAuditColumns(client: any) {
    try {
      // Проверяем существование колонки created_at
      const columnCheck = await client.query(`
        SELECT EXISTS (
          SELECT FROM information_schema.columns 
          WHERE table_name = 'audit' 
          AND column_name = 'created_at'
        );
      `);

      if (!columnCheck.rows[0].exists) {
        console.log('Adding missing column: created_at');
        await client.query(`
          ALTER TABLE audit 
          ADD COLUMN IF NOT EXISTS created_at TIMESTAMPTZ DEFAULT NOW();
        `);
      }

      // Проверяем существование других необходимых колонок
      const requiredColumns = [
        'audit_id', 'user_id', 'user_email', 'user_role', 'action',
        'entity_type', 'entity_id', 'old_value', 'new_value',
        'ip_address', 'user_agent', 'session_id', 'status',
        'error_message', 'reason', 'site_id', 'study_id'
      ];

      for (const column of requiredColumns) {
        const columnCheck = await client.query(`
          SELECT EXISTS (
            SELECT FROM information_schema.columns 
            WHERE table_name = 'audit' 
            AND column_name = $1
          );
        `, [column]);

        if (!columnCheck.rows[0].exists) {
          console.log(`Adding missing column: ${column}`);
          
          let columnType = 'TEXT';
          if (column.includes('id') && column !== 'audit_id' && column !== 'session_id') {
            columnType = 'INTEGER';
          } else if (column === 'created_at') {
            columnType = 'TIMESTAMPTZ';
          } else if (column.includes('value')) {
            columnType = 'JSONB';
          } else if (column === 'user_role') {
            columnType = 'JSONB';
          }

          await client.query(`
            ALTER TABLE audit 
            ADD COLUMN IF NOT EXISTS ${column} ${columnType} NULL;
          `);
        }
      }

    } catch (error) {
      console.error('Failed to ensure audit columns:', error);
    }
  }

  // Пересоздание таблицы аудита (в крайнем случае)
  private static async recreateAuditTable() {
    const client = await connectDB();
    try {
      console.warn('⚠️ Recreating audit table...');
      
      // Получаем SQL для создания таблицы
      const createTableSQL = AuditTrialTable;
      
      // Удаляем старую таблицу если существует
      await client.query(`DROP TABLE IF EXISTS audit CASCADE;`);
      
      // Создаем новую таблицу
      await client.query(createTableSQL);
      
      console.log('✅ Audit table recreated successfully');
    } finally {
      client.release();
    }
  }

  static extractMetadata(request: NextRequest) {
    // Получаем IP из различных заголовков
    const forwardedFor = request.headers.get('x-forwarded-for');
    const realIp = request.headers.get('x-real-ip');
    const cfConnectingIp = request.headers.get('cf-connecting-ip'); // Cloudflare
    
    let ip_address = '0.0.0.0';
    
    if (forwardedFor) {
      ip_address = forwardedFor.split(',')[0].trim();
    } else if (realIp) {
      ip_address = realIp;
    } else if (cfConnectingIp) {
      ip_address = cfConnectingIp;
    }

    return {
      ip_address,
      user_agent: request.headers.get('user-agent') || 'unknown',
      session_id: request.cookies.get('session-id')?.value || 
                  request.headers.get('x-session-id') || 
                  randomUUID()
    };
  }

  static getUserFromRequest(request: NextRequest) {
    const userId = request.headers.get('x-user-id');
    const userEmail = request.headers.get('x-user-email');
    const userRole = request.headers.get('x-user-roles');

    let parsedRole = [];
    try {
      parsedRole = userRole ? JSON.parse(userRole) : [];
    } catch {
      parsedRole = [];
    }

    return {
      user_id: userId ? parseInt(userId) : 0,
      user_email: userEmail || 'system',
      user_role: parsedRole
    };
  }

  static generateSessionId(): string {
    return randomUUID();
  }

  // Метод для проверки статуса аудита
  static async healthCheck() {
    try {
      await this.ensureAuditTable();
      
      const client = await connectDB();
      try {
        const result = await client.query(`
          SELECT 
            COUNT(*) as total_logs,
            MAX(created_at) as last_log,
            MIN(created_at) as first_log
          FROM audit
        `);
        
        return {
          status: 'healthy',
          table_exists: true,
          stats: result.rows[0],
          created_at: new Date().toISOString()
        };
      } finally {
        client.release();
      }
    } catch (error) {
      return {
        status: 'unhealthy',
        error: error instanceof Error ? error.message : 'Unknown error',
        created_at: new Date().toISOString()
      };
    }
  }
}