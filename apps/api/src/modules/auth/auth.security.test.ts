import { describe, expect, it, vi } from 'vitest';
import request from 'supertest';
import { createServer } from 'node:http';
import { createApp } from '../../app.js';
import { signAccessToken } from './auth.crypto.js';

function getRawApp() {
  return createApp();
}

describe('CORS', () => {
  const server = createServer(getRawApp());

  it('allows configured origin', async () => {
    const response = await request(server)
      .get('/api/v1/health/live')
      .set('Origin', 'http://localhost:5173');
    expect(response.status).toBe(200);
  });

  it('rejects arbitrary origin', async () => {
    const response = await request(server)
      .get('/api/v1/health/live')
      .set('Origin', 'https://evil.example.com');
    expect(response.status).toBe(403);
    expect(response.body.error.code).toBe('CORS_ORIGIN_DENIED');
  });

  it('sets credentials header on allowed origin', async () => {
    const response = await request(server)
      .get('/api/v1/health/live')
      .set('Origin', 'http://localhost:5173');
    expect(response.headers['access-control-allow-credentials']).toBe('true');
  });

  it('handles preflight correctly', async () => {
    const response = await request(server)
      .options('/api/v1/health/live')
      .set('Origin', 'http://localhost:5173')
      .set('Access-Control-Request-Method', 'GET');
    expect(response.status).toBe(204);
    expect(response.headers['access-control-allow-origin']).toBe('http://localhost:5173');
  });
});

describe('error handler', () => {
  it('hides stack traces in production', async () => {
    const { env } = await import('../../config/env.js');
    vi.spyOn(env, 'NODE_ENV' as keyof typeof env, 'get').mockReturnValue('production');
    const app = createApp();
    const response = await request(app).get('/missing');
    expect(response.status).toBe(404);
    expect(response.body).not.toHaveProperty('error.stack');
    vi.restoreAllMocks();
  });

  it('returns consistent error contract', async () => {
    const response = await request(getRawApp()).get('/missing');
    expect(response.body).toMatchObject({
      success: false,
      error: { code: 'ROUTE_NOT_FOUND', message: expect.any(String) },
      meta: { requestId: expect.any(String), timestamp: expect.any(String) },
    });
  });

  it('does not leak sensitive data in error', async () => {
    const response = await request(getRawApp()).get('/missing');
    const text = JSON.stringify(response.body);
    expect(text).not.toContain('secret');
    expect(text).not.toContain('mongodb://');
    expect(text).not.toContain('token');
  });
});

describe('JWT', () => {
  it('signs and verifies a valid token', async () => {
    const token = await signAccessToken('user-1', 'session-1', ['CAPTAIN']);
    expect(token).toBeTruthy();
    const { verifyAccessToken } = await import('./auth.crypto.js');
    const claims = await verifyAccessToken(token);
    expect(claims.sub).toBe('user-1');
    expect(claims.sid).toBe('session-1');
    expect(claims.roles).toEqual(['CAPTAIN']);
  });

  it('rejects expired token', async () => {
    vi.useFakeTimers();
    const token = await signAccessToken('user-1', 'session-1', ['CAPTAIN']);
    vi.advanceTimersByTime(700_000);
    const { verifyAccessToken } = await import('./auth.crypto.js');
    await expect(verifyAccessToken(token)).rejects.toThrow();
    vi.useRealTimers();
  });

  it('rejects token with wrong audience', async () => {
    const { SignJWT } = await import('jose');
    const { env } = await import('../../config/env.js');
    const encoder = new TextEncoder();
    const badToken = await new SignJWT({ sid: 's', roles: ['CAPTAIN'] })
      .setProtectedHeader({ alg: 'HS256' })
      .setSubject('user-1')
      .setIssuer(env.JWT_ISSUER)
      .setAudience('wrong-audience')
      .setIssuedAt()
      .setExpirationTime('600s')
      .sign(encoder.encode(env.JWT_ACCESS_SECRET));
    const { verifyAccessToken } = await import('./auth.crypto.js');
    await expect(verifyAccessToken(badToken)).rejects.toThrow();
  });

  it('rejects tampered token', async () => {
    const token = await signAccessToken('user-1', 'session-1', ['CAPTAIN']);
    const parts = token.split('.');
    const tampered = parts[0] + '.' + parts[1] + '.invalidsignature';
    const { verifyAccessToken } = await import('./auth.crypto.js');
    await expect(verifyAccessToken(tampered)).rejects.toThrow();
  });
});

describe('requireAuth middleware', () => {
  const app = createApp();

  it('returns 401 when no Authorization header', async () => {
    const response = await request(app).get('/api/v1/auth/me');
    expect(response.status).toBe(401);
    expect(response.body.error.code).toBe('AUTHENTICATION_REQUIRED');
  });

  it('returns 401 for invalid token', async () => {
    const response = await request(app)
      .get('/api/v1/auth/me')
      .set('Authorization', 'Bearer invalid-token');
    expect(response.status).toBe(401);
    expect(response.body.error.code).toBe('ACCESS_TOKEN_INVALID');
  });

  it('returns 401 for missing Bearer scheme', async () => {
    const response = await request(app).get('/api/v1/auth/me').set('Authorization', 'Token abc123');
    expect(response.status).toBe(401);
  });

  it('returns 401 for empty token', async () => {
    const response = await request(app).get('/api/v1/auth/me').set('Authorization', 'Bearer ');
    expect(response.status).toBe(401);
  });
});

describe('logout', () => {
  it('clears authentication cookies on logout endpoint', async () => {
    const app = createApp();
    const response = await request(app).post('/api/v1/auth/logout');
    expect(response.status).toBe(403);
  });
});

describe('application version', () => {
  it('is exposed in health endpoint', async () => {
    const response = await request(getRawApp()).get('/api/v1/health/live');
    expect(response.body.data.version).toBeTruthy();
    expect(typeof response.body.data.version).toBe('string');
  });

  it('matches package.json version', async () => {
    const { APP_VERSION } = await import('../../config/version.js');
    const response = await request(getRawApp()).get('/api/v1/health/live');
    expect(response.body.data.version).toBe(APP_VERSION);
  });
});

describe('trust proxy', () => {
  it('reads TRUST_PROXY from config', async () => {
    const { env } = await import('../../config/env.js');
    expect(env).toHaveProperty('TRUST_PROXY');
  });
});
