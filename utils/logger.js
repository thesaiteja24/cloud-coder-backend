import winston from 'winston'
import path from 'path'
import fs from 'fs'

// ─────────────────────────────────────────────
// Ensure a logs directory exists
// ─────────────────────────────────────────────
const logDir = path.resolve('logs')
if (!fs.existsSync(logDir)) {
  fs.mkdirSync(logDir)
}

// ─────────────────────────────────────────────
// Define custom log levels (higher number = lower priority)
// ─────────────────────────────────────────────
const customLevels = {
  error: 0,
  warn: 1,
  info: 2,
  http: 3,
  verbose: 4,
  debug: 5,
}

// ─────────────────────────────────────────────
// Define a consistent log format
// ─────────────────────────────────────────────
const logFormat = winston.format.combine(
  winston.format.timestamp(),
  winston.format.printf(({ level, message, timestamp, ...meta }) => {
    return `[${timestamp}] ${level.toUpperCase()}: ${message} ${
      Object.keys(meta).length ? JSON.stringify(meta) : ''
    }`
  })
)

// ─────────────────────────────────────────────
// Create transports for file + console logging
// ─────────────────────────────────────────────
const transports = [
  new winston.transports.File({
    filename: path.join(logDir, 'error.log'),
    level: 'error', // Only logs error-level and below (e.g., error only)
  }),
  new winston.transports.File({
    filename: path.join(logDir, 'combined.log'),
    level: 'info', // Includes info, warn, error, http
  }),
  new winston.transports.File({
    filename: path.join(logDir, 'http.log'),
    level: 'http',
  }),
]

// ─────────────────────────────────────────────
// Add console logging in non-production env
// ─────────────────────────────────────────────
if (process.env.NODE_ENV !== 'production') {
  transports.push(
    new winston.transports.Console({
      format: winston.format.combine(
        winston.format.colorize(), // Color for easier dev reading
        winston.format.simple()
      ),
    })
  )
}

// ─────────────────────────────────────────────
// Create Winston logger instance
// ─────────────────────────────────────────────
const logger = winston.createLogger({
  levels: customLevels,
  level: 'http', // minimum level to log
  format: logFormat,
  transports,
})

// ─────────────────────────────────────────────
// Helper methods for clean usage in app code
// ─────────────────────────────────────────────
export const logInfo = (msg, meta = {}) => logger.info(msg, meta)
export const logWarn = (msg, meta = {}) => logger.warn(msg, meta)
export const logDebug = (msg, meta = {}) => logger.debug(msg, meta)
export const logHttp = (msg, meta = {}) => logger.http(msg, meta)
export const logError = (msg, err, meta = {}) =>
  logger.error(msg, {
    ...meta,
    error: err?.message || '',
    stack: err?.stack || '',
  })

// ─────────────────────────────────────────────
// Export Morgan-compatible stream for request logging
// Used like: morgan(..., { stream: morganStream })
// ─────────────────────────────────────────────
export const morganStream = {
  write: message => {
    logger.http(message.trim())
  },
}

export default logger
