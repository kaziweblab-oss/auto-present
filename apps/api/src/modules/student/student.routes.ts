import { Router } from 'express';
import rateLimit from 'express-rate-limit';
import { z } from 'zod';
import { requireAuth, requireCookieCsrf } from '../auth/auth.middleware.js';
import { StudentService } from './student.service.js';

const registerSchema = z
  .object({
    department: z.string().trim().min(1).max(128),
    semester: z.string().trim().min(1).max(64),
    shift: z.string().trim().min(1).max(64),
    roll: z.string().trim().min(1).max(64),
  })
  .strict();

const attendanceHistorySchema = z
  .object({
    subjectCode: z.string().trim().min(1).max(64).optional(),
    dateFrom: z
      .string()
      .regex(/^\d{4}-\d{2}-\d{2}$/)
      .optional(),
    dateTo: z
      .string()
      .regex(/^\d{4}-\d{2}-\d{2}$/)
      .optional(),
  })
  .transform((val) => ({
    ...(val.subjectCode !== undefined && { subjectCode: val.subjectCode }),
    ...(val.dateFrom !== undefined && { dateFrom: val.dateFrom }),
    ...(val.dateTo !== undefined && { dateTo: val.dateTo }),
  }));

const registrationLimiter = rateLimit({
  windowMs: 60_000,
  limit: 5,
  standardHeaders: 'draft-8',
  legacyHeaders: false,
});

export function createStudentRouter(service = new StudentService()) {
  const router = Router();

  router.get('/registration-options', requireAuth, async (request, response, next) => {
    try {
      response.json({
        success: true,
        data: await service.getRegistrationOptions(request.auth!.userId, request.auth!.sessionId),
      });
    } catch (error) {
      next(error);
    }
  });

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
        const { department, semester, shift, roll } = registerSchema.parse(request.body);

        response.json({
          success: true,
          data: await service.register(
            request.auth!.userId,
            request.auth!.sessionId,
            department,
            semester,
            shift,
            roll,
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

  router.get('/attendance', requireAuth, async (request, response, next) => {
    try {
      response.json({
        success: true,
        data: await service.attendanceHistory(
          request.auth!.userId,
          request.auth!.sessionId,
          attendanceHistorySchema.parse(request.query),
        ),
      });
    } catch (error) {
      next(error);
    }
  });

  return router;
}
