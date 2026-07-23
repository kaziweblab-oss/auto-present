import 'dotenv/config';
import { z } from 'zod';

const envSchema = z.object({
  NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),
  PORT: z.coerce.number().int().min(1).max(65_535).default(4000),
  MONGODB_URI: z.string().min(1).default('mongodb://127.0.0.1:27017/auto-present'),
  CORS_ALLOWED_ORIGINS: z.string().default('http://localhost:5173'),
  INITIAL_ADMIN_EMAIL: z.email().default('kazitasinhossen@gmail.com'),
  LOG_LEVEL: z.enum(['error', 'warn', 'info', 'http', 'debug']).default('info'),
  TRUST_PROXY: z
    .enum(['true', 'false'])
    .default('false')
    .transform((value) => value === 'true'),
  API_BASE_URL: z.url().default('http://localhost:4000'),
  WEB_APP_URL: z.url().default('http://localhost:5173'),
  GOOGLE_CLIENT_ID: z.string().min(1).default('local-client-id'),
  GOOGLE_CLIENT_SECRET: z.string().min(1).default('local-client-secret'),
  GOOGLE_IDENTITY_REDIRECT_URI: z
    .url()
    .default('http://localhost:4000/api/v1/auth/google/callback'),
  GOOGLE_WORKSPACE_REDIRECT_URI: z
    .url()
    .default('http://localhost:4000/api/v1/auth/google/callback'),
  JWT_ISSUER: z.string().min(1).default('auto-present-api'),
  JWT_AUDIENCE: z.string().min(1).default('auto-present-web'),
  JWT_ACCESS_SECRET: z.string().min(32).default('local-only-jwt-secret-change-me-000000'),
  JWT_KEY_ID: z.string().min(1).default('v1'),
  ACCESS_TOKEN_TTL: z.coerce.number().int().min(60).max(3600).default(600),
  REFRESH_TOKEN_TTL: z.coerce.number().int().min(3600).default(2_592_000),
  COOKIE_DOMAIN: z.string().optional(),
  COOKIE_SECURE: z
    .enum(['true', 'false'])
    .default('false')
    .transform((value) => value === 'true'),
  GOOGLE_TOKEN_ENCRYPTION_KEY: z
    .string()
    .regex(/^[A-Za-z0-9+/]{43}=$/)
    .default('MDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDA='),
  GOOGLE_TOKEN_ENCRYPTION_KEY_VERSION: z.string().min(1).default('v1'),
  IP_HASH_SECRET: z.string().min(32).default('local-only-ip-hash-secret-00000000'),
});

const result = envSchema.safeParse(process.env);

if (!result.success) {
  const fields = result.error.issues.map((issue) => issue.path.join('.')).join(', ');
  throw new Error(`Invalid environment configuration: ${fields}`);
}

export const env = {
  ...result.data,
  CORS_ALLOWED_ORIGINS: result.data.CORS_ALLOWED_ORIGINS.split(',')
    .map((origin) => origin.trim())
    .filter(Boolean),
};

if (
  env.NODE_ENV === 'production' &&
  (!env.COOKIE_SECURE || env.GOOGLE_CLIENT_ID === 'local-client-id')
) {
  throw new Error('Production authentication configuration is insecure');
}
