import winston from 'winston';
import { env } from './env.js';

const sensitiveKeys = [
  'authorization',
  'cookie',
  'set-cookie',
  'token',
  'accessToken',
  'refreshToken',
  'password',
  'secret',
  'apiKey',
  'authorizationCode',
  'MONGODB_URI',
];

export const logger = winston.createLogger({
  level: env.LOG_LEVEL,
  defaultMeta: { service: 'auto-present-api' },
  format: winston.format.combine(
    winston.format.timestamp(),
    env.NODE_ENV === 'development' ? winston.format.colorize() : winston.format.uncolorize(),
    winston.format.json(),
  ),
  transports: [new winston.transports.Console()],
});

export function redactSensitiveFields(value: unknown): unknown {
  if (Array.isArray(value)) {
    return value.map((item: unknown) => redactSensitiveFields(item));
  }

  if (value !== null && typeof value === 'object') {
    return Object.fromEntries(
      Object.entries(value as Record<string, unknown>).map(([key, item]) => [
        key,
        sensitiveKeys.some((sensitiveKey) => sensitiveKey.toLowerCase() === key.toLowerCase())
          ? '[REDACTED]'
          : redactSensitiveFields(item),
      ]),
    );
  }

  return value;
}
