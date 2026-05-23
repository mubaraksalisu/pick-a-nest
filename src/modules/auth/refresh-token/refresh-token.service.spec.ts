import { Test, TestingModule } from '@nestjs/testing';
import { getModelToken } from '@nestjs/mongoose';
import { RefreshTokenService } from './refresh-token.service';
import { RefreshToken } from './refresh-token.schema';
import { NotFoundException } from '@nestjs/common';
import * as bcrypt from 'bcrypt';

jest.mock('bcrypt');

describe('RefreshTokenService', () => {
  let service: RefreshTokenService;
  let model: any;

  function mockRefreshTokenModel(this: any, dto: any) {
    this.data = dto;
    this.save = jest.fn().mockResolvedValue({ _id: 't1', ...dto });
  }

  mockRefreshTokenModel.find = jest.fn();
  mockRefreshTokenModel.findByIdAndUpdate = jest.fn();

  beforeEach(async () => {
    model = mockRefreshTokenModel;
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        RefreshTokenService,
        { provide: getModelToken(RefreshToken.name), useValue: model },
      ],
    }).compile();

    service = module.get<RefreshTokenService>(RefreshTokenService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('createToken', () => {
    it('should hash and save a refresh token', async () => {
      (bcrypt.genSalt as jest.Mock).mockResolvedValue('salt');
      (bcrypt.hash as jest.Mock).mockResolvedValue('hashed-token');

      const result = await service.createToken(
        'u1',
        'token',
        new Date(Date.now() + 10000),
      );

      expect(bcrypt.genSalt).toHaveBeenCalledWith(10);
      expect(bcrypt.hash).toHaveBeenCalledWith('token', 'salt');
      expect(result).toEqual({
        _id: 't1',
        userId: 'u1',
        hashedToken: 'hashed-token',
        expireAt: expect.any(Date),
      });
    });
  });

  describe('validateToken', () => {
    it('should return the token when a valid token exists', async () => {
      const refreshToken = {
        _id: 't1',
        hashedToken: 'hashed-token',
        revoked: false,
        expireAt: new Date(Date.now() + 10000),
      };

      model.find.mockResolvedValue([refreshToken]);
      (bcrypt.compare as jest.Mock).mockResolvedValue(true);

      const result = await service.validateToken('u1', 'token');

      expect(result).toBe(refreshToken);
      expect(model.find).toHaveBeenCalledWith({ userId: 'u1' });
    });

    it('should return false when no matching token is found', async () => {
      const refreshToken = {
        _id: 't1',
        hashedToken: 'hashed-token',
        revoked: false,
        expireAt: new Date(Date.now() + 10000),
      };

      model.find.mockResolvedValue([refreshToken]);
      (bcrypt.compare as jest.Mock).mockResolvedValue(false);

      const result = await service.validateToken('u1', 'token');

      expect(result).toBe(false);
    });
  });

  describe('revokeToken', () => {
    it('should revoke the token when it exists', async () => {
      const token = { _id: 't1', revoked: false };
      model.findByIdAndUpdate.mockResolvedValue(token);

      const result = await service.revokeToken('t1');

      expect(result).toEqual(token);
      expect(model.findByIdAndUpdate).toHaveBeenCalledWith('t1', {
        revoked: true,
      });
    });

    it('should throw NotFoundException when token does not exist', async () => {
      model.findByIdAndUpdate.mockResolvedValue(null);

      await expect(service.revokeToken('t2')).rejects.toThrow(
        NotFoundException,
      );
    });
  });
});
