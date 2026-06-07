// src/audio.processor.ts
import { Processor, WorkerHost } from '@nestjs/bullmq';
import { Job } from 'bullmq';
import { EMAIL_JOBS, QUEUES } from '../queue.constants';
import { MailService } from 'src/infrastructure/mail/mail.service';

@Processor(QUEUES.EMAIL)
export class EmailProcessor extends WorkerHost {
  constructor(private readonly mailService: MailService) {
    super();
  }

  async process(job: Job<any, any, string>): Promise<any> {
    switch (job.name) {
      case EMAIL_JOBS.EMAIL_VERIFICATION:
        await this.sendVerificationEmail(job.data.email, job.data.token);
        break;

      default:
        throw new Error(`[EmailProcessor] Unsupported job action: ${job.name}`);
    }
  }

  private async sendVerificationEmail(email: string, token: string) {
    await this.mailService.sendVerificationEmail(email, token);
    console.log(
      `Sending verification email to ${email} with token ${token}...`,
    );
  }
}
