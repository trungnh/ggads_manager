import { Queue } from 'bullmq';
import Redis from 'ioredis';

const redisConnection = new Redis(process.env.REDIS_URL || 'redis://localhost:6379', {
  maxRetriesPerRequest: null,
});

export const evaluationQueue = new Queue('RuleEvaluationQueue', {
  connection: redisConnection,
});

export const notificationQueue = new Queue('NotificationQueue', {
  connection: redisConnection,
});

export const revenueQueue = new Queue('RevenueQueue', {
  connection: redisConnection,
});
