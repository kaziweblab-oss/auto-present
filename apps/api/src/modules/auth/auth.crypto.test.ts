import { describe, expect, it } from 'vitest';
import {
  decryptGoogleToken,
  encryptGoogleToken,
  hashToken,
  opaqueToken,
  signAccessToken,
  verifyAccessToken,
} from './auth.crypto.js';
import { AuthService, IDENTITY_SCOPES, WORKSPACE_SCOPES } from './auth.service.js';

describe('authentication cryptography', () => {
  it('uses authenticated encryption for Google refresh tokens', () => {
    const encrypted = encryptGoogleToken('refresh-secret');
    expect(encrypted.ciphertext).not.toContain('refresh-secret');
    expect(decryptGoogleToken(encrypted)).toBe('refresh-secret');
    expect(() =>
      decryptGoogleToken({ ...encrypted, authTag: Buffer.alloc(16).toString('base64') }),
    ).toThrow();
  });
  it('generates high entropy opaque values and deterministic hashes', () => {
    const first = opaqueToken();
    expect(first).not.toBe(opaqueToken());
    expect(first.length).toBeGreaterThan(50);
    expect(hashToken(first)).toHaveLength(64);
  });
  it('signs and strictly verifies minimal JWT claims', async () => {
    const claims = await verifyAccessToken(
      await signAccessToken('user-id', 'session-id', ['ADMIN']),
    );
    expect(claims).toMatchObject({ sub: 'user-id', sid: 'session-id', roles: ['ADMIN'] });
  });
});

describe('OAuth policy', () => {
  const service = new AuthService({} as never);
  it('rejects unsafe return paths', () => {
    expect(() => service.validateReturnPath('//evil.example')).toThrow();
    expect(() => service.validateReturnPath('/auth/../evil')).toThrow();
    expect(service.validateReturnPath('/auth/result')).toBe('/auth/result');
  });
  it('keeps identity and Workspace scopes separate', () => {
    expect(IDENTITY_SCOPES).toEqual(['openid', 'email', 'profile']);
    expect(WORKSPACE_SCOPES).not.toContain('https://www.googleapis.com/auth/drive');
  });
});
