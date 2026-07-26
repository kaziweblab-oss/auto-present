import type { HealthService } from './health.service.js';
import request from 'supertest';
import { describe, expect, it } from 'vitest';
import { createApp } from '../../app.js';

describe('health routes', () => {
  it('reports process liveness with a stable response contract', async () => {
    const response = await request(createApp()).get('/api/v1/health/live');

    expect(response.status).toBe(200);
    expect(response.body).toMatchObject({
      success: true,
      data: {
        status: 'ok',
        service: 'auto-present-api',
        version: expect.any(String),
      },
      meta: {
        requestId: expect.any(String),
        timestamp: expect.any(String),
      },
    });
  });

  it('returns 503 without exposing connection details when MongoDB is unavailable', async () => {
    const healthService: HealthService = {
      getLiveHealth: () => ({
        status: 'ok',
        service: 'auto-present-api',
        version: '0.0.0',
        uptimeSeconds: 1,
      }),
      getReadyHealth: () => ({
        status: 'not_ready',
        dependencies: { mongodb: 'disconnected' },
      }),
    };

    const response = await request(createApp({ healthService })).get('/api/v1/health/ready');

    expect(response.status).toBe(503);
    expect(response.body).toMatchObject({
      success: true,
      data: {
        status: 'not_ready',
        dependencies: { mongodb: 'disconnected' },
      },
    });
    expect(JSON.stringify(response.body)).not.toContain('mongodb://');
  });

  it('reports readiness when MongoDB is connected', async () => {
    const healthService: HealthService = {
      getLiveHealth: () => ({
        status: 'ok',
        service: 'auto-present-api',
        version: '0.0.0',
        uptimeSeconds: 1,
      }),
      getReadyHealth: () => ({
        status: 'ready',
        dependencies: { mongodb: 'connected' },
      }),
    };

    const response = await request(createApp({ healthService })).get('/api/v1/health/ready');

    expect(response.status).toBe(200);
    expect(response.body.data.status).toBe('ready');
  });

  it('returns the centralized not-found contract', async () => {
    const response = await request(createApp()).get('/missing');

    expect(response.status).toBe(404);
    expect(response.body).toMatchObject({
      success: false,
      error: {
        code: 'ROUTE_NOT_FOUND',
      },
    });
  });
});
