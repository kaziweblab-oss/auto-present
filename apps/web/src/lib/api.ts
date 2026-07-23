import axios from 'axios';

export const apiClient = axios.create({
  baseURL: import.meta.env.VITE_API_BASE_URL ?? 'http://localhost:4000/api/v1',
  timeout: 8_000,
  withCredentials: true,
  headers: {
    Accept: 'application/json',
  },
});
