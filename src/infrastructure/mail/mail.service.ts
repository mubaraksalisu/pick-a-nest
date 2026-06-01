import { Injectable, InternalServerErrorException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Resend } from 'resend';
import { verificationEmailTemplate } from './templates/verification-email.template';

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
    const verificationLink = `${this.configService.get<string>('FRONTEND_URL')}/auth/verify-email?token=${token}`;
    const html = verificationEmailTemplate(verificationLink);

    await this.sendEmail(email, 'Verify Your Email', html);
  }
}
