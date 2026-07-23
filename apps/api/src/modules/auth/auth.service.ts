/* eslint-disable @typescript-eslint/no-unsafe-return, @typescript-eslint/no-unsafe-member-access, @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-argument, @typescript-eslint/no-explicit-any -- Mongoose repository results are mapped before the HTTP boundary. */
import type { AuthFlow, UserRole } from '@auto-present/shared';
import { randomUUID } from 'node:crypto';
import { OAuth2Client } from 'google-auth-library';
import { AppError } from '../../errors/app-error.js';
import { env } from '../../config/env.js';
import {
  decryptGoogleToken,
  encryptGoogleToken,
  hashToken,
  opaqueToken,
  pkceChallenge,
  safeIpHash,
  signAccessToken,
} from './auth.crypto.js';
import { AuthRepository } from './auth.repository.js';

export type GoogleTokenRevoker = (token: string) => Promise<void>;

export const IDENTITY_SCOPES = ['openid', 'email', 'profile'] as const;
export const WORKSPACE_SCOPES = [
  'https://www.googleapis.com/auth/spreadsheets',
  'https://www.googleapis.com/auth/drive.file',
] as const;
const SAFE_PATH = /^\/[a-zA-Z0-9/_-]*$/;

export class AuthService {
  constructor(
    private readonly repository = new AuthRepository(),
    private readonly tokenRevoker?: GoogleTokenRevoker,
  ) {}
  normalizeEmail(email: string) {
    return email.trim().toLowerCase();
  }
  validateReturnPath(path: string) {
    if (!SAFE_PATH.test(path) || path.startsWith('//') || path.includes('..'))
      throw new AppError(400, 'UNSAFE_RETURN_PATH', 'Invalid return path');
    return path;
  }
  async requestedRoleForState(state: string) {
    if (!state) return undefined;
    const transaction = await this.repository.findActiveTransaction(hashToken(state));
    return transaction?.requestedRole as UserRole | undefined;
  }
  client(flow: AuthFlow) {
    return new OAuth2Client(
      env.GOOGLE_CLIENT_ID,
      env.GOOGLE_CLIENT_SECRET,
      flow === 'IDENTITY' ? env.GOOGLE_IDENTITY_REDIRECT_URI : env.GOOGLE_WORKSPACE_REDIRECT_URI,
    );
  }
  async bootstrapAdmin() {
    return this.repository.ensureInitialAdmin(this.normalizeEmail(env.INITIAL_ADMIN_EMAIL));
  }
  async start(
    role: UserRole,
    returnPath: string,
    flow: AuthFlow,
    browserId?: string,
    userId?: string,
  ) {
    if (flow === 'WORKSPACE' && (!userId || role === 'STUDENT'))
      throw new AppError(403, 'WORKSPACE_AUTH_DENIED', 'Workspace authorization is not available');
    const state = opaqueToken();
    const verifier = opaqueToken();
    await this.repository.createTransaction({
      stateHash: hashToken(state),
      pkceVerifier: verifier,
      requestedRole: role,
      flow,
      returnPath: this.validateReturnPath(returnPath),
      browserHash: browserId ? hashToken(browserId) : undefined,
      userId,
      expiresAt: new Date(Date.now() + 10 * 60_000),
    });
    const scopes = flow === 'IDENTITY' ? [...IDENTITY_SCOPES] : [...WORKSPACE_SCOPES];
    return this.client(flow).generateAuthUrl({
      access_type: 'offline',
      scope: scopes,
      state,
      code_challenge: pkceChallenge(verifier),
      code_challenge_method: 'S256' as any,
      include_granted_scopes: true,
      ...(flow === 'IDENTITY' ? { prompt: 'select_account' } : { prompt: 'consent' }),
    });
  }
  async callback(state: string, code: string, browserId?: string) {
    const transaction = await this.repository.consumeTransaction(hashToken(state));
    if (
      !transaction ||
      (transaction.browserHash && transaction.browserHash !== hashToken(browserId ?? ''))
    )
      throw new AppError(
        401,
        'OAUTH_TRANSACTION_INVALID',
        'OAuth transaction is invalid or expired',
      );
    let tokens;
    try {
      ({ tokens } = await this.client(transaction.flow as AuthFlow).getToken({
        code,
        codeVerifier: transaction.pkceVerifier as string,
      }));
    } catch {
      throw new AppError(401, 'GOOGLE_OAUTH_FAILED', 'Google authentication failed');
    }
    if (transaction.flow === 'WORKSPACE') {
      await this.persistGoogleCredential(String(transaction.userId), {
        ...(tokens.refresh_token ? { refreshToken: tokens.refresh_token } : {}),
        ...(tokens.scope ? { scope: tokens.scope } : {}),
        ...(tokens.expiry_date ? { expiryDate: tokens.expiry_date } : {}),
      });
      return { returnPath: transaction.returnPath as string, workspace: true };
    }
    if (!tokens.id_token)
      throw new AppError(401, 'GOOGLE_IDENTITY_INVALID', 'Google identity could not be verified');
    const ticket = await this.client('IDENTITY').verifyIdToken({
      idToken: tokens.id_token,
      audience: env.GOOGLE_CLIENT_ID,
    });
    const payload = ticket.getPayload();
    if (!payload?.sub || !payload.email || !payload.email_verified)
      throw new AppError(401, 'GOOGLE_EMAIL_UNVERIFIED', 'A verified Google email is required');
    const user = await this.repository.upsertGoogleUser({
      sub: payload.sub,
      email: this.normalizeEmail(payload.email),
      name: payload.name ?? payload.email,
      ...(payload.picture ? { picture: payload.picture } : {}),
    });
    const roles = await this.repository.authorizeRequestedRole(
      user._id,
      user.email,
      transaction.requestedRole as UserRole,
    );
    if (transaction.requestedRole === 'ADMIN' && !roles.includes('ADMIN'))
      throw new AppError(403, 'ADMIN_ACCESS_DENIED', 'Administrator access is not authorized');
    return {
      returnPath: transaction.returnPath as string,
      user: { ...user, roles: [...new Set([...(user.roles as UserRole[]), ...roles])] },
      requestedRole: transaction.requestedRole as UserRole,
    };
  }
  async createSession(
    user: { _id: unknown; roles: string[] },
    requestedRole: UserRole,
    userAgent: string,
    ip: string,
  ) {
    const raw = opaqueToken();
    const familyId = randomUUID();
    const expiresAt = new Date(Date.now() + env.REFRESH_TOKEN_TTL * 1000);
    const session = await this.repository.createSession({
      userId: user._id,
      requestedRole,
      familyId,
      tokenHash: hashToken(raw),
      previousTokenHashes: [],
      userAgent: userAgent.slice(0, 200),
      ipHash: safeIpHash(ip),
      lastActivityAt: new Date(),
      expiresAt,
    });
    return {
      refreshToken: raw,
      accessToken: await signAccessToken(String(user._id), String(session._id), user.roles),
      csrfToken: opaqueToken(),
      expiresAt,
      requestedRole,
    };
  }
  async refresh(raw: string) {
    if (!raw) throw new AppError(401, 'SESSION_EXPIRED', 'Session expired');
    const hashed = hashToken(raw);
    const session = await this.repository.findSessionByToken(hashed);
    if (!session) throw new AppError(401, 'SESSION_EXPIRED', 'Session expired');
    if (session.tokenHash !== hashed) {
      await this.repository.revokeFamily(session.familyId, 'REFRESH_TOKEN_REUSE');
      await this.repository.audit({
        actorUserId: session.userId,
        sessionId: String(session._id),
        event: 'REFRESH_TOKEN_REUSE',
        outcome: 'FAILURE',
        occurredAt: new Date(),
      });
      throw new AppError(401, 'REFRESH_TOKEN_REUSE', 'Session revoked for security');
    }
    const successor = opaqueToken();
    const rotated = await this.repository.rotateSession(session._id, hashed, hashToken(successor));
    if (!rotated) throw new AppError(401, 'REFRESH_TOKEN_REUSE', 'Session revoked for security');
    const user = await this.repository.findUser(String(session.userId));
    if (!user) throw new AppError(401, 'SESSION_EXPIRED', 'Session expired');
    return {
      refreshToken: successor,
      accessToken: await signAccessToken(String(user._id), String(session._id), user.roles),
      csrfToken: opaqueToken(),
      user: { ...user, requestedRole: session.requestedRole },
    };
  }
  async connection(userId: string) {
    const credential = await this.repository.findCredential(userId);
    return credential
      ? { status: credential.status, scopes: credential.scopes }
      : { status: 'NOT_CONNECTED', scopes: [] };
  }
  async disconnectGoogle(userId: string, sessionId: string) {
    const credential = await this.repository.findCredential(userId);
    let status: 'DISCONNECTED' | 'ALREADY_DISCONNECTED' = 'ALREADY_DISCONNECTED';
    if (credential) {
      const encrypted = {
        ciphertext: credential.ciphertext,
        iv: credential.iv,
        authTag: credential.authTag,
        keyVersion: credential.keyVersion,
      };
      if (
        Object.values(encrypted).every((value) => typeof value === 'string' && value.length > 0)
      ) {
        const token = decryptGoogleToken(encrypted);
        try {
          if (this.tokenRevoker) await this.tokenRevoker(token);
          else await this.client('WORKSPACE').revokeToken(token);
          status = 'DISCONNECTED';
        } catch (error) {
          const responseStatus =
            typeof error === 'object' && error !== null && 'response' in error
              ? (error as { response?: { status?: number } }).response?.status
              : undefined;
          if (responseStatus !== 400 && responseStatus !== 401) {
            await this.repository.audit({
              actorUserId: userId,
              sessionId,
              event: 'GOOGLE_DISCONNECT',
              outcome: 'FAILURE',
              metadata: { reason: 'GOOGLE_REVOCATION_RETRYABLE' },
              occurredAt: new Date(),
            });
            throw new AppError(
              503,
              'GOOGLE_DISCONNECT_RETRYABLE',
              'Google connection could not be disconnected. Please retry.',
            );
          }
        }
      }
      await this.repository.deleteCredential(userId);
    }
    await this.repository.revokeAll(userId, 'GOOGLE_DISCONNECT');
    await this.repository.audit({
      actorUserId: userId,
      sessionId,
      event: 'GOOGLE_DISCONNECT',
      outcome: 'SUCCESS',
      metadata: { status },
      occurredAt: new Date(),
    });
    return { status };
  }
  async persistGoogleCredential(
    userId: string,
    tokens: { refreshToken?: string; scope?: string | null; expiryDate?: number },
  ) {
    const existing = await this.repository.findCredential(userId);
    const encrypted = tokens.refreshToken
      ? encryptGoogleToken(tokens.refreshToken)
      : existing?.ciphertext
        ? {
            ciphertext: existing.ciphertext,
            iv: existing.iv,
            authTag: existing.authTag,
            keyVersion: existing.keyVersion,
          }
        : {};
    return this.repository.upsertCredential(userId, {
      ...encrypted,
      scopes: [...new Set((tokens.scope ?? '').split(' ').filter(Boolean))].sort(),
      status: 'CONNECTED',
      accessExpiresAt: tokens.expiryDate ? new Date(tokens.expiryDate) : undefined,
    });
  }
  decryptCredential(value: Parameters<typeof decryptGoogleToken>[0]) {
    return decryptGoogleToken(value);
  }
}
