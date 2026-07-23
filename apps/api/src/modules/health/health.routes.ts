import { Router } from 'express';
import { createHealthController } from './health.controller.js';
import { createHealthService, type HealthService } from './health.service.js';

export function createHealthRouter(healthService: HealthService = createHealthService()): Router {
  const router = Router();
  const controller = createHealthController(healthService);

  router.get('/live', controller.live);
  router.get('/ready', controller.ready);

  return router;
}
