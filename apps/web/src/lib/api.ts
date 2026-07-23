/* eslint-disable @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-member-access, @typescript-eslint/no-unsafe-argument -- Axios interceptor error/config payloads are intentionally dynamic. */
import type { AuthTokensResponse } from '@auto-present/shared';
import axios from 'axios';

let accessToken: string | null = null;
let csrfTokenInMemory: string | null = null;
let refreshPromise: Promise<string> | null = null;
export const setAccessToken = (token: string | null): void => {
  accessToken = token;
};
export const getAccessToken = (): string | null => accessToken;
export const setCsrfToken = (token: string | null): void => {
  csrfTokenInMemory = token;
};
export const getCsrfToken = (): string | null => csrfTokenInMemory;

export const apiClient = axios.create({
  baseURL: import.meta.env.VITE_API_BASE_URL ?? 'http://localhost:4000/api/v1',
  timeout: 8_000,
  withCredentials: true,
  headers: {
    Accept: 'application/json',
  },
});

apiClient.interceptors.request.use((config) => {
  if (accessToken) config.headers.Authorization = `Bearer ${accessToken}`;
  if (csrfTokenInMemory && config.method !== 'get')
    config.headers['X-CSRF-Token'] = csrfTokenInMemory;
  return config;
});

apiClient.interceptors.response.use(
  (response) => {
    const synchronizedCsrf = response.data?.data?.csrfToken;
    if (typeof synchronizedCsrf === 'string') setCsrfToken(synchronizedCsrf);
    return response;
  },
  async (error) => {
    const original = error.config;
    if (
      error.response?.status !== 401 ||
      original?._authRetried ||
      original?.url === '/auth/refresh'
    )
      throw error;
    original._authRetried = true;
    refreshPromise ??= apiClient
      .post<{ success: true; data: AuthTokensResponse }>('/auth/refresh')
      .then((response) => {
        const token = response.data.data.accessToken;
        setAccessToken(token);
        return token;
      })
      .finally(() => {
        refreshPromise = null;
      });
    try {
      original.headers.Authorization = `Bearer ${await refreshPromise}`;
      return await apiClient(original);
    } catch (refreshError) {
      setAccessToken(null);
      throw refreshError;
    }
  },
);
