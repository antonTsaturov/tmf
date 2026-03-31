/**
 * 🎯 СТРУКТУРИРОВАННАЯ СИСТЕМА ЛОГИРОВАНИЯ
 * 
 * ═══════════════════════════════════════════════════════════════════════════
 * 
 * 📍 ГДЕ ЗАПИСЫВАЮТСЯ ЛОГИ
 * ═══════════════════════════════════════════════════════════════════════════
 * 
 * 1. КОНСОЛЬ (stdout/stderr) - ВСЕГДА включена:
 *    - DEBUG логи: только в разработке (NODE_ENV='development')
 *    - INFO, WARN, ERROR логи: всегда выводятся
 *    
 *    Пример вывода:
 *    [2026-03-31T10:23:45.123Z] [INFO] AUTH: LOGIN_SUCCESS | {...}
 *    [2026-03-31T10:24:10.456Z] [WARN] AUTH_ERROR: LOGIN_INVALID
 *    [2026-03-31T10:25:30.789Z] [ERROR] Database connection failed
 * 
 * 2. ФАЙЛОВАЯ СИСТЕМА (только production):
 *    Логи можно перенаправить в файл командой:
 *    npm run start > app.log 2>&1
 * 
 * ═══════════════════════════════════════════════════════════════════════════
 * 
 * 🔍 КАК ПРОСМАТРИВАТЬ ЛОГИ
 * ═══════════════════════════════════════════════════════════════════════════
 * 
 * РАЗРАБОТКА (development):
 *    npm run dev
 *    → логи видны прямо в терминале, обновляются в реальном времени
 * 
 * PRODUCTION:
 *    # Запуск с логированием в файл
 *    npm run start > logs/app.log 2>&1 &
 * 
 *    # Просмотр в реальном времени
 *    tail -f logs/app.log
 * 
 *    # Последние 100 строк
 *    tail -100 logs/app.log
 * 
 *    # Фильтрация по типам:
 *    grep "AUTH" logs/app.log              # все логи аутентификации
 *    grep "\[ERROR\]" logs/app.log         # только ошибки
 *    grep "LOGIN_BLOCKED" logs/app.log     # блокировки входа
 * 
 *    # Анализ:
 *    grep "LOGIN_INVALID_PASSWORD" logs/app.log | wc -l  # кол-во попыток
 *    grep '"ip":"192.168.1.1"' logs/app.log            # логи по IP
 * 
 * ═══════════════════════════════════════════════════════════════════════════
 * 
 * 📝 ПРИМЕРЫ ИСПОЛЬЗОВАНИЯ
 * ═══════════════════════════════════════════════════════════════════════════
 * 
 * import { logger } from '@/lib/logger';
 * 
 * // Информационный лог
 * logger.info('User registered', { userId: user.id, email: user.email });
 * 
 * // Предупреждение
 * logger.warn('Slow query detected', { queryTime: '5000ms', query: 'SELECT...' });
 * 
 * // Ошибка с исключением
 * try {
 *   await riskyOperation();
 * } catch (error) {
 *   logger.error('Operation failed', error, { userId: user.id });
 * }
 * 
 * // Специализированные методы
 * logger.authLog('LOGIN_SUCCESS', userId, 'Logged in successfully', { ip });
 * logger.dbLog('USER_UPDATE', 'users', { changes: 2 });
 * logger.documentLog('UPLOAD', documentId, { size: '5MB' });
 * 
 * ═══════════════════════════════════════════════════════════════════════════
 * 
 * ⚠️ ВАЖНЫЕ ПРАВИЛА
 * ═══════════════════════════════════════════════════════════════════════════
 * 
 * ✅ ЛОГИРУЙ:
 *    - Попытки аутентификации и блокировки
 *    - Критические ошибки и исключения
 *    - Операции с данными (insert, update, delete)
 *    - IP адреса (для безопасности)
 * 
 * ❌ НЕ ЛОГИРУЙ:
 *    - Пароли и приватные ключи
 *    - API токены и JWT
 *    - Полные кредитные карты
 *    - Чувствительные персональные данные
 */

export enum LogLevel {
  DEBUG = 'DEBUG',
  INFO = 'INFO',
  WARN = 'WARN',
  ERROR = 'ERROR',
}

interface LogEntry {
  timestamp: string;
  level: LogLevel;
  message: string;
  data?: any;
  error?: string;
}

class Logger {
  private isDevelopment = process.env.NODE_ENV === 'development';
  private minLogLevel = this.isDevelopment ? LogLevel.DEBUG : LogLevel.INFO;

  private shouldLog(level: LogLevel): boolean {
    const levels = [LogLevel.DEBUG, LogLevel.INFO, LogLevel.WARN, LogLevel.ERROR];
    const currentIndex = levels.indexOf(this.minLogLevel);
    const messageIndex = levels.indexOf(level);
    return messageIndex >= currentIndex;
  }

  private formatLog(entry: LogEntry): string {
    const { timestamp, level, message, data } = entry;
    let output = `[${timestamp}] [${level}] ${message}`;
    
    if (data) {
      output += ` | ${JSON.stringify(data)}`;
    }
    
    return output;
  }

  private log(level: LogLevel, message: string, data?: any, error?: Error): void {
    if (!this.shouldLog(level)) return;

    const entry: LogEntry = {
      timestamp: new Date().toISOString(),
      level,
      message,
      data,
      error: error?.message,
    };

    const formatted = this.formatLog(entry);

    switch (level) {
      case LogLevel.DEBUG:
        console.debug(formatted);
        break;
      case LogLevel.INFO:
        console.info(formatted);
        break;
      case LogLevel.WARN:
        console.warn(formatted);
        break;
      case LogLevel.ERROR:
        console.error(formatted);
        if (error?.stack) {
          console.error(error.stack);
        }
        break;
    }
  }

  debug(message: string, data?: any): void {
    this.log(LogLevel.DEBUG, message, data);
  }

  info(message: string, data?: any): void {
    this.log(LogLevel.INFO, message, data);
  }

  warn(message: string, data?: any): void {
    this.log(LogLevel.WARN, message, data);
  }

  error(message: string, error?: Error | unknown | null, data?: any): void {
    this.log(LogLevel.ERROR, message, data, error instanceof Error ? error : undefined);
  }

  // Специализированные методы для разных модулей
  authLog(action: string, userId?: string, status?: string, data?: any): void {
    this.info(`AUTH: ${action}`, { userId, status, ...data });
  }

  authError(action: string, userId?: string, error?: string, data?: any): void {
    this.warn(`AUTH_ERROR: ${action}`, { userId, error, ...data });
  }

  dbLog(operation: string, table?: string, data?: any): void {
    this.debug(`DB: ${operation}`, { table, ...data });
  }

  dbError(operation: string, table?: string, error?: string): void {
    this.error(`DB_ERROR: ${operation}`, null, { table, error });
  }

  apiLog(method: string, path: string, status?: number, data?: any): void {
    this.info(`API: ${method} ${path}`, { status, ...data });
  }

  apiError(method: string, path: string, error: string, status?: number): void {
    this.error(`API_ERROR: ${method} ${path}`, null, { status, error });
  }

  auditLog(action: string, userId: string, entityType: string, entityId: string, data?: any): void {
    this.info(`AUDIT: ${action}`, { userId, entityType, entityId, ...data });
  }

  documentLog(action: string, documentId?: string, data?: any): void {
    this.info(`DOCUMENT: ${action}`, { documentId, ...data });
  }
}

export const logger = new Logger();
