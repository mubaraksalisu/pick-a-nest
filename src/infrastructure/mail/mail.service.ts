import { Injectable, InternalServerErrorException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Resend } from 'resend';
import { verificationEmailTemplate } from './templates/verification-email.template';
import {
  visitCanceledTemplate,
  visitRequestedTemplate,
  visitRescheduledTemplate,
  visitScheduledTemplate,
} from './templates/visit-notification.template';

@Injectable()
export class MailService {
  private readonly resend: Resend;
  private readonly fromEmail: string;

  constructor(private readonly configService: ConfigService) {
    const apiKey = this.configService.get<string>('RESEND_API_KEY');

    if (!apiKey) {
      throw new InternalServerErrorException(
        'Resend API key is not configured',
      );
    }

    this.resend = new Resend(apiKey);

    this.fromEmail = this.configService.getOrThrow<string>('EMAIL_FROM');
  }

  async sendEmail(to: string, subject: string, html: string): Promise<void> {
    try {
      const response = await this.resend.emails.send({
        from: this.fromEmail,
        to,
        subject,
        html,
      });
    } catch (error) {
      throw new InternalServerErrorException('Failed to send email');
    }
  }

  async sendVerificationEmail(email: string, token: string) {
    const verificationLink = `${this.configService.getOrThrow<string>('FRONTEND_URL')}/auth/verify-email?token=${token}`;
    const html = verificationEmailTemplate(verificationLink);

    await this.sendEmail(email, 'Verify Your Email', html);
  }

  async sendVisitRequestedEmail(
    email: string,
    recipientName: string,
    propertyTitle: string,
    propertyAddress: string,
    startDate: string,
    endDate: string,
    note?: string,
  ) {
    const html = visitRequestedTemplate({
      recipientName,
      propertyTitle,
      propertyAddress,
      startDate,
      endDate,
      note,
    });

    await this.sendEmail(email, 'New Visit Request', html);
  }

  async sendVisitScheduledEmail(
    email: string,
    recipientName: string,
    propertyTitle: string,
    propertyAddress: string,
    startDate: string,
    endDate: string,
    note?: string,
  ) {
    const html = visitScheduledTemplate({
      recipientName,
      propertyTitle,
      propertyAddress,
      startDate,
      endDate,
      note,
    });

    await this.sendEmail(email, 'Visit Scheduled', html);
  }

  async sendVisitRescheduledEmail(
    email: string,
    recipientName: string,
    propertyTitle: string,
    propertyAddress: string,
    startDate: string,
    endDate: string,
    note?: string,
  ) {
    const html = visitRescheduledTemplate({
      recipientName,
      propertyTitle,
      propertyAddress,
      startDate,
      endDate,
      note,
    });

    await this.sendEmail(email, 'Visit Rescheduled', html);
  }

  async sendVisitCanceledEmail(
    email: string,
    recipientName: string,
    propertyTitle: string,
    propertyAddress: string,
    startDate: string,
    endDate: string,
    note?: string,
  ) {
    const html = visitCanceledTemplate({
      recipientName,
      propertyTitle,
      propertyAddress,
      startDate,
      endDate,
      note,
    });

    await this.sendEmail(email, 'Visit Cancelled', html);
  }
}
