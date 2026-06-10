import { Injectable } from '@nestjs/common';
import { InjectQueue } from '@nestjs/bullmq';
import { Queue, JobsOptions } from 'bullmq';
import { QUEUES } from './queue.constants';

@Injectable()
export class QueuesService {
  constructor(@InjectQueue(QUEUES.EMAIL) private emailQueue: Queue) {}

  async addToQueue(
    queueName: Queue,
    jobName: string,
    data: any,
    options?: JobsOptions,
  ) {
    const job = await queueName.add(jobName, data, {
      attempts: 3,
      backoff: 5000,
      removeOnComplete: true,
      removeOnFail: true,
      ...options,
    });

    return { jobId: job.id as string };
  }

  queueEmail(jobName: string, data: any, options?: JobsOptions) {
    return this.addToQueue(this.emailQueue, jobName, data, options);
  }
}
