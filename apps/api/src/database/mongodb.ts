import mongoose from 'mongoose';
import { logger } from '../config/logger.js';

export type MongoConnectionStatus = 'connected' | 'disconnected';

export function getMongoConnectionStatus(): MongoConnectionStatus {
  return mongoose.connection.readyState === mongoose.ConnectionStates.connected
    ? 'connected'
    : 'disconnected';
}

export async function connectToMongoDB(uri: string): Promise<void> {
  await mongoose.connect(uri, {
    serverSelectionTimeoutMS: 15_000,
  });
  logger.info('MongoDB connection established');
}

export async function disconnectFromMongoDB(): Promise<void> {
  if (mongoose.connection.readyState !== mongoose.ConnectionStates.disconnected) {
    await mongoose.disconnect();
    logger.info('MongoDB connection closed');
  }
}
