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

      case EMAIL_JOBS.VISIT_REQUESTED:
        await this.sendVisitRequestedEmail(job.data);
        break;

      case EMAIL_JOBS.VISIT_SCHEDULED:
        await this.sendVisitScheduledEmail(job.data);
        break;

      case EMAIL_JOBS.VISIT_RESCHEDULED:
        await this.sendVisitRescheduledEmail(job.data);
        break;

      case EMAIL_JOBS.VISIT_CANCELED:
        await this.sendVisitCanceledEmail(job.data);
        break;

      default:
        throw new Error(`[EmailProcessor] Unsupported job action: ${job.name}`);
    }
  }

  private async sendVerificationEmail(email: string, token: string) {
    await this.mailService.sendVerificationEmail(email, token);
  }

  private async sendVisitRequestedEmail(data: any) {
    await this.mailService.sendVisitRequestedEmail(
      data.email,
      data.recipientName,
      data.propertyTitle,
      data.propertyAddress,
      data.startDate,
      data.endDate,
      data.note,
    );
  }

  private async sendVisitScheduledEmail(data: any) {
    await this.mailService.sendVisitScheduledEmail(
      data.email,
      data.recipientName,
      data.propertyTitle,
      data.propertyAddress,
      data.startDate,
      data.endDate,
      data.note,
    );
  }

  private async sendVisitRescheduledEmail(data: any) {
    await this.mailService.sendVisitRescheduledEmail(
      data.email,
      data.recipientName,
      data.propertyTitle,
      data.propertyAddress,
      data.startDate,
      data.endDate,
      data.note,
    );
  }

  private async sendVisitCanceledEmail(data: any) {
    await this.mailService.sendVisitCanceledEmail(
      data.email,
      data.recipientName,
      data.propertyTitle,
      data.propertyAddress,
      data.startDate,
      data.endDate,
      data.note,
    );
  }
}
