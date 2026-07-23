import type { ApiSuccessResponse, LiveHealthData, ReadyHealthData } from '@auto-present/shared';
import type { RequestHandler } from 'express';
import type { HealthService } from './health.service.js';

function successResponse<T>(requestId: string, data: T): ApiSuccessResponse<T> {
  return {
    success: true,
    data,
    meta: {
      requestId,
      timestamp: new Date().toISOString(),
    },
  };
}

export function createHealthController(healthService: HealthService): {
  live: RequestHandler;
  ready: RequestHandler;
} {
  return {
    live: (request, response) => {
      const data: LiveHealthData = healthService.getLiveHealth();
      response.status(200).json(successResponse(request.requestId, data));
    },
    ready: (request, response) => {
      const data: ReadyHealthData = healthService.getReadyHealth();
      response
        .status(data.status === 'ready' ? 200 : 503)
        .json(successResponse(request.requestId, data));
    },
  };
}
