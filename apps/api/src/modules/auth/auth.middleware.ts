import type { NextFunction, Request, Response } from 'express';
import { env } from '../../config/env.js';
import { AppError } from '../../errors/app-error.js';
import { verifyAccessToken } from './auth.crypto.js';

export async function requireAuth(request: Request, _response: Response, next: NextFunction) {
  try {
    const [scheme, token] = request.headers.authorization?.split(' ') ?? [];
    if (scheme !== 'Bearer' || !token)
      throw new AppError(401, 'AUTHENTICATION_REQUIRED', 'Authentication required');
    const claims = await verifyAccessToken(token);
    request.auth = {
      userId: claims.sub!,
      sessionId: claims.sid as string,
      roles: claims.roles as string[],
    };
    next();
  } catch (error) {
    next(
      error instanceof AppError
        ? error
        : new AppError(401, 'ACCESS_TOKEN_INVALID', 'Access token is invalid or expired'),
    );
  }
}

export function requireCookieCsrf(request: Request, _response: Response, next: NextFunction) {
  const origin = request.headers.origin;
  const referer = request.headers.referer;
  const allowed = env.CORS_ALLOWED_ORIGINS.some(
    (item) => origin === item || referer?.startsWith(`${item}/`),
  );
  if (!allowed) return next(new AppError(403, 'ORIGIN_DENIED', 'Request origin is not allowed'));
  const cookie = request.cookies?.['ap_csrf'] as string | undefined;
  if (!cookie || request.headers['x-csrf-token'] !== cookie)
    return next(new AppError(403, 'CSRF_INVALID', 'CSRF validation failed'));
  next();
}
