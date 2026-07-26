import 'dotenv/config';
import { z } from 'zod';

const envSchema = z.object({
  NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),
  PORT: z.coerce.number().int().min(1).max(65_535).default(4000),
  MONGODB_URI: z.string().min(1).default('mongodb://127.0.0.1:27017/auto-present'),
  CORS_ALLOWED_ORIGINS: z.string().default('http://localhost:5173'),
  INITIAL_ADMIN_EMAIL: z.email().default('admin@example.com'),
  LOG_LEVEL: z.enum(['error', 'warn', 'info', 'http', 'debug']).default('info'),
  TRUST_PROXY: z
    .enum(['true', 'false'])
    .default('false')
    .transform((value) => value === 'true'),
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
  COOKIE_SAMESITE: z.enum(['lax', 'none', 'strict']).default('lax'),
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

if (env.NODE_ENV === 'production') {
  const checks: string[] = [];
  if (!env.COOKIE_SECURE) checks.push('COOKIE_SECURE must be true');
  if (env.GOOGLE_CLIENT_ID === 'local-client-id') checks.push('GOOGLE_CLIENT_ID must be set');
  if (env.GOOGLE_CLIENT_SECRET === 'local-client-secret')
    checks.push('GOOGLE_CLIENT_SECRET must be set');
  if (env.JWT_ACCESS_SECRET === 'local-only-jwt-secret-change-me-000000')
    checks.push('JWT_ACCESS_SECRET must be set');
  if (env.IP_HASH_SECRET === 'local-only-ip-hash-secret-00000000')
    checks.push('IP_HASH_SECRET must be set');
  if (env.GOOGLE_TOKEN_ENCRYPTION_KEY === 'MDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDA=')
    checks.push('GOOGLE_TOKEN_ENCRYPTION_KEY must be set');
  if (env.MONGODB_URI === 'mongodb://127.0.0.1:27017/auto-present')
    checks.push('MONGODB_URI must be set');
  if (env.COOKIE_SAMESITE === 'none' && !env.COOKIE_SECURE) {
    checks.push('COOKIE_SAMESITE="none" requires COOKIE_SECURE=true');
  }
  if (env.GOOGLE_IDENTITY_REDIRECT_URI === 'http://localhost:4000/api/v1/auth/google/callback') {
    checks.push('GOOGLE_IDENTITY_REDIRECT_URI must be set to the production callback URL');
  }
  if (env.GOOGLE_WORKSPACE_REDIRECT_URI === 'http://localhost:4000/api/v1/auth/google/callback') {
    checks.push('GOOGLE_WORKSPACE_REDIRECT_URI must be set to the production callback URL');
  }
  if (
    env.GOOGLE_IDENTITY_REDIRECT_URI.startsWith('http://') ||
    env.GOOGLE_WORKSPACE_REDIRECT_URI.startsWith('http://')
  ) {
    checks.push('Google redirect URIs must use HTTPS in production');
  }
  if (env.WEB_APP_URL === 'http://localhost:5173') {
    checks.push('WEB_APP_URL must be set to the production frontend URL');
  } else if (!env.WEB_APP_URL.startsWith('https://')) {
    checks.push('WEB_APP_URL must use HTTPS in production');
  }
  if (
    env.CORS_ALLOWED_ORIGINS.some(
      (origin) => origin === 'http://localhost:5173' || origin.startsWith('http://'),
    )
  ) {
    checks.push('CORS_ALLOWED_ORIGINS must not contain localhost or HTTP origins in production');
  }
  if (env.INITIAL_ADMIN_EMAIL === 'admin@example.com') {
    checks.push('INITIAL_ADMIN_EMAIL must be set to a real administrator email');
  }
  if (checks.length > 0) {
    throw new Error(`Production environment configuration is insecure: ${checks.join('; ')}`);
  }
}
