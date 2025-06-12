import Queue from 'bull';
import redis from '../config/redis';
import { logger } from '../utils/logger';

export const analysisQueue = new Queue('website analysis', {
  redis: {
    port: 6379,
    host: process.env.REDIS_URL?.includes('://') 
      ? new URL(process.env.REDIS_URL).hostname 
      : 'localhost',
  },
  defaultJobOptions: {
    attempts: 3,
    backoff: {
      type: 'exponential',
      delay: 2000,
    },
    removeOnComplete: 10,
    removeOnFail: 5,
  },
});

analysisQueue.on('completed', (job, result) => {
  logger.info(`Analysis job completed: ${job.id}`, { jobId: job.id, result });
});

analysisQueue.on('failed', (job, err) => {
  logger.error(`Analysis job failed: ${job.id}`, { jobId: job.id, error: err.message });
});

analysisQueue.on('stalled', (job) => {
  logger.warn(`Analysis job stalled: ${job.id}`, { jobId: job.id });
});

export default analysisQueue;