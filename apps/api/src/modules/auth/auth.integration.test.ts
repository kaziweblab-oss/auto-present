import { randomUUID } from 'node:crypto';
import mongoose from 'mongoose';
import request from 'supertest';
import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest';
import { createApp } from '../../app.js';
import { env } from '../../config/env.js';
import { AppError } from '../../errors/app-error.js';
import { hashToken, signAccessToken } from './auth.crypto.js';
import {
  AdminMembershipModel,
  AuditEventModel,
  AuthSessionModel,
  GoogleCredentialModel,
  OAuthTransactionModel,
  UserModel,
} from './auth.models.js';
import { AuthRepository } from './auth.repository.js';
import { AuthService, WORKSPACE_SCOPES } from './auth.service.js';

const TEST_URI = 'mongodb://127.0.0.1:27017/auto-present_test';

function assertSafeTestDatabase(uri: string): void {
  if (process.env.NODE_ENV !== 'test') throw new Error('Integration tests require NODE_ENV=test');
  const parsed = new URL(uri);
  const database = parsed.pathname.slice(1);
  if (!['127.0.0.1', 'localhost'].includes(parsed.hostname))
    throw new Error('Integration database must be local');
  if (!database.endsWith('_test') || database === 'auto-present')
    throw new Error('Refusing unsafe integration database');
}

async function createUser(subject = randomUUID()) {
  return UserModel.create({
    googleSubject: subject,
    email: `${subject}@example.test`,
    displayName: 'Test User',
    emailVerified: true,
    roles: [],
  });
}

describe('MongoDB-backed authentication', () => {
  const repository = new AuthRepository();
  const service = new AuthService(repository);

  beforeAll(async () => {
    assertSafeTestDatabase(TEST_URI);
    await mongoose.connect(TEST_URI);
    expect(mongoose.connection.db?.databaseName).toBe('auto-present_test');
  });
  beforeEach(async () => {
    expect(mongoose.connection.db?.databaseName).toBe('auto-present_test');
    await Promise.all([
      UserModel.deleteMany({}),
      AdminMembershipModel.deleteMany({}),
      AuthSessionModel.deleteMany({}),
      OAuthTransactionModel.deleteMany({}),
      GoogleCredentialModel.deleteMany({}),
      AuditEventModel.deleteMany({}),
    ]);
  });
  afterAll(async () => {
    expect(mongoose.connection.db?.databaseName).toBe('auto-present_test');
    await Promise.all([
      UserModel.deleteMany({}),
      AdminMembershipModel.deleteMany({}),
      AuthSessionModel.deleteMany({}),
      OAuthTransactionModel.deleteMany({}),
      GoogleCredentialModel.deleteMany({}),
      AuditEventModel.deleteMany({}),
    ]);
    await mongoose.disconnect();
  });

  it('rotates a refresh token and persists hashes only', async () => {
    const user = await createUser();
    const initial = await service.createSession(user, 'STUDENT', 'Test Browser', '127.0.0.1');
    const rotated = await service.refresh(initial.refreshToken);
    const stored = await AuthSessionModel.findOne({ userId: user._id }).lean();
    expect(rotated.refreshToken).not.toBe(initial.refreshToken);
    expect(stored.tokenHash).toBe(hashToken(rotated.refreshToken));
    expect(stored.previousTokenHashes).toContain(hashToken(initial.refreshToken));
    expect(JSON.stringify(stored)).not.toContain(initial.refreshToken);
    expect(JSON.stringify(stored)).not.toContain(rotated.refreshToken);
  });

  it('revokes the family and audits consumed refresh-token reuse', async () => {
    const user = await createUser();
    const initial = await service.createSession(user, 'STUDENT', 'Test Browser', '127.0.0.1');
    await service.refresh(initial.refreshToken);
    await expect(service.refresh(initial.refreshToken)).rejects.toMatchObject({
      code: 'REFRESH_TOKEN_REUSE',
    });
    const stored = await AuthSessionModel.findOne({ userId: user._id }).lean();
    expect(stored.revokedAt).toBeTruthy();
    expect(stored.revocationReason).toBe('REFRESH_TOKEN_REUSE');
    expect(await AuditEventModel.countDocuments({ event: 'REFRESH_TOKEN_REUSE' })).toBe(1);
  });

  it('allows at most one concurrent rotation and leaves one successor hash', async () => {
    const user = await createUser();
    const initial = await service.createSession(user, 'STUDENT', 'Test Browser', '127.0.0.1');
    const results = await Promise.allSettled([
      service.refresh(initial.refreshToken),
      service.refresh(initial.refreshToken),
    ]);
    const successes = results.filter((result) => result.status === 'fulfilled');
    expect(successes).toHaveLength(1);
    const success = results.find((result) => result.status === 'fulfilled');
    if (!success || success.status !== 'fulfilled')
      throw new Error('Expected one successful refresh');
    const successor = success.value.refreshToken;
    const stored = await AuthSessionModel.findOne({ userId: user._id }).lean();
    expect(stored.tokenHash).toBe(hashToken(successor));
    expect(await AuthSessionModel.countDocuments({ familyId: stored.familyId })).toBe(1);
  });

  it('enforces session ownership and isolates logout-all by user', async () => {
    const first = await createUser();
    const second = await createUser();
    const firstA = await service.createSession(first, 'STUDENT', 'A', '127.0.0.1');
    await service.createSession(first, 'STUDENT', 'B', '127.0.0.1');
    const other = await service.createSession(second, 'STUDENT', 'C', '127.0.0.1');
    await service.persistGoogleCredential(String(first._id), {
      refreshToken: `workspace-${randomUUID()}`,
    });
    const otherSession = await repository.findSessionByToken(hashToken(other.refreshToken));
    await repository.revokeSession(String(first._id), String(otherSession._id), 'USER_REVOKED');
    expect(
      (await repository.findSessionByToken(hashToken(other.refreshToken))).revokedAt,
    ).toBeFalsy();
    expect(await GoogleCredentialModel.findOne({ userId: first._id })).toBeTruthy();
    await repository.revokeAll(String(first._id), 'LOGOUT_ALL');
    expect(
      (await repository.findSessionByToken(hashToken(firstA.refreshToken))).revokedAt,
    ).toBeTruthy();
    expect(
      (await repository.findSessionByToken(hashToken(other.refreshToken))).revokedAt,
    ).toBeFalsy();
  });

  it('bootstraps a normalized super-admin idempotently without downgrade', async () => {
    const email = service.normalizeEmail('  ADMIN@Example.Test ');
    await repository.ensureInitialAdmin(email);
    await repository.ensureInitialAdmin(email);
    await repository.ensureInitialAdmin(email);
    expect(await AdminMembershipModel.countDocuments({ email, active: true })).toBe(1);
    expect((await AdminMembershipModel.findOne({ email }).lean()).superAdmin).toBe(true);
  });

  it('consumes OAuth state once and rejects expired/mismatched state', async () => {
    await repository.createTransaction({
      stateHash: hashToken('single-use'),
      pkceVerifier: 'verifier',
      requestedRole: 'STUDENT',
      flow: 'IDENTITY',
      returnPath: '/auth/result',
      browserHash: hashToken('browser'),
      expiresAt: new Date(Date.now() + 60_000),
    });
    expect(await repository.consumeTransaction(hashToken('wrong'))).toBeNull();
    expect(await repository.consumeTransaction(hashToken('single-use'))).toBeTruthy();
    expect(await repository.consumeTransaction(hashToken('single-use'))).toBeNull();
    await repository.createTransaction({
      stateHash: hashToken('expired'),
      pkceVerifier: 'verifier',
      requestedRole: 'STUDENT',
      flow: 'IDENTITY',
      returnPath: '/auth/result',
      expiresAt: new Date(Date.now() - 1),
    });
    expect(await repository.consumeTransaction(hashToken('expired'))).toBeNull();
    expect(() => service.validateReturnPath('//external.test')).toThrow(AppError);
  });

  it('preserves encrypted Google refresh credentials without plaintext', async () => {
    const user = await createUser();
    await service.persistGoogleCredential(String(user._id), {
      refreshToken: 'google-refresh-secret',
      scope: 'scope-b scope-a scope-a',
    });
    const first = await GoogleCredentialModel.findOne({ userId: user._id }).lean();
    await service.persistGoogleCredential(String(user._id), { scope: 'scope-a scope-b' });
    const second = await GoogleCredentialModel.findOne({ userId: user._id }).lean();
    expect(second.ciphertext).toBe(first.ciphertext);
    expect(second.scopes).toEqual(['scope-a', 'scope-b']);
    expect(JSON.stringify(second)).not.toContain('google-refresh-secret');
    expect(service.decryptCredential(second)).toBe('google-refresh-secret');
    await GoogleCredentialModel.updateOne(
      { _id: second._id },
      { $set: { authTag: Buffer.alloc(16).toString('base64') } },
    );
    await expect(async () =>
      service.decryptCredential(await GoogleCredentialModel.findById(second._id).lean()),
    ).rejects.toThrow();
  });

  it('rejects browser-binding mismatch before Google exchange and prevents replay', async () => {
    const state = 'browser-bound-state';
    await repository.createTransaction({
      stateHash: hashToken(state),
      pkceVerifier: 'verifier',
      requestedRole: 'STUDENT',
      flow: 'IDENTITY',
      returnPath: '/auth/result',
      browserHash: hashToken('expected-browser'),
      expiresAt: new Date(Date.now() + 60_000),
    });
    await expect(service.callback(state, 'unused-code', 'wrong-browser')).rejects.toMatchObject({
      code: 'OAUTH_TRANSACTION_INVALID',
    });
    expect(await repository.consumeTransaction(hashToken(state))).toBeNull();
  });

  it('redirects OAuth errors with safe requested-role and request-reference context', async () => {
    const state = 'safe-error-state';
    await repository.createTransaction({
      stateHash: hashToken(state),
      pkceVerifier: 'verifier',
      requestedRole: 'ADMIN',
      flow: 'IDENTITY',
      returnPath: '/auth/result',
      expiresAt: new Date(Date.now() + 60_000),
    });
    const response = await request(createApp({ authService: service, authRepository: repository }))
      .get('/api/v1/auth/google/callback')
      .query({ error: 'access_denied', state })
      .set('X-Request-ID', 'oauth-reference-1')
      .expect(302);
    expect(response.headers.location).toBeTruthy();
    const location = new URL(response.headers.location!);
    expect(location.searchParams.get('error')).toBe('access_denied');
    expect(location.searchParams.get('role')).toBe('ADMIN');
    expect(location.searchParams.get('requestId')).toBe('oauth-reference-1');
    expect(location.searchParams.has('state')).toBe(false);
  });

  it('uses account selection only for identity OAuth and keeps Workspace consent separate', async () => {
    const workspaceUser = await createUser();
    const identityUrl = new URL(
      await service.start('CAPTAIN', '/auth/result', 'IDENTITY', 'identity-browser'),
    );
    const workspaceUrl = new URL(
      await service.start(
        'CAPTAIN',
        '/auth/result',
        'WORKSPACE',
        'workspace-browser',
        String(workspaceUser._id),
      ),
    );
    expect(identityUrl.searchParams.get('prompt')).toBe('select_account');
    expect(workspaceUrl.searchParams.get('prompt')).toBe('consent');
    expect(workspaceUrl.searchParams.get('prompt')).not.toContain('select_account');
    const identityScopes = identityUrl.searchParams.get('scope')?.split(' ') ?? [];
    const workspaceScopes = workspaceUrl.searchParams.get('scope')?.split(' ') ?? [];
    expect(identityScopes).toEqual(expect.arrayContaining(['openid', 'email', 'profile']));
    expect(identityScopes.some((scope) => scope.includes('spreadsheets'))).toBe(false);
    expect(identityScopes.some((scope) => scope.includes('drive'))).toBe(false);
    expect(workspaceScopes).toEqual(expect.arrayContaining([...WORKSPACE_SCOPES]));
    await expect(
      service.start(
        'STUDENT',
        '/auth/result',
        'WORKSPACE',
        'student-browser',
        String(workspaceUser._id),
      ),
    ).rejects.toMatchObject({ code: 'WORKSPACE_AUTH_DENIED' });
  });

  it('protects Google disconnect with authentication, Origin, and double-submit CSRF', async () => {
    const user = await createUser();
    const session = await service.createSession(user, 'CAPTAIN', 'Browser', '127.0.0.1');
    const stored = await repository.findSessionByToken(hashToken(session.refreshToken));
    const access = await signAccessToken(String(user._id), String(stored._id), []);
    const app = createApp({
      authService: new AuthService(repository, async () => undefined),
      authRepository: repository,
    });
    const cookie = `ap_refresh=${session.refreshToken}; ap_csrf=csrf-disconnect`;
    await request(app)
      .post('/api/v1/auth/google/disconnect')
      .set('Origin', 'http://localhost:5173')
      .set('X-CSRF-Token', 'csrf-disconnect')
      .set('Cookie', cookie)
      .expect(401);
    await request(app)
      .post('/api/v1/auth/google/disconnect')
      .set('Authorization', `Bearer ${access}`)
      .set('Origin', 'http://localhost:5173')
      .set('Cookie', cookie)
      .expect(403);
    await request(app)
      .post('/api/v1/auth/google/disconnect')
      .set('Authorization', `Bearer ${access}`)
      .set('Origin', 'https://evil.test')
      .set('X-CSRF-Token', 'csrf-disconnect')
      .set('Cookie', cookie)
      .expect(403);
  });

  it('disconnects only the authenticated user, revokes their sessions, and audits safely', async () => {
    const user = await createUser();
    const other = await createUser();
    const current = await service.createSession(user, 'CAPTAIN', 'Current', '127.0.0.1');
    const second = await service.createSession(user, 'CAPTAIN', 'Second', '127.0.0.1');
    const otherSession = await service.createSession(other, 'CAPTAIN', 'Other', '127.0.0.1');
    const storedCurrent = await repository.findSessionByToken(hashToken(current.refreshToken));
    const access = await signAccessToken(String(user._id), String(storedCurrent._id), []);
    const plaintext = `workspace-${randomUUID()}`;
    await service.persistGoogleCredential(String(user._id), { refreshToken: plaintext });
    await service.persistGoogleCredential(String(other._id), {
      refreshToken: `other-${randomUUID()}`,
    });
    let revokedMatchingToken = false;
    const disconnectService = new AuthService(repository, async (token) => {
      revokedMatchingToken = token === plaintext;
    });
    const response = await request(
      createApp({ authService: disconnectService, authRepository: repository }),
    )
      .post('/api/v1/auth/google/disconnect')
      .set('Authorization', `Bearer ${access}`)
      .set('Origin', 'http://localhost:5173')
      .set('X-CSRF-Token', 'csrf-disconnect')
      .set('Cookie', `ap_refresh=${current.refreshToken}; ap_csrf=csrf-disconnect`)
      .expect(200);
    expect(response.body.data.status).toBe('DISCONNECTED');
    expect(revokedMatchingToken).toBe(true);
    expect(await GoogleCredentialModel.findOne({ userId: user._id })).toBeNull();
    expect(await GoogleCredentialModel.findOne({ userId: other._id })).toBeTruthy();
    expect(
      (await repository.findSessionByToken(hashToken(current.refreshToken))).revokedAt,
    ).toBeTruthy();
    expect(
      (await repository.findSessionByToken(hashToken(second.refreshToken))).revokedAt,
    ).toBeTruthy();
    expect(
      (await repository.findSessionByToken(hashToken(otherSession.refreshToken))).revokedAt,
    ).toBeFalsy();
    const cleared = Array.isArray(response.headers['set-cookie'])
      ? response.headers['set-cookie'].join(';')
      : String(response.headers['set-cookie'] ?? '');
    expect(cleared).toContain('ap_refresh=;');
    expect(cleared).toContain('ap_csrf=;');
    const audit = await AuditEventModel.findOne({
      actorUserId: user._id,
      event: 'GOOGLE_DISCONNECT',
      outcome: 'SUCCESS',
    }).lean();
    expect(audit).toBeTruthy();
    expect(JSON.stringify(audit)).not.toContain(plaintext);
  });

  it('treats absent or already-invalid credentials as terminal and remains idempotent', async () => {
    const user = await createUser();
    const first = await service.disconnectGoogle(String(user._id), 'session');
    expect(first.status).toBe('ALREADY_DISCONNECTED');
    const plaintext = `invalid-${randomUUID()}`;
    await service.persistGoogleCredential(String(user._id), { refreshToken: plaintext });
    const terminal = new AuthService(repository, async () => {
      throw Object.assign(new Error('terminal revocation result'), { response: { status: 400 } });
    });
    const second = await terminal.disconnectGoogle(String(user._id), 'session');
    expect(second.status).toBe('ALREADY_DISCONNECTED');
    expect(await GoogleCredentialModel.findOne({ userId: user._id })).toBeNull();
    const third = await terminal.disconnectGoogle(String(user._id), 'session');
    expect(third.status).toBe('ALREADY_DISCONNECTED');
    expect(
      JSON.stringify(await AuditEventModel.find({ actorUserId: user._id }).lean()),
    ).not.toContain(plaintext);
  });

  it('preserves Google credentials and sessions on retryable revocation failure', async () => {
    const user = await createUser();
    const session = await service.createSession(user, 'CAPTAIN', 'Browser', '127.0.0.1');
    const plaintext = `retry-${randomUUID()}`;
    await service.persistGoogleCredential(String(user._id), { refreshToken: plaintext });
    const retryable = new AuthService(repository, async () => {
      throw Object.assign(new Error('retryable revocation failure'), {
        response: { status: 503 },
      });
    });
    await expect(retryable.disconnectGoogle(String(user._id), 'session')).rejects.toMatchObject({
      statusCode: 503,
      code: 'GOOGLE_DISCONNECT_RETRYABLE',
    });
    expect(await GoogleCredentialModel.findOne({ userId: user._id })).toBeTruthy();
    expect(
      (await repository.findSessionByToken(hashToken(session.refreshToken))).revokedAt,
    ).toBeFalsy();
    const audit = await AuditEventModel.findOne({
      actorUserId: user._id,
      event: 'GOOGLE_DISCONNECT',
      outcome: 'FAILURE',
    }).lean();
    expect(JSON.stringify(audit)).not.toContain(plaintext);
  });

  it('enforces CSRF and Origin while allowing intentional bearer reads', async () => {
    const user = await createUser();
    const session = await service.createSession(user, 'STUDENT', 'Browser', '127.0.0.1');
    const app = createApp();
    const cookie = `ap_refresh=${session.refreshToken}; ap_csrf=csrf-value`;
    await request(app)
      .post('/api/v1/auth/refresh')
      .set('Origin', 'http://localhost:5173')
      .set('Cookie', cookie)
      .expect(403);
    await request(app)
      .post('/api/v1/auth/refresh')
      .set('Origin', 'http://localhost:5173')
      .set('X-CSRF-Token', 'wrong')
      .set('Cookie', cookie)
      .expect(403);
    await request(app)
      .post('/api/v1/auth/refresh')
      .set('Origin', 'https://evil.test')
      .set('X-CSRF-Token', 'csrf-value')
      .set('Cookie', cookie)
      .expect(403);
    await request(app)
      .post('/api/v1/auth/refresh')
      .set('Origin', 'http://localhost:5173')
      .set('X-CSRF-Token', 'csrf-value')
      .set('Cookie', cookie)
      .expect(200);
    const access = await signAccessToken(String(user._id), 'read-session', []);
    await request(app).get('/api/v1/auth/me').set('Authorization', `Bearer ${access}`).expect(200);
  });

  it('bootstraps fresh CSRF state without consuming a refresh token', async () => {
    const app = createApp();
    const anonymous = await request(app)
      .get('/api/v1/auth/bootstrap')
      .set('Origin', 'http://localhost:5173')
      .expect(200);
    expect(anonymous.headers['cache-control']).toContain('no-store');
    expect(anonymous.body.data.sessionPresent).toBe(false);
    expect(anonymous.body.data.csrfToken).toHaveLength(64);
    expect(anonymous.body.data.googleClientId).toBe(env.GOOGLE_CLIENT_ID);
    expect(JSON.stringify(anonymous.body)).not.toContain('refresh');

    const hinted = await request(app)
      .get('/api/v1/auth/bootstrap')
      .set('Origin', 'http://localhost:5173')
      .set('Cookie', 'ap_refresh=opaque-cookie-value')
      .expect(200);
    expect(hinted.body.data.sessionPresent).toBe(true);
    expect(await AuthSessionModel.countDocuments({})).toBe(0);
  });

  it('uses bootstrap-issued CSRF to refresh an existing session once', async () => {
    const user = await createUser();
    const session = await service.createSession(user, 'STUDENT', 'Browser', '127.0.0.1');
    const app = createApp();
    const bootstrap = await request(app)
      .get('/api/v1/auth/bootstrap')
      .set('Origin', 'http://localhost:5173')
      .set('Cookie', `ap_refresh=${session.refreshToken}`)
      .expect(200);
    const setCookie = bootstrap.headers['set-cookie'];
    const csrfCookie = (Array.isArray(setCookie) ? setCookie : [setCookie])
      .filter(Boolean)
      .map((value) => String(value ?? '').split(';')[0] ?? '')
      .find((value) => value.startsWith('ap_csrf='));
    expect(csrfCookie).toBeTruthy();
    await request(app)
      .post('/api/v1/auth/refresh')
      .set('Origin', 'http://localhost:5173')
      .set('X-CSRF-Token', bootstrap.body.data.csrfToken)
      .set('Cookie', [`ap_refresh=${session.refreshToken}`, csrfCookie!])
      .expect(200);
    const stored = await AuthSessionModel.findOne({ userId: user._id }).lean();
    expect(stored.previousTokenHashes).toHaveLength(1);
  });

  it('synchronizes rotated CSRF across bootstrap, refresh, and logout', async () => {
    const user = await createUser();
    const session = await service.createSession(user, 'CAPTAIN', 'Browser', '127.0.0.1');
    const app = createApp();
    const bootstrap = await request(app)
      .get('/api/v1/auth/bootstrap')
      .set('Origin', 'http://localhost:5173')
      .set('Cookie', `ap_refresh=${session.refreshToken}`)
      .expect(200);
    const bootstrapSetCookie = bootstrap.headers['set-cookie'];
    const bootstrapCookie = (
      Array.isArray(bootstrapSetCookie) ? bootstrapSetCookie : [bootstrapSetCookie]
    )
      .filter(Boolean)
      .map(String)
      .map((value) => value.split(';')[0] ?? '')
      .find((value) => value.startsWith('ap_csrf='));
    expect(bootstrapCookie).toBeTruthy();

    const refreshed = await request(app)
      .post('/api/v1/auth/refresh')
      .set('Origin', 'http://localhost:5173')
      .set('X-CSRF-Token', bootstrap.body.data.csrfToken)
      .set('Cookie', [`ap_refresh=${session.refreshToken}`, bootstrapCookie!])
      .expect(200);
    const refreshedSetCookie = refreshed.headers['set-cookie'];
    const rotatedCookies = (
      Array.isArray(refreshedSetCookie) ? refreshedSetCookie : [refreshedSetCookie]
    )
      .filter(Boolean)
      .map(String)
      .map((value) => value.split(';')[0] ?? '');
    const rotatedRefreshCookie = rotatedCookies.find((value) => value.startsWith('ap_refresh='));
    const rotatedCsrfCookie = rotatedCookies.find((value) => value.startsWith('ap_csrf='));
    expect(rotatedRefreshCookie).toBeTruthy();
    expect(rotatedCsrfCookie).toBeTruthy();
    expect(refreshed.body.data.csrfToken).toHaveLength(64);
    expect(refreshed.body.data.csrfToken === bootstrap.body.data.csrfToken).toBe(false);

    const stale = await request(app)
      .post('/api/v1/auth/logout')
      .set('Origin', 'http://localhost:5173')
      .set('X-CSRF-Token', bootstrap.body.data.csrfToken)
      .set('Cookie', [rotatedRefreshCookie!, rotatedCsrfCookie!])
      .expect(403);
    expect(stale.body.error.code).toBe('CSRF_INVALID');

    const loggedOut = await request(app)
      .post('/api/v1/auth/logout')
      .set('Origin', 'http://localhost:5173')
      .set('X-CSRF-Token', refreshed.body.data.csrfToken)
      .set('Cookie', [rotatedRefreshCookie!, rotatedCsrfCookie!])
      .expect(200);
    expect(loggedOut.body.data.loggedOut).toBe(true);
    const clearedCookies = loggedOut.headers['set-cookie'];
    const clearedCookieText = (
      Array.isArray(clearedCookies) ? clearedCookies : [clearedCookies]
    ).join(';');
    expect(clearedCookieText).toContain('ap_refresh=;');
    expect(clearedCookieText).toContain('ap_csrf=;');

    const anonymousBootstrap = await request(app)
      .get('/api/v1/auth/bootstrap')
      .set('Origin', 'http://localhost:5173')
      .expect(200);
    expect(anonymousBootstrap.body.data.sessionPresent).toBe(false);
    expect(anonymousBootstrap.body.data.csrfToken).toHaveLength(64);
    expect(anonymousBootstrap.body.data.csrfToken === refreshed.body.data.csrfToken).toBe(false);
    const anonymousSetCookie = anonymousBootstrap.headers['set-cookie'];
    const anonymousCsrfCookie = (
      Array.isArray(anonymousSetCookie) ? anonymousSetCookie : [anonymousSetCookie]
    )
      .filter(Boolean)
      .map(String)
      .map((value) => value.split(';')[0] ?? '')
      .find((value) => value.startsWith('ap_csrf='));
    expect(anonymousCsrfCookie).toBeTruthy();

    const restarted = await request(app)
      .post('/api/v1/auth/google/start')
      .set('Origin', 'http://localhost:5173')
      .set('X-CSRF-Token', anonymousBootstrap.body.data.csrfToken)
      .set('Cookie', anonymousCsrfCookie!)
      .send({ role: 'STUDENT', returnPath: '/auth/result' })
      .expect(200);
    expect(new URL(restarted.body.data.authorizationUrl).searchParams.get('prompt')).toBe(
      'select_account',
    );
  });

  it('clears cookies and revokes the current family on logout', async () => {
    const user = await createUser();
    const session = await service.createSession(user, 'STUDENT', 'Browser', '127.0.0.1');
    const app = createApp();
    await service.persistGoogleCredential(String(user._id), {
      refreshToken: `workspace-${randomUUID()}`,
    });
    const cookie = `ap_refresh=${session.refreshToken}; ap_csrf=csrf-value`;
    const response = await request(app)
      .post('/api/v1/auth/logout')
      .set('Origin', 'http://localhost:5173')
      .set('X-CSRF-Token', 'csrf-value')
      .set('Cookie', cookie)
      .expect(200);
    const logoutCookies = response.headers['set-cookie'];
    expect(
      Array.isArray(logoutCookies) ? logoutCookies.join(';') : String(logoutCookies ?? ''),
    ).toContain('ap_refresh=;');
    expect(
      Array.isArray(logoutCookies) ? logoutCookies.join(';') : String(logoutCookies ?? ''),
    ).toContain('ap_csrf=;');
    expect(
      (await repository.findSessionByToken(hashToken(session.refreshToken))).revokedAt,
    ).toBeTruthy();
    expect(await GoogleCredentialModel.findOne({ userId: user._id })).toBeTruthy();
    await expect(service.refresh(session.refreshToken)).rejects.toMatchObject({
      code: 'REFRESH_TOKEN_REUSE',
    });
  });

  it('returns a safe reuse error and clears cookies through the API', async () => {
    const user = await createUser();
    const initial = await service.createSession(user, 'STUDENT', 'Browser', '127.0.0.1');
    await service.refresh(initial.refreshToken);
    const response = await request(createApp())
      .post('/api/v1/auth/refresh')
      .set('Origin', 'http://localhost:5173')
      .set('X-CSRF-Token', 'csrf-value')
      .set('Cookie', `ap_refresh=${initial.refreshToken}; ap_csrf=csrf-value`)
      .expect(401);
    expect(response.body.error.code).toBe('REFRESH_TOKEN_REUSE');
    const clearedCookies = response.headers['set-cookie'];
    expect(
      Array.isArray(clearedCookies) ? clearedCookies.join(';') : String(clearedCookies ?? ''),
    ).toContain('ap_refresh=;');
  });
});
