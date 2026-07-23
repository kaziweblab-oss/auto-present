import type { ApiErrorResponse } from '@auto-present/shared';
import type { ErrorRequestHandler } from 'express';
import { ZodError } from 'zod';
import { env } from '../config/env.js';
import { logger, redactSensitiveFields } from '../config/logger.js';
import { AppError } from '../errors/app-error.js';

export const errorHandler: ErrorRequestHandler = (error, request, response, _next) => {
  const appError =
    error instanceof AppError
      ? error
      : error instanceof ZodError
        ? new AppError(
            400,
            'VALIDATION_ERROR',
            'Request validation failed',
            error.issues.map((issue) => ({
              field: issue.path.join('.'),
              message: issue.message,
            })),
          )
        : new AppError(500, 'INTERNAL_SERVER_ERROR', 'An unexpected error occurred');

  logger.error(
    'Request failed',
    redactSensitiveFields({
      requestId: request.requestId,
      method: request.method,
      path: request.path,
      code: appError.code,
      error: error instanceof Error ? error.message : 'Unknown error',
      ...(env.NODE_ENV !== 'production' && error instanceof Error ? { stack: error.stack } : {}),
    }),
  );

  const payload: ApiErrorResponse = {
    success: false,
    error: {
      code: appError.code,
      message: appError.message,
      ...(appError.details ? { details: appError.details } : {}),
    },
    meta: {
      requestId: request.requestId,
      timestamp: new Date().toISOString(),
    },
  };

  response.status(appError.statusCode).json(payload);
};
