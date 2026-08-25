export type LogLevel = 'debug' | 'info' | 'warn' | 'error';

export interface LogEntry {
  timestamp: string;
  level: LogLevel;
  context: string;
  message: string;
  data?: Record<string, unknown>;
}

class LoggerService {
  private logs: LogEntry[] = [];
  private readonly maxLogs = 200;

  private log(level: LogLevel, context: string, message: string, data?: Record<string, unknown>) {
    const entry: LogEntry = {
      timestamp: new Date().toISOString(),
      level,
      context,
      message,
      data,
    };

    this.logs.push(entry);
    if (this.logs.length > this.maxLogs) {
      this.logs.shift();
    }

    const prefix = `[SevenPOS:${context}]`;
    if (level === 'error') {
      console.error(prefix, message, data || '');
    } else if (level === 'warn') {
      console.warn(prefix, message, data || '');
    } else if (level === 'info') {
      console.info(prefix, message, data || '');
    } else {
      console.debug(prefix, message, data || '');
    }
  }

  debug(context: string, message: string, data?: Record<string, unknown>) {
    this.log('debug', context, message, data);
  }

  info(context: string, message: string, data?: Record<string, unknown>) {
    this.log('info', context, message, data);
  }

  warn(context: string, message: string, data?: Record<string, unknown>) {
    this.log('warn', context, message, data);
  }

  error(context: string, message: string, data?: Record<string, unknown>) {
    this.log('error', context, message, data);
  }

  getRecentLogs(): LogEntry[] {
    return [...this.logs];
  }
}

export const logger = new LoggerService();
