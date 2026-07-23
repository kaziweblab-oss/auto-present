import type { LiveHealthData, ReadyHealthData } from '@auto-present/shared';
import { getMongoConnectionStatus, type MongoConnectionStatus } from '../../database/mongodb.js';

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
