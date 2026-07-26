import { describe, expect, it, vi } from 'vitest';
import { connectToMongoDB, disconnectFromMongoDB, getMongoConnectionStatus } from './mongodb.js';

const connectOptionsHistory: unknown[] = [];

vi.mock('mongoose', () => {
  const mockState = { value: 0 };
  const MockConnectionStates = { connected: 1, disconnected: 0 };
  const mockConnection = {
    get readyState() {
      return mockState.value;
    },
  };
  const mongoose = {
    connect: vi.fn(async (uri: string, options?: unknown) => {
      connectOptionsHistory.push(options);
      if (!uri || uri === '')
        throw new Error('MongooseError: The `uri` parameter must be a string');
      mockState.value = 1;
      return mongoose;
    }),
    disconnect: vi.fn(async () => {
      mockState.value = 0;
    }),
    connection: mockConnection,
    ConnectionStates: MockConnectionStates,
  };
  return { default: mongoose };
});

describe('connectToMongoDB', () => {
  it('rejects empty URI', async () => {
    await expect(connectToMongoDB('')).rejects.toThrow('must be a string');
  });

  it('rejects missing URI (empty string)', async () => {
    await expect(connectToMongoDB('')).rejects.toThrow();
  });

  it('connects successfully with valid URI and logs safely', async () => {
    await expect(connectToMongoDB('mongodb://127.0.0.1:27017/test')).resolves.toBeUndefined();
  });

  it('passes serverSelectionTimeoutMS of 15000', async () => {
    const options = connectOptionsHistory[connectOptionsHistory.length - 1] as Record<
      string,
      unknown
    >;
    expect(options.serverSelectionTimeoutMS).toBe(15_000);
  });
});

describe('disconnectFromMongoDB', () => {
  it('disconnects gracefully when connected', async () => {
    await connectToMongoDB('mongodb://127.0.0.1:27017/test');
    await expect(disconnectFromMongoDB()).resolves.toBeUndefined();
  });

  it('handles disconnect when already disconnected', async () => {
    await expect(disconnectFromMongoDB()).resolves.toBeUndefined();
  });
});

describe('getMongoConnectionStatus', () => {
  it('returns disconnected initially', () => {
    expect(getMongoConnectionStatus()).toBe('disconnected');
  });
});
