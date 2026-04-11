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
 * import { logger } from '@/lib/utils/logger';
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
  location?: string;
  message: string;
  data?: any;
  error?: string;
  stack?: string;
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

  /**
   * Parses and formats stack trace to show source file locations
   * Attempts to extract original source files from Next.js compiled bundles
   */
  private parseStackTrace(stack: string): string {
    const lines = stack.split('\n');
    const formattedLines: string[] = [];

    for (const line of lines) {
      // Try to extract file:line:column
      const match = line.match(/at\s+(?:(.+)\s+\()?\[?([^\s)]+\.(ts|tsx|js|jsx)):(\d+):(\d+)\]?/);
      if (match) {
        const [, funcName, filePath, , lineNum, colNum] = match;
        const srcMatch = filePath.match(/src\/.+/);
        const displayPath = srcMatch ? srcMatch[0] : filePath.split('/').slice(-3).join('/');
        const func = funcName ? `${funcName} ` : '';
        formattedLines.push(`    at ${func}(${displayPath}:${lineNum}:${colNum})`);
      } else {
        formattedLines.push(line);
      }
    }

    return formattedLines.join('\n');
  }

  /**
   * Gets the caller location (file and line number) from the stack trace
   */
  private getCallerLocation(): string {
    const error = new Error();
    const stack = error.stack;
    if (!stack) return 'unknown';

    const lines = stack.split('\n');
    // Stack format: Error\n    at getCallerLocation (logger.ts)\n    at log (logger.ts)\n    at error (logger.ts)\n    at caller (actual-file.ts:123:45)
    // We want the 5th line (skipping Error + getCallerLocation + log + error + caller)
    const callerLine = lines[5];
    if (!callerLine) return 'unknown';

    // Extract file:line:column from "    at functionName (/path/to/file.ts:123:45)"
    // or "    at /path/to/file.ts:123:45"
    const match = callerLine.match(/\(?([^)]+\.(ts|tsx|js|jsx)):(\d+):(\d+)\)?/);
    if (match) {
      const [, filePath, , line, column] = match;
      // Extract relative path from project root
      const srcMatch = filePath.match(/src\/.+/);
      const path = srcMatch ? srcMatch[0] : filePath.split('/').slice(-3).join('/');
      return `${path}:${line}:${column}`;
    }

    return 'unknown';
  }

  private formatLog(entry: LogEntry): string {
    const { timestamp, level, location, message, data } = entry;
    let output = `[${timestamp}] [${level}]`;

    if (location) {
      output += ` [${location}]`;
    }

    output += ` ${message}`;

    if (data) {
      output += ` | ${JSON.stringify(data)}`;
    }

    if (entry.error) {
      output += ` | Error: ${entry.error}`;
    }

    return output;
  }

  /**
   * Extracts error information from any error type
   */
  private extractErrorInfo(error: unknown): { message: string; stack?: string; name?: string } {
    if (error instanceof Error) {
      return {
        message: error.message,
        stack: error.stack,
        name: error.name,
      };
    }

    if (typeof error === 'string') {
      return { message: error };
    }

    if (typeof error === 'object' && error !== null) {
      // Handle error-like objects (e.g., from fetch responses)
      const errorObj = error as Record<string, unknown>;
      const message = typeof errorObj.message === 'string' 
        ? errorObj.message 
        : JSON.stringify(errorObj);
      const stack = typeof errorObj.stack === 'string' ? errorObj.stack : undefined;
      const name = typeof errorObj.name === 'string' ? errorObj.name : undefined;
      return { message, stack, name };
    }

    return { message: String(error) };
  }

  private log(level: LogLevel, message: string, data?: any, error?: unknown): void {
    if (!this.shouldLog(level)) return;

    const errorInfo = error ? this.extractErrorInfo(error) : undefined;
    // Capture caller location only for errors (perf optimization)
    const location = level === LogLevel.ERROR ? this.getCallerLocation() : undefined;

    const entry: LogEntry = {
      timestamp: new Date().toISOString(),
      level,
      location,
      message,
      data,
      error: errorInfo?.message,
      stack: this.isDevelopment ? errorInfo?.stack : undefined,
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
        // Only show stack trace in development for better production logs
        if (this.isDevelopment && errorInfo?.stack) {
          console.error('\n--- Stack Trace ---');
          console.error(this.parseStackTrace(errorInfo.stack));
          console.error('--- End Stack Trace ---\n');
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

  error(message: string, error?: unknown | null, data?: any): void {
    this.log(LogLevel.ERROR, message, data, error ?? undefined);
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
