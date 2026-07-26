/* eslint-disable @typescript-eslint/no-unsafe-member-access, @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-argument, @typescript-eslint/no-unsafe-call, @typescript-eslint/no-explicit-any, @typescript-eslint/no-base-to-string -- Express cookie/query values and repository DTOs are validated at the route boundary. */
import { Router, type Response } from 'express';
import rateLimit from 'express-rate-limit';
import { z } from 'zod';
import { env } from '../../config/env.js';
import { AppError } from '../../errors/app-error.js';
import { requireAuth, requireCookieCsrf } from './auth.middleware.js';
import { AuthRepository } from './auth.repository.js';
import { AuthService } from './auth.service.js';
import { hashToken, opaqueToken } from './auth.crypto.js';

const startSchema = z.object({
  role: z.enum(['ADMIN', 'CAPTAIN', 'STUDENT']),
  returnPath: z.string().default('/auth/result'),
});
const strictLimiter = rateLimit({
  windowMs: 60_000,
  limit: 20,
  standardHeaders: 'draft-8',
  legacyHeaders: false,
});
const bootstrapLimiter = rateLimit({
  windowMs: 60_000,
  limit: 60,
  standardHeaders: 'draft-8',
  legacyHeaders: false,
});
const disconnectLimiter = rateLimit({
  windowMs: 60_000,
  limit: 5,
  standardHeaders: 'draft-8',
  legacyHeaders: false,
});
const refreshCookie = 'ap_refresh';
const browserCookie = 'ap_browser';
const csrfCookie = 'ap_csrf';
const cookieBase = {
  httpOnly: true,
  secure: env.COOKIE_SECURE,
  sameSite: env.COOKIE_SAMESITE,
  domain: env.COOKIE_DOMAIN,
  path: '/api/v1/auth',
};
const clear = (response: Response) => {
  response.clearCookie(refreshCookie, cookieBase);
  response.clearCookie(csrfCookie, { ...cookieBase, httpOnly: false, path: '/' });
};
const sendTokens = (
  response: Response,
  result: { refreshToken: string; accessToken: string; csrfToken: string; user: unknown },
) => {
  response.cookie(refreshCookie, result.refreshToken, {
    ...cookieBase,
    maxAge: env.REFRESH_TOKEN_TTL * 1000,
  });
  response.cookie(csrfCookie, result.csrfToken, {
    ...cookieBase,
    httpOnly: false,
    path: '/',
    maxAge: env.REFRESH_TOKEN_TTL * 1000,
  });
  response.json({
    success: true,
    data: { accessToken: result.accessToken, csrfToken: result.csrfToken, user: result.user },
  });
};
const oauthErrorRedirect = (code: string, requestId: string, role?: string) => {
  const params = new URLSearchParams({ error: code, requestId });
  if (role) params.set('role', role);
  return `${env.WEB_APP_URL}/auth/result?${params.toString()}`;
};

export function createAuthRouter(service = new AuthService(), repository = new AuthRepository()) {
  const router = Router();
  router.get('/bootstrap', bootstrapLimiter, (request, response) => {
    const csrfToken = opaqueToken();
    response.set('Cache-Control', 'no-store');
    response.set('Pragma', 'no-cache');
    response.cookie(csrfCookie, csrfToken, {
      ...cookieBase,
      httpOnly: false,
      path: '/',
      maxAge: env.REFRESH_TOKEN_TTL * 1000,
    });
    response.json({
      success: true,
      data: {
        sessionPresent: Boolean(request.cookies?.[refreshCookie]),
        csrfToken,
        googleClientId: env.GOOGLE_CLIENT_ID,
      },
    });
  });
  router.post(
    '/google/start',
    strictLimiter,
    requireCookieCsrf,
    async (request, response, next) => {
      try {
        const body = startSchema.parse(request.body);
        let browserId = request.cookies?.[browserCookie] as string | undefined;
        if (!browserId) {
          browserId = crypto.randomUUID();
          response.cookie(browserCookie, browserId, {
            ...cookieBase,
            path: '/',
            maxAge: env.REFRESH_TOKEN_TTL * 1000,
          });
        }
        response.json({
          success: true,
          data: {
            authorizationUrl: await service.start(
              body.role,
              body.returnPath,
              'IDENTITY',
              browserId,
            ),
          },
        });
      } catch (error) {
        next(error);
      }
    },
  );
  router.get('/google/callback', strictLimiter, async (request, response) => {
    const state = String(request.query.state ?? '');
    const requestedRole = await service.requestedRoleForState(state);
    if (request.query.error)
      return response.redirect(
        oauthErrorRedirect(String(request.query.error), request.requestId, requestedRole),
      );
    try {
      const result = await service.callback(
        state,
        String(request.query.code ?? ''),
        request.cookies?.[browserCookie],
      );
      if ('workspace' in result)
        return response.redirect(`${env.WEB_APP_URL}${result.returnPath}?workspace=connected`);
      const session = await service.createSession(
        result.user,
        result.requestedRole,
        request.get('user-agent') ?? 'Unknown device',
        request.ip ?? '',
      );
      response.cookie(refreshCookie, session.refreshToken, {
        ...cookieBase,
        maxAge: env.REFRESH_TOKEN_TTL * 1000,
      });
      response.cookie(csrfCookie, session.csrfToken, {
        ...cookieBase,
        httpOnly: false,
        path: '/',
        maxAge: env.REFRESH_TOKEN_TTL * 1000,
      });
      return response.redirect(`${env.WEB_APP_URL}${result.returnPath}`);
    } catch (error) {
      const code = error instanceof AppError ? error.code : 'AUTHENTICATION_FAILED';
      return response.redirect(oauthErrorRedirect(code, request.requestId, requestedRole));
    }
  });
  router.post('/refresh', strictLimiter, requireCookieCsrf, async (request, response, next) => {
    try {
      sendTokens(response, await service.refresh(request.cookies?.[refreshCookie]));
    } catch (error) {
      clear(response);
      next(error);
    }
  });
  router.post('/logout', strictLimiter, requireCookieCsrf, async (request, response, next) => {
    try {
      const raw = request.cookies?.[refreshCookie];
      if (raw) {
        const session = await repository.findSessionByToken(hashToken(raw));
        if (session) await repository.revokeFamily(session.familyId, 'LOGOUT');
      }
      clear(response);
      response.json({ success: true, data: { loggedOut: true } });
    } catch (error) {
      next(error);
    }
  });
  router.post('/switch-role', requireAuth, requireCookieCsrf, async (request, response, next) => {
    try {
      const { targetRole } = z
        .object({ targetRole: z.enum(['ADMIN', 'CAPTAIN', 'STUDENT']) })
        .strict()
        .parse(request.body);
      const result = await service.switchRole(
        request.auth!.userId,
        request.auth!.sessionId,
        targetRole,
      );
      response.cookie(csrfCookie, result.csrfToken, {
        ...cookieBase,
        httpOnly: false,
        path: '/',
        maxAge: env.REFRESH_TOKEN_TTL * 1000,
      });
      response.json({
        success: true,
        data: {
          accessToken: result.accessToken,
          csrfToken: result.csrfToken,
          user: result.user,
        },
      });
    } catch (error) {
      next(error);
    }
  });
  router.get('/me', requireAuth, async (request, response, next) => {
    try {
      response.set('Cache-Control', 'no-store');
      const user = await repository.findUser(request.auth!.userId);
      if (!user) throw new AppError(404, 'USER_NOT_FOUND', 'User not found');
      if (user.status !== 'ACTIVE')
        throw new AppError(401, 'ACCOUNT_SUSPENDED', 'Account is not active');
      response.json({
        success: true,
        data: {
          id: String(user._id),
          email: user.email,
          displayName: user.displayName,
          avatarUrl: user.avatarUrl,
          roles: user.roles,
        },
      });
    } catch (error) {
      next(error);
    }
  });
  router.get('/sessions', requireAuth, async (request, response, next) => {
    try {
      response.set('Cache-Control', 'no-store');
      const user = await repository.findUser(request.auth!.userId);
      if (!user || user.status !== 'ACTIVE')
        throw new AppError(401, 'ACCOUNT_SUSPENDED', 'Account is not active');
      const sessions = await repository.listSessions(request.auth!.userId);
      response.json({
        success: true,
        data: sessions.map((s: any) => ({
          id: String(s._id),
          current: String(s._id) === request.auth!.sessionId,
          userAgent: s.userAgent,
          createdAt: s.createdAt,
          lastActivityAt: s.lastActivityAt,
          expiresAt: s.expiresAt,
        })),
      });
    } catch (error) {
      next(error);
    }
  });
  router.delete(
    '/sessions/:sessionId',
    requireAuth,
    requireCookieCsrf,
    async (request, response, next) => {
      try {
        await repository.revokeSession(
          request.auth!.userId,
          String(request.params.sessionId),
          'USER_REVOKED',
        );
        response.json({ success: true, data: { revoked: true } });
      } catch (error) {
        next(error);
      }
    },
  );
  router.post('/logout-all', requireAuth, requireCookieCsrf, async (request, response, next) => {
    try {
      await repository.revokeAll(request.auth!.userId, 'LOGOUT_ALL');
      clear(response);
      response.json({ success: true, data: { loggedOut: true } });
    } catch (error) {
      next(error);
    }
  });
  router.post(
    '/google/workspace/start',
    requireAuth,
    requireCookieCsrf,
    async (request, response, next) => {
      try {
        const body = startSchema.parse(request.body);
        response.json({
          success: true,
          data: {
            authorizationUrl: await service.start(
              body.role,
              body.returnPath,
              'WORKSPACE',
              request.cookies?.[browserCookie],
              request.auth!.userId,
            ),
          },
        });
      } catch (error) {
        next(error);
      }
    },
  );
  router.get('/google/connection', requireAuth, async (request, response, next) => {
    try {
      response.json({ success: true, data: await service.connection(request.auth!.userId) });
    } catch (error) {
      next(error);
    }
  });
  router.post(
    '/google/disconnect',
    disconnectLimiter,
    requireAuth,
    requireCookieCsrf,
    async (request, response, next) => {
      try {
        const result = await service.disconnectGoogle(
          request.auth!.userId,
          request.auth!.sessionId,
        );
        clear(response);
        response.json({ success: true, data: result });
      } catch (error) {
        next(error);
      }
    },
  );
  return router;
}
