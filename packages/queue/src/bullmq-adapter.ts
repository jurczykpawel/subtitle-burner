import { Queue } from 'bullmq';
import type { QueueAdapter, JobStatus } from '@subtitle-burner/types';

export class BullMQQueueAdapter implements QueueAdapter {
  private queue: Queue;

  constructor() {
    const redisUrl = process.env.REDIS_URL || 'redis://localhost:6379';
    const url = new URL(redisUrl);

    this.queue = new Queue('render', {
      connection: {
        host: url.hostname,
        port: parseInt(url.port || '6379', 10),
        password: url.password || undefined,
      },
    });
  }

  async enqueue(jobId: string, payload: Record<string, unknown>): Promise<void> {
    await this.queue.add('render', payload, {
      jobId,
      removeOnComplete: 100,
      removeOnFail: 100,
    });
  }

  async getStatus(jobId: string): Promise<JobStatus> {
    const job = await this.queue.getJob(jobId);
    if (!job) return 'queued';

    const state = await job.getState();
    switch (state) {
      case 'waiting':
      case 'delayed':
        return 'queued';
      case 'active':
        return 'processing';
      case 'completed':
        return 'completed';
      case 'failed':
        return 'failed';
      default:
        return 'queued';
    }
  }
}
