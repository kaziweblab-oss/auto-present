import { defineConfig } from 'vitest/config';

process.env.NODE_ENV = 'test';
process.env.GOOGLE_TOKEN_ENCRYPTION_KEY = 'MDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDA=';
process.env.JWT_ACCESS_SECRET = 'test-only-jwt-secret-change-me-000000';
process.env.IP_HASH_SECRET = 'test-only-ip-hash-secret-000000000';

export default defineConfig({
  test: {
    include: ['src/**/*.integration.test.ts'],
    fileParallelism: false,
    sequence: { concurrent: false },
  },
});
