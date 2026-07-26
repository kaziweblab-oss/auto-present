import { describe, expect, it, vi, beforeEach, afterEach } from 'vitest';
import { createServer, type Server } from 'node:http';
import request from 'supertest';
import { createApp } from './app.js';
import { closeServer } from './server.js';

describe('health endpoint', () => {
  it('returns 200 with status ok at /api/v1/health/live', async () => {
    const response = await request(createApp()).get('/api/v1/health/live');

    expect(response.status).toBe(200);
    expect(response.body).toMatchObject({
      success: true,
      data: {
        status: 'ok',
        service: 'auto-present-api',
      },
      meta: {
        requestId: expect.any(String),
        timestamp: expect.any(String),
      },
    });
  });

  it('returns 503 when MongoDB is unavailable at /api/v1/health/ready', async () => {
    const healthService = {
      getLiveHealth: () =>
        ({
          status: 'ok',
          service: 'auto-present-api',
          version: '0.0.0',
          uptimeSeconds: 1,
        }) as const,
      getReadyHealth: () =>
        ({
          status: 'not_ready',
          dependencies: { mongodb: 'disconnected' },
        }) as const,
    };

    const response = await request(createApp({ healthService })).get('/api/v1/health/ready');

    expect(response.status).toBe(503);
    expect(response.body.data.status).toBe('not_ready');
    expect(response.body.data.dependencies.mongodb).toBe('disconnected');
  });
});

describe('closeServer', () => {
  let server: Server;

  beforeEach(() => {
    server = createServer((_req, res) => {
      res.writeHead(200);
      res.end('ok');
    });
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('resolves when server closes successfully', async () => {
    server.listen(0);
    await expect(closeServer(server)).resolves.toBeUndefined();
  });

  it('rejects when server is already closed', async () => {
    server.listen(0);
    await closeServer(server);
    await expect(closeServer(server)).rejects.toThrow();
  });

  it('rejects when server was never started', async () => {
    await expect(closeServer(server)).rejects.toThrow('Server is not running');
  });
});

describe('env.PORT validation', () => {
  const OLD_ENV = process.env;

  beforeEach(() => {
    process.env = { ...OLD_ENV };
    process.env.NODE_ENV = 'test';
    process.env.GOOGLE_TOKEN_ENCRYPTION_KEY = 'MDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDA=';
    process.env.JWT_ACCESS_SECRET = 'test-only-jwt-secret-change-me-000000';
    process.env.IP_HASH_SECRET = 'test-only-ip-hash-secret-000000000';
  });

  afterEach(() => {
    process.env = OLD_ENV;
  });

  it('defaults to 4000 when PORT is not set', async () => {
    delete process.env.PORT;
    const { env } = await import('./config/env.js');
    expect(env.PORT).toBe(4000);
  });

  it('parses PORT from string', async () => {
    process.env.PORT = '8080';
    vi.resetModules();
    const { env } = await import('./config/env.js');
    expect(env.PORT).toBe(8080);
  });

  it('rejects PORT outside valid range', async () => {
    process.env.PORT = '0';
    vi.resetModules();
    await expect(import('./config/env.js')).rejects.toThrow('Invalid environment configuration');
  });

  it('rejects negative PORT', async () => {
    process.env.PORT = '-1';
    vi.resetModules();
    await expect(import('./config/env.js')).rejects.toThrow('Invalid environment configuration');
  });

  it('rejects non-numeric PORT', async () => {
    process.env.PORT = 'abc';
    vi.resetModules();
    await expect(import('./config/env.js')).rejects.toThrow('Invalid environment configuration');
  });
});
