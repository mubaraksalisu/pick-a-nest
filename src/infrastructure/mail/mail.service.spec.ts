import { Test, TestingModule } from '@nestjs/testing';
import { ConfigService } from '@nestjs/config';
import { MailService } from './mail.service';

describe('MailService', () => {
  let service: MailService;

  const configService = {
    get: jest.fn().mockImplementation((key: string) => {
      const config: Record<string, string> = {
        RESEND_API_KEY: 'test-resend-api-key',
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
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        MailService,
        { provide: ConfigService, useValue: configService },
      ],
    }).compile();

    service = module.get<MailService>(MailService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });
});
