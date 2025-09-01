export enum LogLevel {
  DEBUG = 0,
  INFO = 1,
  WARN = 2,
  ERROR = 3,
  CRITICAL = 4
}

export interface LogEntry {
  timestamp: string;
  level: LogLevel;
  message: string;
  context?: string;
  data?: any;
  stack?: string;
  userId?: string;
  sessionId?: string;
}

export interface LoggerConfig {
  level: LogLevel;
  enableConsole: boolean;
  enableStorage: boolean;
  maxStorageEntries: number;
  enableRemoteLogging: boolean;
  remoteEndpoint?: string;
}

class Logger {
  private config: LoggerConfig;
  private sessionId: string;
  private logs: LogEntry[] = [];

  constructor(config: Partial<LoggerConfig> = {}) {
    this.config = {
      level: LogLevel.INFO,
      enableConsole: true,
      enableStorage: true,
      maxStorageEntries: 1000,
      enableRemoteLogging: false,
      ...config
    };
    
    this.sessionId = this.generateSessionId();
    this.loadStoredLogs();
  }

  private generateSessionId(): string {
    return `session_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  private loadStoredLogs(): void {
    if (!this.config.enableStorage) return;
    
    try {
      const stored = localStorage.getItem('aithos_logs');
      if (stored) {
        this.logs = JSON.parse(stored);
      }
    } catch (error) {
      console.warn('Failed to load stored logs:', error);
    }
  }

  private saveLogs(): void {
    if (!this.config.enableStorage) return;
    
    try {
      // Keep only the most recent entries
      const recentLogs = this.logs.slice(-this.config.maxStorageEntries);
      localStorage.setItem('aithos_logs', JSON.stringify(recentLogs));
      this.logs = recentLogs;
    } catch (error) {
      console.warn('Failed to save logs:', error);
    }
  }

  private createLogEntry(
    level: LogLevel,
    message: string,
    context?: string,
    data?: any,
    error?: Error
  ): LogEntry {
    return {
      timestamp: new Date().toISOString(),
      level,
      message,
      context,
      data,
      stack: error?.stack,
      sessionId: this.sessionId,
      userId: this.getCurrentUserId()
    };
  }

  private getCurrentUserId(): string | undefined {
    // Get user ID from auth context or localStorage
    try {
      const user = localStorage.getItem('aithos_user');
      return user ? JSON.parse(user).id : undefined;
    } catch {
      return undefined;
    }
  }

  private shouldLog(level: LogLevel): boolean {
    return level >= this.config.level;
  }

  private outputToConsole(entry: LogEntry): void {
    if (!this.config.enableConsole) return;

    const prefix = `[${entry.timestamp}] [${LogLevel[entry.level]}]`;
    const message = entry.context ? `${prefix} [${entry.context}] ${entry.message}` : `${prefix} ${entry.message}`;

    switch (entry.level) {
      case LogLevel.DEBUG:
        console.debug(message, entry.data);
        break;
      case LogLevel.INFO:
        console.info(message, entry.data);
        break;
      case LogLevel.WARN:
        console.warn(message, entry.data);
        break;
      case LogLevel.ERROR:
      case LogLevel.CRITICAL:
        console.error(message, entry.data);
        if (entry.stack) {
          console.error('Stack trace:', entry.stack);
        }
        break;
    }
  }

  private async sendToRemote(entry: LogEntry): Promise<void> {
    if (!this.config.enableRemoteLogging || !this.config.remoteEndpoint) return;

    try {
      await fetch(this.config.remoteEndpoint, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(entry)
      });
    } catch (error) {
      console.warn('Failed to send log to remote endpoint:', error);
    }
  }

  private log(level: LogLevel, message: string, context?: string, data?: any, error?: Error): void {
    if (!this.shouldLog(level)) return;

    const entry = this.createLogEntry(level, message, context, data, error);
    
    this.logs.push(entry);
    this.outputToConsole(entry);
    this.saveLogs();
    
    // Send to remote endpoint asynchronously
    this.sendToRemote(entry).catch(() => {});
  }

  debug(message: string, context?: string, data?: any): void {
    this.log(LogLevel.DEBUG, message, context, data);
  }

  info(message: string, context?: string, data?: any): void {
    this.log(LogLevel.INFO, message, context, data);
  }

  warn(message: string, context?: string, data?: any): void {
    this.log(LogLevel.WARN, message, context, data);
  }

  error(message: string, context?: string, data?: any, error?: Error): void {
    this.log(LogLevel.ERROR, message, context, data, error);
  }

  critical(message: string, context?: string, data?: any, error?: Error): void {
    this.log(LogLevel.CRITICAL, message, context, data, error);
  }

  // Network-specific logging methods
  networkError(url: string, method: string, status?: number, error?: Error): void {
    this.error(
      `Network request failed: ${method} ${url}`,
      'Network',
      { url, method, status },
      error
    );
  }

  apiError(endpoint: string, method: string, status: number, response?: any): void {
    this.error(
      `API request failed: ${method} ${endpoint} (${status})`,
      'API',
      { endpoint, method, status, response }
    );
  }

  connectionError(type: 'offline' | 'timeout' | 'server_unreachable', details?: any): void {
    this.error(
      `Connection error: ${type}`,
      'Connection',
      { type, details }
    );
  }

  // Component-specific logging
  componentError(componentName: string, error: Error, props?: any): void {
    this.error(
      `Component error in ${componentName}`,
      'Component',
      { componentName, props },
      error
    );
  }

  // Performance logging
  performance(operation: string, duration: number, context?: string): void {
    this.info(
      `Performance: ${operation} took ${duration}ms`,
      context || 'Performance',
      { operation, duration }
    );
  }

  // User action logging
  userAction(action: string, data?: any): void {
    this.info(
      `User action: ${action}`,
      'UserAction',
      data
    );
  }

  // Get logs for debugging or export
  getLogs(level?: LogLevel, limit?: number): LogEntry[] {
    let filteredLogs = this.logs;
    
    if (level !== undefined) {
      filteredLogs = this.logs.filter(log => log.level >= level);
    }
    
    if (limit) {
      filteredLogs = filteredLogs.slice(-limit);
    }
    
    return filteredLogs;
  }

  // Clear logs
  clearLogs(): void {
    this.logs = [];
    if (this.config.enableStorage) {
      localStorage.removeItem('aithos_logs');
    }
  }

  // Export logs as JSON
  exportLogs(): string {
    return JSON.stringify({
      sessionId: this.sessionId,
      exportedAt: new Date().toISOString(),
      logs: this.logs
    }, null, 2);
  }

  // Update configuration
  updateConfig(newConfig: Partial<LoggerConfig>): void {
    this.config = { ...this.config, ...newConfig };
  }
}

// Export the Logger class
export { Logger };

// Create default logger instance
export const logger = new Logger({
  level: process.env.NODE_ENV === 'development' ? LogLevel.DEBUG : LogLevel.INFO,
  enableConsole: true,
  enableStorage: true,
  maxStorageEntries: 1000,
  enableRemoteLogging: process.env.NODE_ENV === 'production',
  remoteEndpoint: process.env.NODE_ENV === 'production' ? '/api/logs' : undefined
});

// Global error handler
window.addEventListener('error', (event) => {
  logger.critical(
    'Uncaught error',
    'Global',
    {
      filename: event.filename,
      lineno: event.lineno,
      colno: event.colno
    },
    event.error
  );
});

window.addEventListener('unhandledrejection', (event) => {
  logger.critical(
    'Unhandled promise rejection',
    'Global',
    { reason: event.reason }
  );
});

export default Logger;