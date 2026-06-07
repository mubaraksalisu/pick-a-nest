import { Injectable } from '@nestjs/common';
import { InjectQueue } from '@nestjs/bullmq';
import { Queue } from 'bullmq';
import { QUEUES } from './queue.constants';

@Injectable()
export class QueuesService {
  constructor(@InjectQueue(QUEUES.EMAIL) private emailQueue: Queue) {}

  async addToQueue(queueName: Queue, jobName: string, data: any) {
    const job = await queueName.add(jobName, data, {
      attempts: 3,
      backoff: 5000,
    });

    return { jobId: job.id as string };
  }

  queueEmail(jobName: string, data: any) {
    console.log(`Queued email job: ${jobName} with data:`, data);
    return this.addToQueue(this.emailQueue, jobName, data);
  }
}
