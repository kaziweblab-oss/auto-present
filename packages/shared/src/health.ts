export type HealthStatus = 'ok' | 'ready' | 'not_ready';
export type DependencyStatus = 'connected' | 'disconnected';

export interface LiveHealthData {
  status: 'ok';
  service: 'auto-present-api';
  version: string;
  uptimeSeconds: number;
}

export interface ReadyHealthData {
  status: 'ready' | 'not_ready';
  dependencies: {
    mongodb: DependencyStatus;
  };
}
