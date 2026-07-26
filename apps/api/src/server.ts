import { createServer, type Server } from 'node:http';
import { createApp } from './app.js';
import { env } from './config/env.js';
import { logger } from './config/logger.js';
import { connectToMongoDB, disconnectFromMongoDB } from './database/mongodb.js';
import { AuthService } from './modules/auth/auth.service.js';

export function closeServer(srv: Server): Promise<void> {
  return new Promise((resolve, reject) => {
    srv.close((error) => {
      if (error) {
        reject(error);
        return;
      }
      resolve();
    });
  });
}

export async function shutdown(srv: Server, signal: string): Promise<void> {
  logger.info('Graceful shutdown started', { signal });

  const forceExitTimer = setTimeout(() => {
    logger.error('Graceful shutdown timed out');
    process.exit(1);
  }, 10_000);
  forceExitTimer.unref();

  try {
    await closeServer(srv);
    await disconnectFromMongoDB();
    clearTimeout(forceExitTimer);
    logger.info('Graceful shutdown completed');
    process.exit(0);
  } catch (error) {
    logger.error('Graceful shutdown failed', {
      error: error instanceof Error ? error.message : 'Unknown error',
    });
    process.exit(1);
  }
}

if (!process.env.VITEST) {
  const app = createApp();
  const server = createServer(app);
  let isShuttingDown = false;

  process.on('SIGINT', () => {
    if (isShuttingDown) return;
    isShuttingDown = true;
    void shutdown(server, 'SIGINT');
  });
  process.on('SIGTERM', () => {
    if (isShuttingDown) return;
    isShuttingDown = true;
    void shutdown(server, 'SIGTERM');
  });

  let shutdownInProgress = false;
  process.on('unhandledRejection', (reason) => {
    if (shutdownInProgress) return;
    shutdownInProgress = true;
    logger.error('Unhandled rejection', {
      error: reason instanceof Error ? reason.message : String(reason),
    });
    process.exit(1);
  });
  process.on('uncaughtException', (error) => {
    if (shutdownInProgress) return;
    shutdownInProgress = true;
    logger.error('Uncaught exception', { error: error.message });
    process.exit(1);
  });

  server.listen(env.PORT, () => {
    logger.info('API server listening', { port: env.PORT });
  });

  try {
    await connectToMongoDB(env.MONGODB_URI);
    await new AuthService().bootstrapAdmin();
  } catch (error) {
    logger.warn('MongoDB is unavailable; API remains live but is not ready', {
      error: error instanceof Error ? error.message : 'Unknown error',
    });
  }
}
