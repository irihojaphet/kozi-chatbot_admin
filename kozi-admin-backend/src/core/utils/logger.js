// src/core/utils/logger.js
const fs = require('fs');
const path = require('path');

class Logger {
  constructor() {
    this.logDir = path.join(process.cwd(), 'logs');
    this.ensureLogDirectory();
  }

  ensureLogDirectory() {
    if (!fs.existsSync(this.logDir)) {
      fs.mkdirSync(this.logDir, { recursive: true });
    }
  }

  formatMessage(level, message, meta = {}) {
    const timestamp = new Date().toISOString();
    const metaString = Object.keys(meta).length > 0 ? ` ${JSON.stringify(meta)}` : '';
    return `[${timestamp}] ${level.toUpperCase()}: ${message}${metaString}`;
  }

  writeToFile(level, formattedMessage) {
    const logFile = path.join(this.logDir, `${level}.log`);
    const allLogFile = path.join(this.logDir, 'all.log');
    
    try {
      fs.appendFileSync(logFile, formattedMessage + '\n');
      fs.appendFileSync(allLogFile, formattedMessage + '\n');
    } catch (error) {
      console.error('Failed to write to log file:', error);
    }
  }

  log(level, message, meta = {}) {
    const formattedMessage = this.formatMessage(level, message, meta);
    
    // Console output with colors
    const colors = {
      error: '\x1b[31m',   // Red
      warn: '\x1b[33m',    // Yellow
      info: '\x1b[36m',    // Cyan
      debug: '\x1b[35m',   // Magenta
      reset: '\x1b[0m'     // Reset
    };
    
    const color = colors[level] || colors.reset;
    console.log(`${color}${formattedMessage}${colors.reset}`);
    
    // File output (only in production or when LOG_TO_FILE is true)
    if (process.env.NODE_ENV === 'production' || process.env.LOG_TO_FILE === 'true') {
      this.writeToFile(level, formattedMessage);
    }
  }

  error(message, meta = {}) {
    this.log('error', message, meta);
  }

  warn(message, meta = {}) {
    this.log('warn', message, meta);
  }

  info(message, meta = {}) {
    this.log('info', message, meta);
  }

  debug(message, meta = {}) {
    if (process.env.NODE_ENV === 'development' || process.env.LOG_LEVEL === 'debug') {
      this.log('debug', message, meta);
    }
  }

  // Method for structured API logging
  apiRequest(method, url, status, duration, meta = {}) {
    this.info(`API ${method} ${url}`, {
      status,
      duration: `${duration}ms`,
      ...meta
    });
  }

  // Method for database logging
  dbQuery(query, duration, meta = {}) {
    this.debug(`DB Query: ${query}`, {
      duration: `${duration}ms`,
      ...meta
    });
  }
}

// Create singleton instance
const logger = new Logger();

module.exports = logger;