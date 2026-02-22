import { Inngest } from 'inngest';
import type { QueueAdapter, JobStatus } from '@subtitle-burner/types';

export class InngestQueueAdapter implements QueueAdapter {
  private client: Inngest;

  constructor() {
    this.client = new Inngest({ id: 'subtitle-burner' });
  }

  async enqueue(jobId: string, payload: Record<string, unknown>): Promise<void> {
    await this.client.send({
      name: 'render/job.queued',
      data: { jobId, ...payload },
    });
  }

  async getStatus(_jobId: string): Promise<JobStatus> {
    // Inngest doesn't provide direct job status lookup.
    // Status is tracked in the database by the worker function.
    // Callers should query the DB instead.
    return 'queued';
  }

  getClient(): Inngest {
    return this.client;
  }
}
