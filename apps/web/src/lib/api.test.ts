import { AxiosError, type AxiosAdapter, type AxiosResponse } from 'axios';
import { afterEach, describe, expect, it } from 'vitest';
import { apiClient, getAccessToken, getCsrfToken, setAccessToken, setCsrfToken } from './api';

describe('API refresh coordination', () => {
  const originalAdapter = apiClient.defaults.adapter;
  afterEach(() => {
    if (originalAdapter) apiClient.defaults.adapter = originalAdapter;
    else delete apiClient.defaults.adapter;
    setAccessToken(null);
    setCsrfToken(null);
  });

  it('sends bootstrap-issued CSRF on OAuth and session mutations', async () => {
    setCsrfToken('csrf-bootstrap');
    const seen: Array<{ url?: string; csrf?: unknown }> = [];
    apiClient.defaults.adapter = async (config) => {
      seen.push({ url: config.url ?? '', csrf: config.headers['X-CSRF-Token'] });
      return { data: {}, status: 200, statusText: 'OK', headers: {}, config };
    };
    await apiClient.post('/auth/google/start', { role: 'STUDENT' });
    await apiClient.post('/auth/logout');
    await apiClient.delete('/auth/sessions/session-id');
    expect(seen).toEqual([
      { url: '/auth/google/start', csrf: 'csrf-bootstrap' },
      { url: '/auth/logout', csrf: 'csrf-bootstrap' },
      { url: '/auth/sessions/session-id', csrf: 'csrf-bootstrap' },
    ]);
  });

  it('stores a bootstrap response CSRF token in memory without browser storage', async () => {
    apiClient.defaults.adapter = async (config) => ({
      data: {
        success: true,
        data: {
          sessionPresent: false,
          csrfToken: 'csrf-bootstrap-response',
          googleClientId: 'public-client-id',
        },
      },
      status: 200,
      statusText: 'OK',
      headers: {},
      config,
    });
    await apiClient.get('/auth/bootstrap');
    expect(getCsrfToken()).toBe('csrf-bootstrap-response');
    expect(localStorage.length).toBe(0);
    expect(sessionStorage.length).toBe(0);
  });

  it('atomically replaces bootstrap CSRF after refresh before the next mutation', async () => {
    setCsrfToken('csrf-bootstrap');
    const seen: Array<{ url?: string; csrf?: unknown }> = [];
    apiClient.defaults.adapter = async (config) => {
      seen.push({ url: config.url ?? '', csrf: config.headers['X-CSRF-Token'] });
      return {
        data:
          config.url === '/auth/refresh'
            ? {
                data: {
                  accessToken: 'successor',
                  csrfToken: 'csrf-refreshed',
                  user: {},
                },
              }
            : { success: true },
        status: 200,
        statusText: 'OK',
        headers: {},
        config,
      };
    };
    await apiClient.post('/auth/refresh');
    expect(getCsrfToken()).toBe('csrf-refreshed');
    await apiClient.post('/auth/logout');
    await apiClient.post('/auth/logout-all');
    await apiClient.delete('/auth/sessions/session-id');
    await apiClient.post('/auth/google/workspace/start', { role: 'CAPTAIN' });
    expect(seen).toEqual([
      { url: '/auth/refresh', csrf: 'csrf-bootstrap' },
      { url: '/auth/logout', csrf: 'csrf-refreshed' },
      { url: '/auth/logout-all', csrf: 'csrf-refreshed' },
      { url: '/auth/sessions/session-id', csrf: 'csrf-refreshed' },
      { url: '/auth/google/workspace/start', csrf: 'csrf-refreshed' },
    ]);
    expect(localStorage.length).toBe(0);
    expect(sessionStorage.length).toBe(0);
  });

  it('single-flights refresh and retries concurrent requests once', async () => {
    let refreshCalls = 0;
    let unauthorizedCalls = 0;
    const adapter: AxiosAdapter = async (config) => {
      if (config.url === '/auth/refresh') {
        refreshCalls += 1;
        await Promise.resolve();
        return {
          data: { data: { accessToken: 'successor', csrfToken: 'csrf-successor' } },
          status: 200,
          statusText: 'OK',
          headers: {},
          config,
        };
      }
      if (!config.headers.Authorization) {
        unauthorizedCalls += 1;
        const response = {
          data: {},
          status: 401,
          statusText: 'Unauthorized',
          headers: {},
          config,
        } as AxiosResponse;
        throw new AxiosError('Unauthorized', 'ERR_BAD_REQUEST', config, undefined, response);
      }
      return { data: { ok: true }, status: 200, statusText: 'OK', headers: {}, config };
    };
    apiClient.defaults.adapter = adapter;
    const results = await Promise.all([apiClient.get('/one'), apiClient.get('/two')]);
    expect(results.map((result) => result.status)).toEqual([200, 200]);
    expect(refreshCalls).toBe(1);
    expect(unauthorizedCalls).toBe(2);
    expect(getAccessToken()).toBe('successor');
    expect(getCsrfToken()).toBe('csrf-successor');
  });

  it('does not loop when refresh permanently fails', async () => {
    setAccessToken('expired');
    let refreshCalls = 0;
    apiClient.defaults.adapter = async (config) => {
      if (config.url === '/auth/refresh') refreshCalls += 1;
      const response = {
        data: {},
        status: 401,
        statusText: 'Unauthorized',
        headers: {},
        config,
      } as AxiosResponse;
      throw new AxiosError('Unauthorized', 'ERR_BAD_REQUEST', config, undefined, response);
    };
    await expect(apiClient.get('/protected')).rejects.toBeTruthy();
    expect(refreshCalls).toBe(1);
    expect(getAccessToken()).toBeNull();
  });
});
