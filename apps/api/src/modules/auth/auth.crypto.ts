import { createCipheriv, createDecipheriv, createHash, createHmac, randomBytes } from 'node:crypto';
import { SignJWT, jwtVerify } from 'jose';
import { env } from '../../config/env.js';

export const hashToken = (value: string): string =>
  createHash('sha256').update(value).digest('hex');
export const opaqueToken = (): string => randomBytes(48).toString('base64url');
export const safeIpHash = (ip: string): string =>
  createHmac('sha256', env.IP_HASH_SECRET).update(ip).digest('hex');
export const pkceChallenge = (verifier: string): string =>
  createHash('sha256').update(verifier).digest('base64url');

export interface EncryptedValue {
  ciphertext: string;
  iv: string;
  authTag: string;
  keyVersion: string;
}
export function encryptGoogleToken(token: string): EncryptedValue {
  const iv = randomBytes(12);
  const cipher = createCipheriv(
    'aes-256-gcm',
    Buffer.from(env.GOOGLE_TOKEN_ENCRYPTION_KEY, 'base64'),
    iv,
  );
  const ciphertext = Buffer.concat([cipher.update(token, 'utf8'), cipher.final()]);
  return {
    ciphertext: ciphertext.toString('base64'),
    iv: iv.toString('base64'),
    authTag: cipher.getAuthTag().toString('base64'),
    keyVersion: env.GOOGLE_TOKEN_ENCRYPTION_KEY_VERSION,
  };
}
export function decryptGoogleToken(value: EncryptedValue): string {
  const decipher = createDecipheriv(
    'aes-256-gcm',
    Buffer.from(env.GOOGLE_TOKEN_ENCRYPTION_KEY, 'base64'),
    Buffer.from(value.iv, 'base64'),
  );
  decipher.setAuthTag(Buffer.from(value.authTag, 'base64'));
  return Buffer.concat([
    decipher.update(Buffer.from(value.ciphertext, 'base64')),
    decipher.final(),
  ]).toString('utf8');
}

const jwtKey = new TextEncoder().encode(env.JWT_ACCESS_SECRET);
export async function signAccessToken(
  userId: string,
  sessionId: string,
  roles: string[],
): Promise<string> {
  return new SignJWT({ sid: sessionId, roles: [...roles] })
    .setProtectedHeader({ alg: 'HS256', kid: env.JWT_KEY_ID })
    .setSubject(userId)
    .setIssuer(env.JWT_ISSUER)
    .setAudience(env.JWT_AUDIENCE)
    .setIssuedAt()
    .setExpirationTime(`${env.ACCESS_TOKEN_TTL}s`)
    .sign(jwtKey);
}
export async function verifyAccessToken(token: string) {
  const result = await jwtVerify(token, jwtKey, {
    algorithms: ['HS256'],
    issuer: env.JWT_ISSUER,
    audience: env.JWT_AUDIENCE,
    requiredClaims: ['sub', 'sid', 'roles'],
  });
  if (
    !result.payload.sub ||
    typeof result.payload.sid !== 'string' ||
    !Array.isArray(result.payload.roles)
  )
    throw new Error('Invalid access token claims');
  return result.payload;
}
