import { Test, TestingModule } from '@nestjs/testing';
import { ConfigService } from '@nestjs/config';
import { InternalServerErrorException } from '@nestjs/common';
import { MailService } from './mail.service';

const mockSend = jest.fn();
jest.mock('resend', () => ({
  Resend: jest.fn().mockImplementation(() => ({
    emails: { send: mockSend },
  })),
}));

describe('MailService', () => {
  let service: MailService;

  const buildConfigService = (
    overrides: Record<string, string | undefined> = {},
  ) => ({
    get: jest.fn().mockImplementation((key: string) => {
      const config: Record<string, string | undefined> = {
        RESEND_API_KEY: 'test-resend-api-key',
        ...overrides,
      };
      return config[key];
    }),
    getOrThrow: jest.fn().mockImplementation((key: string) => {
      const config: Record<string, string> = {
        EMAIL_FROM: 'noreply@example.com',
        FRONTEND_URL: 'https://example.com',
      };
      return config[key];
    }),
  });

  const createService = async (configService = buildConfigService()) => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        MailService,
        { provide: ConfigService, useValue: configService },
      ],
    }).compile();

    return module.get<MailService>(MailService);
  };

  beforeEach(async () => {
    mockSend.mockReset().mockResolvedValue({ data: { id: 'email-id' } });
    service = await createService();
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  it('should throw when RESEND_API_KEY is not configured', async () => {
    const configService = buildConfigService({ RESEND_API_KEY: undefined });

    await expect(createService(configService)).rejects.toThrow(
      InternalServerErrorException,
    );
  });

  describe('sendEmail', () => {
    it('should send an email via Resend using the configured from address', async () => {
      await service.sendEmail('to@example.com', 'Subject', '<p>Hi</p>');

      expect(mockSend).toHaveBeenCalledWith({
        from: 'noreply@example.com',
        to: 'to@example.com',
        subject: 'Subject',
        html: '<p>Hi</p>',
      });
    });

    it('should throw InternalServerErrorException when Resend fails', async () => {
      mockSend.mockRejectedValueOnce(new Error('network error'));

      await expect(
        service.sendEmail('to@example.com', 'Subject', '<p>Hi</p>'),
      ).rejects.toThrow(InternalServerErrorException);
    });
  });

  describe('sendVerificationEmail', () => {
    it('should build a verification link from FRONTEND_URL and send the email', async () => {
      await service.sendVerificationEmail('to@example.com', 'tok123');

      expect(mockSend).toHaveBeenCalledWith(
        expect.objectContaining({
          to: 'to@example.com',
          subject: 'Verify Your Email',
          html: expect.stringContaining(
            'https://example.com/auth/verify-email?token=tok123',
          ),
        }),
      );
    });
  });

  describe('sendVisitRequestedEmail', () => {
    it('should send a visit requested notification', async () => {
      await service.sendVisitRequestedEmail(
        'to@example.com',
        'Jane',
        'Cozy Loft',
        '123 Main St',
        'Jan 1',
        'Jan 2',
        'a note',
      );

      expect(mockSend).toHaveBeenCalledWith(
        expect.objectContaining({
          to: 'to@example.com',
          subject: 'New Visit Request',
        }),
      );
    });
  });

  describe('sendVisitScheduledEmail', () => {
    it('should send a visit scheduled notification', async () => {
      await service.sendVisitScheduledEmail(
        'to@example.com',
        'Jane',
        'Cozy Loft',
        '123 Main St',
        'Jan 1',
        'Jan 2',
      );

      expect(mockSend).toHaveBeenCalledWith(
        expect.objectContaining({
          to: 'to@example.com',
          subject: 'Visit Scheduled',
        }),
      );
    });
  });

  describe('sendVisitConfirmedEmail', () => {
    it('should send a visit confirmed notification', async () => {
      await service.sendVisitConfirmedEmail(
        'to@example.com',
        'Jane',
        'Cozy Loft',
        '123 Main St',
        'Jan 1',
        'Jan 2',
      );

      expect(mockSend).toHaveBeenCalledWith(
        expect.objectContaining({
          to: 'to@example.com',
          subject: 'Visit Confirmed',
        }),
      );
    });
  });

  describe('sendVisitRescheduledEmail', () => {
    it('should send a visit rescheduled notification', async () => {
      await service.sendVisitRescheduledEmail(
        'to@example.com',
        'Jane',
        'Cozy Loft',
        '123 Main St',
        'Jan 1',
        'Jan 2',
      );

      expect(mockSend).toHaveBeenCalledWith(
        expect.objectContaining({
          to: 'to@example.com',
          subject: 'Visit Rescheduled',
        }),
      );
    });
  });

  describe('sendVisitReminderEmail', () => {
    it('should send a visit reminder notification', async () => {
      await service.sendVisitReminderEmail(
        'to@example.com',
        'Jane',
        'Cozy Loft',
        '123 Main St',
        'Jan 1',
        'Jan 2',
      );

      expect(mockSend).toHaveBeenCalledWith(
        expect.objectContaining({
          to: 'to@example.com',
          subject: 'Visit Reminder',
        }),
      );
    });
  });

  describe('sendVisitCanceledEmail', () => {
    it('should send a visit cancelled notification', async () => {
      await service.sendVisitCanceledEmail(
        'to@example.com',
        'Jane',
        'Cozy Loft',
        '123 Main St',
        'Jan 1',
        'Jan 2',
      );

      expect(mockSend).toHaveBeenCalledWith(
        expect.objectContaining({
          to: 'to@example.com',
          subject: 'Visit Cancelled',
        }),
      );
    });
  });
});
