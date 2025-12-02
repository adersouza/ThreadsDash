/**
 * Production-Safe Logger
 *
 * Replaces console.log with environment-aware logging
 * - Development: Full logging with colors
 * - Production: Minimal logging, no sensitive data
 */

type LogLevel = 'debug' | 'info' | 'warn' | 'error';

interface LogEntry {
  level: LogLevel;
  message: string;
  data?: any;
  timestamp: Date;
}

class Logger {
  private isDevelopment: boolean;
  private enabledLevels: Set<LogLevel>;

  constructor() {
    this.isDevelopment = import.meta.env.DEV || import.meta.env.MODE === 'development';

    // In production, only log warnings and errors
    this.enabledLevels = this.isDevelopment
      ? new Set(['debug', 'info', 'warn', 'error'])
      : new Set(['warn', 'error']);
  }

  /**
   * Sanitize data to remove sensitive information
   */
  private sanitize(data: any): any {
    if (!data) return data;

    // If it's a string, check for sensitive patterns
    if (typeof data === 'string') {
      // Redact tokens, passwords, keys
      if (data.includes('token') || data.includes('password') || data.includes('key')) {
        return '[REDACTED]';
      }
      return data;
    }

    // If it's an object, recursively sanitize
    if (typeof data === 'object') {
      const sanitized: any = Array.isArray(data) ? [] : {};

      for (const key in data) {
        // Redact sensitive field names
        const lowerKey = key.toLowerCase();
        if (
          lowerKey.includes('token') ||
          lowerKey.includes('password') ||
          lowerKey.includes('secret') ||
          lowerKey.includes('key') ||
          lowerKey.includes('auth')
        ) {
          sanitized[key] = '[REDACTED]';
        } else {
          sanitized[key] = this.sanitize(data[key]);
        }
      }

      return sanitized;
    }

    return data;
  }

  /**
   * Format log message
   */
  private format(level: LogLevel, message: string, data?: any): LogEntry {
    return {
      level,
      message,
      data: this.isDevelopment ? data : this.sanitize(data),
      timestamp: new Date(),
    };
  }

  /**
   * Write log entry
   */
  private write(entry: LogEntry): void {
    if (!this.enabledLevels.has(entry.level)) {
      return;
    }

    const timestamp = entry.timestamp.toISOString();
    const prefix = `[${timestamp}] [${entry.level.toUpperCase()}]`;

    switch (entry.level) {
      case 'debug':
        if (this.isDevelopment) {
          console.debug(prefix, entry.message, entry.data || '');
        }
        break;

      case 'info':
        if (this.isDevelopment) {
          console.info(prefix, entry.message, entry.data || '');
        }
        break;

      case 'warn':
        console.warn(prefix, entry.message, entry.data || '');
        break;

      case 'error':
        console.error(prefix, entry.message, entry.data || '');
        // In production, you might want to send errors to a service like Sentry
        if (!this.isDevelopment && typeof window !== 'undefined') {
          // TODO: Send to error tracking service
          // Example: Sentry.captureException(entry);
        }
        break;
    }
  }

  /**
   * Debug level logging (development only)
   */
  debug(message: string, data?: any): void {
    this.write(this.format('debug', message, data));
  }

  /**
   * Info level logging (development only)
   */
  info(message: string, data?: any): void {
    this.write(this.format('info', message, data));
  }

  /**
   * Warning level logging
   */
  warn(message: string, data?: any): void {
    this.write(this.format('warn', message, data));
  }

  /**
   * Error level logging
   */
  error(message: string, error?: Error | any): void {
    const errorData = error instanceof Error
      ? {
          name: error.name,
          message: error.message,
          stack: this.isDevelopment ? error.stack : undefined,
        }
      : error;

    this.write(this.format('error', message, errorData));
  }
}

// Export singleton instance
export const logger = new Logger();

// Export convenience methods
export const { debug, info, warn, error } = logger;
