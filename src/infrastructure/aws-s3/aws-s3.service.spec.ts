import { Test, TestingModule } from '@nestjs/testing';
import { ConfigService } from '@nestjs/config';

// uuid ships ESM-only and isn't transformed by ts-jest; mock it directly so
// importing AwsS3Service doesn't try to parse the real package.
jest.mock('uuid', () => ({
  v4: jest.fn(() => 'mock-uuid-v4'),
}));

const mockGetSignedUrl = jest.fn();
jest.mock('@aws-sdk/s3-request-presigner', () => ({
  getSignedUrl: (...args: unknown[]) => mockGetSignedUrl(...args),
}));

const mockPutObjectCommand = jest.fn();
jest.mock('@aws-sdk/client-s3', () => ({
  S3Client: jest.fn().mockImplementation(() => ({})),
  PutObjectCommand: jest.fn().mockImplementation(function (
    this: any,
    input: any,
  ) {
    mockPutObjectCommand(input);
    this.input = input;
  }),
}));

import { AwsS3Service } from './aws-s3.service';

describe('AwsS3Service', () => {
  let service: AwsS3Service;

  const buildConfigService = (
    overrides: Record<string, string | undefined> = {},
  ) => ({
    get: jest.fn().mockImplementation((key: string) => {
      const config: Record<string, string | undefined> = {
        AWS_REGION: 'us-east-1',
        AWS_ACCESS_KEY_ID: 'test-key',
        AWS_SECRET_ACCESS_KEY: 'test-secret',
        AWS_S3_BUCKET: 'test-bucket',
        CDN_URL: 'https://cdn.example.com',
        ...overrides,
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
  });

  const createService = async (configService = buildConfigService()) => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AwsS3Service,
        { provide: ConfigService, useValue: configService },
      ],
    }).compile();

    return module.get<AwsS3Service>(AwsS3Service);
  };

  beforeEach(async () => {
    mockGetSignedUrl.mockResolvedValue(
      'https://test-bucket.s3.us-east-1.amazonaws.com/signed',
    );
    service = await createService();
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('createPresignedUploadUrl', () => {
    it('should derive the extension from the filename and build the object key from a uuid', async () => {
      const result = await service.createPresignedUploadUrl(
        'photo.JPG',
        'image/jpeg',
      );

      expect(result.key).toBe('properties/mock-uuid-v4.jpg');
      expect(mockPutObjectCommand).toHaveBeenCalledWith({
        Bucket: 'test-bucket',
        Key: 'properties/mock-uuid-v4.jpg',
        ContentType: 'image/jpeg',
      });
    });

    it('should default expiresIn to 900 seconds and pass it to getSignedUrl', async () => {
      const result = await service.createPresignedUploadUrl(
        'photo.jpg',
        'image/jpeg',
      );

      expect(mockGetSignedUrl).toHaveBeenCalledWith(
        expect.anything(),
        expect.anything(),
        { expiresIn: 900 },
      );
      expect(result.expiresIn).toBe(900);
    });

    it('should use a custom expiresInSeconds when provided', async () => {
      const result = await service.createPresignedUploadUrl(
        'photo.jpg',
        'image/jpeg',
        60,
      );

      expect(mockGetSignedUrl).toHaveBeenCalledWith(
        expect.anything(),
        expect.anything(),
        { expiresIn: 60 },
      );
      expect(result.expiresIn).toBe(60);
    });

    it('should return the presigned upload url and the public url', async () => {
      const result = await service.createPresignedUploadUrl(
        'photo.jpg',
        'image/jpeg',
      );

      expect(result.uploadUrl).toBe(
        'https://test-bucket.s3.us-east-1.amazonaws.com/signed',
      );
      expect(result.url).toBe(
        'https://cdn.example.com/properties/mock-uuid-v4.jpg',
      );
    });

    it.each([
      ['image/jpeg', '.jpg'],
      ['image/jpg', '.jpg'],
      ['image/png', '.png'],
      ['image/webp', '.webp'],
    ])(
      'should fall back to the extension mapped from %s when the filename has none',
      async (contentType, expectedExtension) => {
        const result = await service.createPresignedUploadUrl(
          'no-extension',
          contentType,
        );

        expect(result.key).toBe(`properties/mock-uuid-v4${expectedExtension}`);
      },
    );

    it('should use an empty extension when the filename has none and the mime type is unmapped', async () => {
      const result = await service.createPresignedUploadUrl(
        'no-extension',
        'application/octet-stream',
      );

      expect(result.key).toBe('properties/mock-uuid-v4');
    });
  });

  describe('getPublicUrl', () => {
    it('should build a CDN url when CDN_URL is configured, stripping trailing slashes', async () => {
      const configService = buildConfigService({
        CDN_URL: 'https://cdn.example.com///',
      });
      service = await createService(configService);

      expect(service.getPublicUrl('properties/key.jpg')).toBe(
        'https://cdn.example.com/properties/key.jpg',
      );
    });

    it('should fall back to the S3 bucket url when CDN_URL is not configured', async () => {
      const configService = buildConfigService({ CDN_URL: undefined });
      service = await createService(configService);

      expect(service.getPublicUrl('properties/key.jpg')).toBe(
        'https://test-bucket.s3.us-east-1.amazonaws.com/properties/key.jpg',
      );
    });
  });
});
