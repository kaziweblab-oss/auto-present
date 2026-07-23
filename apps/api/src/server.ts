import { createServer } from 'node:http';
import { createApp } from './app.js';
import { env } from './config/env.js';
import { logger } from './config/logger.js';
import { connectToMongoDB, disconnectFromMongoDB } from './database/mongodb.js';
import { AuthService } from './modules/auth/auth.service.js';

const app = createApp();
const server = createServer(app);
let isShuttingDown = false;

function closeServer(): Promise<void> {
  return new Promise((resolve, reject) => {
    server.close((error) => {
      if (error) {
        reject(error);
        return;
      }
      resolve();
    });
  });
}

async function shutdown(signal: string): Promise<void> {
  if (isShuttingDown) return;
  isShuttingDown = true;
  logger.info('Graceful shutdown started', { signal });

  const forceExitTimer = setTimeout(() => {
    logger.error('Graceful shutdown timed out');
    process.exit(1);
  }, 10_000);
  forceExitTimer.unref();

  try {
    await closeServer();
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

process.on('SIGINT', () => void shutdown('SIGINT'));
process.on('SIGTERM', () => void shutdown('SIGTERM'));

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
