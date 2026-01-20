import { createClient } from 'redis';
import { logger } from '../utils/logger';

const redisClient = createClient({
  url: process.env.REDIS_URL || 'redis://localhost:6379',
});

redisClient.on('error', (err) => {
  logger.error('Redis Client Error', { error: err });
});

redisClient.on('connect', () => {
  logger.info('Redis Client Connected');
});

// Connect to Redis
export const connectRedis = async (): Promise<void> => {
  try {
    await redisClient.connect();
    logger.info('Redis connection established');
  } catch (error) {
    logger.error('Redis connection failed', { error });
    throw error;
  }
};

export const redis = redisClient;

// Cache helper functions
export const cache = {
  get: async (key: string): Promise<string | null> => {
    try {
      return await redisClient.get(key);
    } catch (error) {
      logger.error('Redis GET error', { key, error });
      return null;
    }
  },
  set: async (key: string, value: string, ttlSeconds?: number): Promise<void> => {
    try {
      if (ttlSeconds) {
        await redisClient.setEx(key, ttlSeconds, value);
      } else {
        await redisClient.set(key, value);
      }
    } catch (error) {
      logger.error('Redis SET error', { key, error });
    }
  },
  del: async (key: string): Promise<void> => {
    try {
      await redisClient.del(key);
    } catch (error) {
      logger.error('Redis DEL error', { key, error });
    }
  },
};
