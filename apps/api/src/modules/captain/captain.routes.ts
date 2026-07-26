import { Router } from 'express';
import rateLimit from 'express-rate-limit';
import { z } from 'zod';
import { requireAuth, requireCookieCsrf } from '../auth/auth.middleware.js';
import { CaptainService } from './captain.service.js';

const registerSchema = z
  .object({
    sheetUrl: z.string().trim().url().max(500),
    captainRoll: z.string().trim().min(1).max(64),
  })
  .strict();

const attendanceSchema = z
  .object({
    subjectCode: z.string().trim().min(1).max(64),
    date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
    presentRolls: z.array(z.string().trim().min(1).max(64)).max(2_000),
    idempotencyKey: z.string().uuid(),
  })
  .strict()
  .superRefine((value, context) => {
    if (new Set(value.presentRolls).size !== value.presentRolls.length)
      context.addIssue({
        code: 'custom',
        path: ['presentRolls'],
        message: 'Present rolls must be unique',
      });
  });

const attendanceBatchSchema = z
  .object({
    subjectCodes: z.array(z.string().trim().min(1).max(64)).min(1).max(100),
    date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
    presentRolls: z.array(z.string().trim().min(1).max(64)).max(2_000),
    idempotencyKey: z.string().uuid(),
  })
  .strict()
  .superRefine((value, context) => {
    if (new Set(value.subjectCodes).size !== value.subjectCodes.length) {
      context.addIssue({
        code: 'custom',
        path: ['subjectCodes'],
        message: 'Subject codes must be unique',
      });
    }

    if (new Set(value.presentRolls).size !== value.presentRolls.length) {
      context.addIssue({
        code: 'custom',
        path: ['presentRolls'],
        message: 'Present rolls must be unique',
      });
    }
  });

const validRollsSchema = z
  .object({
    subjectCodes: z.array(z.string().trim().min(1).max(64)).min(1).max(100),
  })
  .strict()
  .superRefine((value, context) => {
    if (new Set(value.subjectCodes).size !== value.subjectCodes.length) {
      context.addIssue({
        code: 'custom',
        path: ['subjectCodes'],
        message: 'Subject codes must be unique',
      });
    }
  });

const registrationLimiter = rateLimit({
  windowMs: 60_000,
  limit: 5,
  standardHeaders: 'draft-8',
  legacyHeaders: false,
});

const validRollsLimiter = rateLimit({
  windowMs: 60_000,
  limit: 30,
  standardHeaders: 'draft-8',
  legacyHeaders: false,
});

const attendanceWriteLimiter = rateLimit({
  windowMs: 60_000,
  limit: 10,
  standardHeaders: 'draft-8',
  legacyHeaders: false,
});

export function createCaptainRouter(service = new CaptainService()) {
  const router = Router();
  router.get('/status', requireAuth, async (request, response, next) => {
    try {
      response.json({
        success: true,
        data: await service.status(request.auth!.userId, request.auth!.sessionId),
      });
    } catch (error) {
      next(error);
    }
  });
  router.post(
    '/registration',
    registrationLimiter,
    requireAuth,
    requireCookieCsrf,
    async (request, response, next) => {
      try {
        response.json({
          success: true,
          data: await service.register(
            request.auth!.userId,
            request.auth!.sessionId,
            registerSchema.parse(request.body),
            request.requestId,
          ),
        });
      } catch (error) {
        next(error);
      }
    },
  );
  router.get('/dashboard', requireAuth, async (request, response, next) => {
    try {
      response.json({
        success: true,
        data: await service.dashboard(request.auth!.userId, request.auth!.sessionId),
      });
    } catch (error) {
      next(error);
    }
  });
  router.post(
    '/attendance',
    attendanceWriteLimiter,
    requireAuth,
    requireCookieCsrf,
    async (request, response, next) => {
      try {
        response.json({
          success: true,
          data: await service.submitAttendance(
            request.auth!.userId,
            request.auth!.sessionId,
            attendanceSchema.parse(request.body),
            request.requestId,
          ),
        });
      } catch (error) {
        next(error);
      }
    },
  );

  router.post(
    '/attendance/valid-rolls',
    validRollsLimiter,
    requireAuth,
    requireCookieCsrf,
    async (request, response, next) => {
      try {
        response.json({
          success: true,
          data: await service.getValidAttendanceRolls(
            request.auth!.userId,
            request.auth!.sessionId,
            validRollsSchema.parse(request.body),
          ),
        });
      } catch (error) {
        next(error);
      }
    },
  );

  router.post(
    '/attendance/batch',
    attendanceWriteLimiter,
    requireAuth,
    requireCookieCsrf,
    async (request, response, next) => {
      try {
        response.json({
          success: true,
          data: await service.submitAttendanceBatch(
            request.auth!.userId,
            request.auth!.sessionId,
            attendanceBatchSchema.parse(request.body),
            request.requestId,
          ),
        });
      } catch (error) {
        next(error);
      }
    },
  );

  return router;
}
