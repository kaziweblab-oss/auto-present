import type { LiveHealthData, ReadyHealthData } from '@auto-present/shared';
import { getMongoConnectionStatus, type MongoConnectionStatus } from '../../database/mongodb.js';
import { APP_VERSION } from '../../config/version.js';

export interface HealthService {
  getLiveHealth(): LiveHealthData;
  getReadyHealth(): ReadyHealthData;
}

export function createHealthService(
  mongoStatus: () => MongoConnectionStatus = getMongoConnectionStatus,
): HealthService {
  return {
    getLiveHealth: () => ({
      status: 'ok',
      service: 'auto-present-api',
      version: APP_VERSION,
      uptimeSeconds: Math.floor(process.uptime()),
    }),
    getReadyHealth: () => {
      const mongodb = mongoStatus();
      return {
        status: mongodb === 'connected' ? 'ready' : 'not_ready',
        dependencies: { mongodb },
      };
    },
  };
}
