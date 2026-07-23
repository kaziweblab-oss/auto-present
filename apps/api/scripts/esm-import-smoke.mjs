process.env.NODE_ENV = 'test';
process.env.GOOGLE_TOKEN_ENCRYPTION_KEY = 'MDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDA=';
process.env.JWT_ACCESS_SECRET = 'test-only-jwt-secret-change-me-000000';
process.env.IP_HASH_SECRET = 'test-only-ip-hash-secret-000000000';

const models = await import('../dist/modules/auth/auth.models.js');
const app = await import('../dist/app.js');

if (!models.UserModel || typeof app.createApp !== 'function') {
  throw new Error('Production ESM module graph did not expose expected API modules');
}
