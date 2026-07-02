import { Test, TestingModule } from '@nestjs/testing';
import { ConfigService } from '@nestjs/config';
// uuid ships ESM-only and isn't transformed by ts-jest; mock it directly so
// importing AwsS3Service doesn't try to parse the real package.
jest.mock('uuid', () => ({
  v4: jest.fn(() => 'mock-uuid-v4'),
}));
import { AwsS3Service } from './aws-s3.service';

describe('AwsS3Service', () => {
  let service: AwsS3Service;

  const configService = {
    get: jest.fn().mockImplementation((key: string) => {
      const config: Record<string, string> = {
        AWS_REGION: 'us-east-1',
        AWS_ACCESS_KEY_ID: 'test-key',
        AWS_SECRET_ACCESS_KEY: 'test-secret',
        AWS_S3_BUCKET: 'test-bucket',
        CDN_URL: 'https://cdn.example.com',
      };
      return config[key];
    }),
    getOrThrow: jest.fn().mockImplementation((key: string) => {
      const config: Record<string, string> = {
        AWS_REGION: 'us-east-1',
        AWS_ACCESS_KEY_ID: 'test-key',
        AWS_SECRET_ACCESS_KEY: 'test-secret',
        AWS_S3_BUCKET: 'test-bucket',
      };
      return config[key];
    }),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AwsS3Service,
        { provide: ConfigService, useValue: configService },
      ],
    }).compile();

    service = module.get<AwsS3Service>(AwsS3Service);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });
});
