import winston from 'winston';

const { combine, timestamp, json, errors, colorize, printf } = winston.format;

const prettyFormat = printf(({ level, message, timestamp, ...meta }) => {
  const metaStr = Object.keys(meta).length ? ` ${JSON.stringify(meta)}` : '';
  return `${timestamp} [${level}]: ${message}${metaStr}`;
});

// Determine format based on LOG_FORMAT env (avoid circular dep with config)
const logFormat = process.env.LOG_FORMAT || 'json';
const logLevel = process.env.LOG_LEVEL || 'info';

const formats =
  logFormat === 'pretty'
    ? combine(errors({ stack: true }), timestamp(), colorize(), prettyFormat)
    : combine(errors({ stack: true }), timestamp(), json());

export const logger = winston.createLogger({
  level: logLevel,
  format: formats,
  defaultMeta: { service: 'smart-building-api' },
  transports: [
    new winston.transports.Console(),
  ],
  exceptionHandlers: [
    new winston.transports.Console(),
  ],
  rejectionHandlers: [
    new winston.transports.Console(),
  ],
});
