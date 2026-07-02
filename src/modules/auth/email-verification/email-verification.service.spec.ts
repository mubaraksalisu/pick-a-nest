import { Test, TestingModule } from '@nestjs/testing';
import { getModelToken } from '@nestjs/mongoose';
import { EmailVerificationService } from './email-verification.service';
import { EmailVerification } from './email-verification.schema';

describe('EmailVerificationService', () => {
  let service: EmailVerificationService;
  let model: any;

  function mockEmailVerificationModel(this: any, dto: any) {
    this.data = dto;
    this.save = jest.fn().mockResolvedValue({ _id: 'ev1', ...dto });
  }
  mockEmailVerificationModel.findOne = jest.fn();
  mockEmailVerificationModel.findByIdAndDelete = jest.fn();

  beforeEach(async () => {
    model = mockEmailVerificationModel;

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        EmailVerificationService,
        { provide: getModelToken(EmailVerification.name), useValue: model },
      ],
    }).compile();

    service = module.get<EmailVerificationService>(EmailVerificationService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('create', () => {
    it('should save and return a new email verification record', async () => {
      const expireAt = new Date(Date.now() + 60 * 60 * 1000);

      const result = await service.create('u1', 'hashed-token', expireAt);

      expect(result).toEqual({
        _id: 'ev1',
        userId: 'u1',
        hashedToken: 'hashed-token',
        expireAt,
      });
    });
  });

  describe('validateToken', () => {
    it('should return the record when the token is valid and not expired', async () => {
      const record = {
        _id: 'ev1',
        userId: 'u1',
        hashedToken: 'hashed-token',
        expireAt: new Date(Date.now() + 60 * 60 * 1000),
      };
      model.findOne.mockResolvedValue(record);

      const result = await service.validateToken('hashed-token');

      expect(model.findOne).toHaveBeenCalledWith({
        hashedToken: 'hashed-token',
      });
      expect(result).toBe(record);
    });

    it('should return null when no record matches the token', async () => {
      model.findOne.mockResolvedValue(null);

      const result = await service.validateToken('missing-token');

      expect(result).toBeNull();
    });

    it('should return null when the token has expired', async () => {
      const record = {
        _id: 'ev1',
        userId: 'u1',
        hashedToken: 'hashed-token',
        expireAt: new Date(Date.now() - 60 * 60 * 1000),
      };
      model.findOne.mockResolvedValue(record);

      const result = await service.validateToken('hashed-token');

      expect(result).toBeNull();
    });
  });

  describe('deleteToken', () => {
    it('should delete the record by id', async () => {
      model.findByIdAndDelete.mockResolvedValue(undefined);

      await service.deleteToken('ev1');

      expect(model.findByIdAndDelete).toHaveBeenCalledWith('ev1');
    });
  });
});
