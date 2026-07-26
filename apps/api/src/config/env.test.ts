import { describe, expect, it, vi, beforeEach } from 'vitest';

const BASE_ENV = {
  NODE_ENV: 'test',
  GOOGLE_TOKEN_ENCRYPTION_KEY: 'MDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDA=',
  JWT_ACCESS_SECRET: 'test-only-jwt-secret-change-me-000000',
  IP_HASH_SECRET: 'test-only-ip-hash-secret-000000000',
};

describe('env validation', () => {
  beforeEach(() => {
    vi.resetModules();
  });

  it('succeeds with valid test environment', async () => {
    process.env = { ...BASE_ENV };
    const { env } = await import('./env.js');
    expect(env.NODE_ENV).toBe('test');
    expect(env.PORT).toBeGreaterThanOrEqual(1);
  });

  it('fails when PORT is zero', async () => {
    process.env = { ...BASE_ENV, PORT: '0' };
    await expect(import('./env.js')).rejects.toThrow('PORT');
  });

  it('fails when PORT is negative', async () => {
    process.env = { ...BASE_ENV, PORT: '-1' };
    await expect(import('./env.js')).rejects.toThrow('PORT');
  });

  it('fails when PORT is non-numeric', async () => {
    process.env = { ...BASE_ENV, PORT: 'abc' };
    await expect(import('./env.js')).rejects.toThrow('PORT');
  });

  it('defaults PORT to 4000', async () => {
    process.env = { ...BASE_ENV };
    delete process.env.PORT;
    const { env } = await import('./env.js');
    expect(env.PORT).toBe(4000);
  });

  it('fails when NODE_ENV is invalid', async () => {
    process.env = { ...BASE_ENV, NODE_ENV: 'staging' };
    await expect(import('./env.js')).rejects.toThrow('NODE_ENV');
  });

  it('defaults COOKIE_SAMESITE to lax', async () => {
    process.env = { ...BASE_ENV };
    const { env } = await import('./env.js');
    expect(env.COOKIE_SAMESITE).toBe('lax');
  });

  it('accepts COOKIE_SAMESITE values lax, none, strict', async () => {
    for (const value of ['lax', 'none', 'strict']) {
      process.env = { ...BASE_ENV, COOKIE_SAMESITE: value };
      const { env } = await import('./env.js');
      expect(env.COOKIE_SAMESITE).toBe(value);
      vi.resetModules();
    }
  });

  it('rejects invalid COOKIE_SAMESITE', async () => {
    process.env = { ...BASE_ENV, COOKIE_SAMESITE: 'invalid' };
    await expect(import('./env.js')).rejects.toThrow('COOKIE_SAMESITE');
  });

  it('rejects production with default MONGODB_URI', async () => {
    process.env = {
      ...BASE_ENV,
      NODE_ENV: 'production',
      CORS_ALLOWED_ORIGINS: 'https://app.example.com',
      INITIAL_ADMIN_EMAIL: 'admin@real-org.com',
      COOKIE_SECURE: 'true',
      GOOGLE_CLIENT_ID: 'real-id',
      GOOGLE_CLIENT_SECRET: 'real-secret',
      JWT_ACCESS_SECRET: 'a-very-long-real-secret-that-meets-minimum-length',
      IP_HASH_SECRET: 'a-very-long-real-ip-hash-secret-key-here-00000',
      GOOGLE_TOKEN_ENCRYPTION_KEY: 'aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa=',
      GOOGLE_IDENTITY_REDIRECT_URI: 'https://api.example.com/api/v1/auth/google/callback',
      GOOGLE_WORKSPACE_REDIRECT_URI: 'https://api.example.com/api/v1/auth/google/callback',
      WEB_APP_URL: 'https://app.example.com',
      MONGODB_URI: 'mongodb://127.0.0.1:27017/auto-present',
    };
    await expect(import('./env.js')).rejects.toThrow('MONGODB_URI');
  });

  it('rejects production with default GOOGLE_CLIENT_ID', async () => {
    process.env = {
      ...BASE_ENV,
      NODE_ENV: 'production',
      MONGODB_URI: 'mongodb://real-host:27017/db',
      CORS_ALLOWED_ORIGINS: 'https://app.example.com',
      INITIAL_ADMIN_EMAIL: 'admin@real-org.com',
      COOKIE_SECURE: 'true',
      JWT_ACCESS_SECRET: 'a-very-long-real-secret-that-meets-minimum-length',
      IP_HASH_SECRET: 'a-very-long-real-ip-hash-secret-key-here-00000',
      GOOGLE_TOKEN_ENCRYPTION_KEY: 'aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa=',
      GOOGLE_IDENTITY_REDIRECT_URI: 'https://api.example.com/api/v1/auth/google/callback',
      GOOGLE_WORKSPACE_REDIRECT_URI: 'https://api.example.com/api/v1/auth/google/callback',
      WEB_APP_URL: 'https://app.example.com',
    };
    await expect(import('./env.js')).rejects.toThrow('GOOGLE_CLIENT_ID');
  });

  it('rejects production with default GOOGLE_IDENTITY_REDIRECT_URI', async () => {
    process.env = {
      ...BASE_ENV,
      NODE_ENV: 'production',
      MONGODB_URI: 'mongodb://real-host:27017/db',
      CORS_ALLOWED_ORIGINS: 'https://app.example.com',
      INITIAL_ADMIN_EMAIL: 'admin@real-org.com',
      WEB_APP_URL: 'https://app.example.com',
      GOOGLE_CLIENT_ID: 'real-id',
      GOOGLE_CLIENT_SECRET: 'real-secret',
      JWT_ACCESS_SECRET: 'a-very-long-real-secret-that-meets-minimum-length',
      IP_HASH_SECRET: 'a-very-long-real-ip-hash-secret-key-here-00000',
      GOOGLE_TOKEN_ENCRYPTION_KEY: 'aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa=',
      COOKIE_SECURE: 'true',
      GOOGLE_IDENTITY_REDIRECT_URI: 'http://localhost:4000/api/v1/auth/google/callback',
      GOOGLE_WORKSPACE_REDIRECT_URI: 'https://api.example.com/api/v1/auth/google/callback',
    };
    await expect(import('./env.js')).rejects.toThrow('GOOGLE_IDENTITY_REDIRECT_URI');
  });

  it('rejects production with default GOOGLE_WORKSPACE_REDIRECT_URI', async () => {
    process.env = {
      ...BASE_ENV,
      NODE_ENV: 'production',
      MONGODB_URI: 'mongodb://real-host:27017/db',
      CORS_ALLOWED_ORIGINS: 'https://app.example.com',
      INITIAL_ADMIN_EMAIL: 'admin@real-org.com',
      WEB_APP_URL: 'https://app.example.com',
      GOOGLE_CLIENT_ID: 'real-id',
      GOOGLE_CLIENT_SECRET: 'real-secret',
      JWT_ACCESS_SECRET: 'a-very-long-real-secret-that-meets-minimum-length',
      IP_HASH_SECRET: 'a-very-long-real-ip-hash-secret-key-here-00000',
      GOOGLE_TOKEN_ENCRYPTION_KEY: 'aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa=',
      COOKIE_SECURE: 'true',
      GOOGLE_IDENTITY_REDIRECT_URI: 'https://api.example.com/api/v1/auth/google/callback',
      GOOGLE_WORKSPACE_REDIRECT_URI: 'http://localhost:4000/api/v1/auth/google/callback',
    };
    await expect(import('./env.js')).rejects.toThrow('GOOGLE_WORKSPACE_REDIRECT_URI');
  });

  it('rejects COOKIE_SAMESITE=none without COOKIE_SECURE in production', async () => {
    process.env = {
      ...BASE_ENV,
      NODE_ENV: 'production',
      MONGODB_URI: 'mongodb://real-host:27017/db',
      CORS_ALLOWED_ORIGINS: 'https://app.example.com',
      INITIAL_ADMIN_EMAIL: 'admin@real-org.com',
      WEB_APP_URL: 'https://app.example.com',
      GOOGLE_CLIENT_ID: 'real-id',
      GOOGLE_CLIENT_SECRET: 'real-secret',
      JWT_ACCESS_SECRET: 'a-very-long-real-secret-that-meets-minimum-length',
      IP_HASH_SECRET: 'a-very-long-real-ip-hash-secret-key-here-00000',
      GOOGLE_TOKEN_ENCRYPTION_KEY: 'aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa=',
      COOKIE_SECURE: 'false',
      COOKIE_SAMESITE: 'none',
      GOOGLE_IDENTITY_REDIRECT_URI: 'https://api.example.com/api/v1/auth/google/callback',
      GOOGLE_WORKSPACE_REDIRECT_URI: 'https://api.example.com/api/v1/auth/google/callback',
    };
    await expect(import('./env.js')).rejects.toThrow(
      'COOKIE_SAMESITE="none" requires COOKIE_SECURE=true',
    );
  });

  it('passes production check when all secrets are set and valid', async () => {
    process.env = {
      NODE_ENV: 'production',
      PORT: '8080',
      MONGODB_URI: 'mongodb://real-host:27017/db',
      CORS_ALLOWED_ORIGINS: 'https://app.example.com',
      INITIAL_ADMIN_EMAIL: 'admin@real-org.com',
      LOG_LEVEL: 'info',
      TRUST_PROXY: 'true',
      WEB_APP_URL: 'https://app.example.com',
      GOOGLE_CLIENT_ID: 'real-id',
      GOOGLE_CLIENT_SECRET: 'real-secret',
      GOOGLE_IDENTITY_REDIRECT_URI: 'https://api.example.com/api/v1/auth/google/callback',
      GOOGLE_WORKSPACE_REDIRECT_URI: 'https://api.example.com/api/v1/auth/google/callback',
      JWT_ISSUER: 'auto-present-api',
      JWT_AUDIENCE: 'auto-present-web',
      JWT_ACCESS_SECRET: 'a-very-long-real-secret-that-meets-minimum-length',
      JWT_KEY_ID: 'v1',
      ACCESS_TOKEN_TTL: '600',
      REFRESH_TOKEN_TTL: '2592000',
      COOKIE_DOMAIN: '.example.com',
      COOKIE_SECURE: 'true',
      COOKIE_SAMESITE: 'lax',
      GOOGLE_TOKEN_ENCRYPTION_KEY: 'aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa=',
      GOOGLE_TOKEN_ENCRYPTION_KEY_VERSION: 'v1',
      IP_HASH_SECRET: 'a-very-long-real-ip-hash-secret-key-here-00000',
    };
    const { env } = await import('./env.js');
    expect(env.NODE_ENV).toBe('production');
    expect(env.COOKIE_SECURE).toBe(true);
    expect(env.COOKIE_SAMESITE).toBe('lax');
  });

  it('rejects production with default WEB_APP_URL', async () => {
    process.env = {
      ...BASE_ENV,
      NODE_ENV: 'production',
      MONGODB_URI: 'mongodb://real-host:27017/db',
      CORS_ALLOWED_ORIGINS: 'https://app.example.com',
      INITIAL_ADMIN_EMAIL: 'admin@real-org.com',
      COOKIE_SECURE: 'true',
      GOOGLE_CLIENT_ID: 'real-id',
      GOOGLE_CLIENT_SECRET: 'real-secret',
      JWT_ACCESS_SECRET: 'a-very-long-real-secret-that-meets-minimum-length',
      IP_HASH_SECRET: 'a-very-long-real-ip-hash-secret-key-here-00000',
      GOOGLE_TOKEN_ENCRYPTION_KEY: 'aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa=',
      GOOGLE_IDENTITY_REDIRECT_URI: 'https://api.example.com/api/v1/auth/google/callback',
      GOOGLE_WORKSPACE_REDIRECT_URI: 'https://api.example.com/api/v1/auth/google/callback',
      WEB_APP_URL: 'http://localhost:5173',
    };
    await expect(import('./env.js')).rejects.toThrow('WEB_APP_URL');
  });

  it('rejects production with HTTP CORS origin', async () => {
    process.env = {
      ...BASE_ENV,
      NODE_ENV: 'production',
      MONGODB_URI: 'mongodb://real-host:27017/db',
      CORS_ALLOWED_ORIGINS: 'http://evil-origin.com',
      INITIAL_ADMIN_EMAIL: 'admin@real-org.com',
      COOKIE_SECURE: 'true',
      GOOGLE_CLIENT_ID: 'real-id',
      GOOGLE_CLIENT_SECRET: 'real-secret',
      JWT_ACCESS_SECRET: 'a-very-long-real-secret-that-meets-minimum-length',
      IP_HASH_SECRET: 'a-very-long-real-ip-hash-secret-key-here-00000',
      GOOGLE_TOKEN_ENCRYPTION_KEY: 'aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa=',
      GOOGLE_IDENTITY_REDIRECT_URI: 'https://api.example.com/api/v1/auth/google/callback',
      GOOGLE_WORKSPACE_REDIRECT_URI: 'https://api.example.com/api/v1/auth/google/callback',
      WEB_APP_URL: 'https://app.example.com',
    };
    await expect(import('./env.js')).rejects.toThrow('CORS_ALLOWED_ORIGINS');
  });

  it('rejects production with default INITIAL_ADMIN_EMAIL', async () => {
    process.env = {
      ...BASE_ENV,
      NODE_ENV: 'production',
      MONGODB_URI: 'mongodb://real-host:27017/db',
      CORS_ALLOWED_ORIGINS: 'https://app.example.com',
      INITIAL_ADMIN_EMAIL: 'admin@example.com',
      COOKIE_SECURE: 'true',
      GOOGLE_CLIENT_ID: 'real-id',
      GOOGLE_CLIENT_SECRET: 'real-secret',
      JWT_ACCESS_SECRET: 'a-very-long-real-secret-that-meets-minimum-length',
      IP_HASH_SECRET: 'a-very-long-real-ip-hash-secret-key-here-00000',
      GOOGLE_TOKEN_ENCRYPTION_KEY: 'aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa=',
      GOOGLE_IDENTITY_REDIRECT_URI: 'https://api.example.com/api/v1/auth/google/callback',
      GOOGLE_WORKSPACE_REDIRECT_URI: 'https://api.example.com/api/v1/auth/google/callback',
      WEB_APP_URL: 'https://app.example.com',
    };
    await expect(import('./env.js')).rejects.toThrow('INITIAL_ADMIN_EMAIL');
  });

  it('rejects production with HTTP redirect URIs', async () => {
    process.env = {
      ...BASE_ENV,
      NODE_ENV: 'production',
      MONGODB_URI: 'mongodb://real-host:27017/db',
      CORS_ALLOWED_ORIGINS: 'https://app.example.com',
      INITIAL_ADMIN_EMAIL: 'admin@real-org.com',
      COOKIE_SECURE: 'true',
      GOOGLE_CLIENT_ID: 'real-id',
      GOOGLE_CLIENT_SECRET: 'real-secret',
      JWT_ACCESS_SECRET: 'a-very-long-real-secret-that-meets-minimum-length',
      IP_HASH_SECRET: 'a-very-long-real-ip-hash-secret-key-here-00000',
      GOOGLE_TOKEN_ENCRYPTION_KEY: 'aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa=',
      GOOGLE_IDENTITY_REDIRECT_URI: 'http://api.example.com/api/v1/auth/google/callback',
      GOOGLE_WORKSPACE_REDIRECT_URI: 'https://api.example.com/api/v1/auth/google/callback',
      WEB_APP_URL: 'https://app.example.com',
    };
    await expect(import('./env.js')).rejects.toThrow('HTTPS');
  });

  it('rejects production with non-HTTPS WEB_APP_URL', async () => {
    process.env = {
      ...BASE_ENV,
      NODE_ENV: 'production',
      MONGODB_URI: 'mongodb://real-host:27017/db',
      CORS_ALLOWED_ORIGINS: 'https://app.example.com',
      INITIAL_ADMIN_EMAIL: 'admin@real-org.com',
      COOKIE_SECURE: 'true',
      GOOGLE_CLIENT_ID: 'real-id',
      GOOGLE_CLIENT_SECRET: 'real-secret',
      JWT_ACCESS_SECRET: 'a-very-long-real-secret-that-meets-minimum-length',
      IP_HASH_SECRET: 'a-very-long-real-ip-hash-secret-key-here-00000',
      GOOGLE_TOKEN_ENCRYPTION_KEY: 'aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa=',
      GOOGLE_IDENTITY_REDIRECT_URI: 'https://api.example.com/api/v1/auth/google/callback',
      GOOGLE_WORKSPACE_REDIRECT_URI: 'https://api.example.com/api/v1/auth/google/callback',
      WEB_APP_URL: 'http://internal.example.com',
    };
    await expect(import('./env.js')).rejects.toThrow('HTTPS');
  });
});
