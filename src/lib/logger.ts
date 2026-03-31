/**
 * Logger utility for application
 * Using console-based logging for server-side operations
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

  error(message: string, error?: Error | null, data?: any): void {
    this.log(LogLevel.ERROR, message, data, error || undefined);
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
