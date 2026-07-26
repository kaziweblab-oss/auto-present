import { DEFAULT_API_PREFIX } from '@auto-present/config';
import cookieParser from 'cookie-parser';
import cors, { type CorsOptions } from 'cors';
import express, { type Express } from 'express';
import rateLimit from 'express-rate-limit';
import helmet from 'helmet';
import { env } from './config/env.js';
import { AppError } from './errors/app-error.js';
import { errorHandler } from './middleware/error-handler.js';
import { notFoundMiddleware } from './middleware/not-found.js';
import { requestIdMiddleware } from './middleware/request-id.js';
import { createHealthRouter } from './modules/health/health.routes.js';
import type { HealthService } from './modules/health/health.service.js';
import { createAuthRouter } from './modules/auth/auth.routes.js';
import type { AuthRepository } from './modules/auth/auth.repository.js';
import type { AuthService } from './modules/auth/auth.service.js';
import { createCaptainRouter } from './modules/captain/captain.routes.js';
import type { CaptainService } from './modules/captain/captain.service.js';
import { createStudentRouter } from './modules/student/student.routes.js';
import type { StudentService } from './modules/student/student.service.js';

export interface AppDependencies {
  healthService?: HealthService;
  authService?: AuthService;
  authRepository?: AuthRepository;
  captainService?: CaptainService;
  studentService?: StudentService;
}

function createCorsOptions(): CorsOptions {
  return {
    credentials: true,
    origin(origin, callback) {
      if (!origin || env.CORS_ALLOWED_ORIGINS.includes(origin)) {
        callback(null, true);
        return;
      }
      callback(new AppError(403, 'CORS_ORIGIN_DENIED', 'Origin is not allowed'));
    },
  };
}

export function createApp(dependencies: AppDependencies = {}): Express {
  const app = express();

  if (env.TRUST_PROXY) {
    app.set('trust proxy', 1);
  }

  app.disable('x-powered-by');
  app.use(requestIdMiddleware);
  app.use(helmet());
  app.use(cors(createCorsOptions()));
  app.use(express.json({ limit: '100kb' }));
  app.use(express.urlencoded({ extended: false, limit: '100kb' }));
  app.use(cookieParser());
  app.use(
    DEFAULT_API_PREFIX,
    rateLimit({
      windowMs: 60_000,
      limit: 120,
      standardHeaders: 'draft-8',
      legacyHeaders: false,
    }),
  );
  app.use(
    `${DEFAULT_API_PREFIX}/auth`,
    createAuthRouter(dependencies.authService, dependencies.authRepository),
  );
  app.use(`${DEFAULT_API_PREFIX}/captain`, createCaptainRouter(dependencies.captainService));
  app.use(`${DEFAULT_API_PREFIX}/student`, createStudentRouter(dependencies.studentService));
  app.use(
    `${DEFAULT_API_PREFIX}/health`,
    dependencies.healthService
      ? createHealthRouter(dependencies.healthService)
      : createHealthRouter(),
  );
  app.use(notFoundMiddleware);
  app.use(errorHandler);

  return app;
}
