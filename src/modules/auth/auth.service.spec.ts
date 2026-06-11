import { JwtService } from '@nestjs/jwt';
import { AuthService } from './auth.service';
import { RefreshTokenService } from 'src/modules/auth/refresh-token/refresh-token.service';
import { ConfigService } from '@nestjs/config';
import { UsersService } from 'src/modules/users/users.service';
import { Test, TestingModule } from '@nestjs/testing';
import * as bcrypt from 'bcrypt';
import { UnauthorizedException } from '@nestjs/common';
import { EmailVerificationService } from './email-verification/email-verification.service';
import { QueuesService } from 'src/infrastructure/queues/queues.service';
import * as crypto from 'crypto';

jest.mock('bcrypt');
jest.mock('crypto');

describe('AuthService', () => {
  let service: AuthService;
  let jwtService: JwtService;
  let refreshTokenService: RefreshTokenService;
  let configService: ConfigService;
  let usersService: UsersService;
  let emailVerificationService: EmailVerificationService;
  let queueService: QueuesService;

  const mockUser = {
    _id: 'userId',
    email: 'test@example.com',
    password: 'hashedPassword',
    role: 'user',
    status: 'active',
    toObject: jest.fn().mockReturnValue({
      _id: 'userId',
      email: 'test@example.com',
      role: 'user',
      status: 'active',
    }),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AuthService,
        {
          provide: JwtService,
          useValue: {
            sign: jest.fn(),
            verify: jest.fn(),
          },
        },
        {
          provide: RefreshTokenService,
          useValue: {
            createToken: jest.fn(),
            validateToken: jest.fn(),
            revokeToken: jest.fn(),
          },
        },
        {
          provide: ConfigService,
          useValue: {
            get: jest.fn(),
          },
        },
        {
          provide: UsersService,
          useValue: {
            create: jest.fn(),
            findByEmail: jest.fn(),
            findOne: jest.fn(),
            activateUser: jest.fn(),
          },
        },
        {
          provide: EmailVerificationService,
          useValue: {
            create: jest.fn(),
            validateToken: jest.fn(),
            deleteToken: jest.fn(),
          },
        },
        {
          provide: QueuesService,
          useValue: {
            queueEmail: jest.fn(),
          },
        },
      ],
    }).compile();

    service = module.get<AuthService>(AuthService);
    jwtService = module.get<JwtService>(JwtService);
    refreshTokenService = module.get<RefreshTokenService>(RefreshTokenService);
    configService = module.get<ConfigService>(ConfigService);
    usersService = module.get<UsersService>(UsersService);
    emailVerificationService = module.get<EmailVerificationService>(
      EmailVerificationService,
    );
    queueService = module.get<QueuesService>(QueuesService);

    // Setup crypto mocks
    const mockRandomBytes = {
      toString: jest.fn().mockReturnValue('mockedtoken123'),
    };
    (crypto.randomBytes as jest.Mock).mockReturnValue(mockRandomBytes);

    const mockHashUpdate = {
      digest: jest.fn().mockReturnValue('hashedtoken123'),
    };
    const mockHashCreate = {
      update: jest.fn().mockReturnValue(mockHashUpdate),
    };
    (crypto.createHash as jest.Mock).mockReturnValue(mockHashCreate);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('validateUser', () => {
    it('should return user data without password if credentials are valid', async () => {
      (usersService.findByEmail as jest.Mock).mockResolvedValue(mockUser);
      (bcrypt.compare as jest.Mock).mockResolvedValue(true);

      const result = await service.validateUser({
        email: 'test@example.com',
        password: 'password',
      });

      expect(result).toBeDefined();
      expect(result).toEqual({
        _id: 'userId',
        email: 'test@example.com',
        role: 'user',
        status: 'active',
      });
      expect(bcrypt.compare).toHaveBeenCalledWith('password', 'hashedPassword');
      expect(usersService.findByEmail).toHaveBeenCalledWith('test@example.com');
    });

    it('should return null if user is not found', async () => {
      (usersService.findByEmail as jest.Mock).mockResolvedValue(null);

      const result = await service.validateUser({
        email: 'test@example.com',
        password: 'password',
      });

      expect(result).toBeNull();
      expect(bcrypt.compare).not.toHaveBeenCalled();
    });

    it('should return null if password does not match', async () => {
      (usersService.findByEmail as jest.Mock).mockResolvedValue(mockUser);
      (bcrypt.compare as jest.Mock).mockResolvedValue(false);

      const result = await service.validateUser({
        email: 'test@example.com',
        password: 'wrong_password',
      });

      expect(result).toBeNull();
      expect(bcrypt.compare).toHaveBeenCalledWith(
        'wrong_password',
        'hashedPassword',
      );
    });

    it('should handle user without toObject method', async () => {
      const plainUser = {
        _id: 'userId',
        email: 'test@example.com',
        password: 'hashedPassword',
        role: 'user',
        status: 'active',
      };
      (usersService.findByEmail as jest.Mock).mockResolvedValue(plainUser);
      (bcrypt.compare as jest.Mock).mockResolvedValue(true);

      const result = await service.validateUser({
        email: 'test@example.com',
        password: 'password',
      });

      expect(result).toEqual({
        _id: 'userId',
        email: 'test@example.com',
        role: 'user',
        status: 'active',
      });
      expect(result).not.toHaveProperty('password');
    });
  });

  describe('login', () => {
    it('should return access and refresh tokens for active user', async () => {
      const mockAccessToken = 'accessToken';
      const mockRefreshToken = 'refreshToken';

      (jwtService.sign as jest.Mock)
        .mockReturnValueOnce(mockRefreshToken)
        .mockReturnValueOnce(mockAccessToken);
      (configService.get as jest.Mock).mockImplementation((key: string) => {
        if (key === 'REFRESH_EXPIRES_IN') return '30d';
        if (key === 'ACCESS_EXPIRES_IN') return '1h';
        return undefined;
      });

      const result = await service.login(mockUser);

      expect(jwtService.sign).toHaveBeenCalledTimes(2);
      expect(configService.get).toHaveBeenCalledWith('REFRESH_EXPIRES_IN');
      expect(configService.get).toHaveBeenCalledWith('ACCESS_EXPIRES_IN');
      expect(refreshTokenService.createToken).toHaveBeenCalledWith(
        mockUser._id,
        mockRefreshToken,
        expect.any(Date),
      );
      expect(result).toEqual({
        accessToken: mockAccessToken,
        refreshToken: mockRefreshToken,
      });
    });

    it('should throw UnauthorizedException when account is inactive', async () => {
      const inactiveUser = { ...mockUser, status: 'inactive' };

      await expect(service.login(inactiveUser)).rejects.toThrow(
        UnauthorizedException,
      );
      await expect(service.login(inactiveUser)).rejects.toThrow(
        'User account inactive',
      );
    });

    it('should throw UnauthorizedException when account is suspended', async () => {
      const suspendedUser = { ...mockUser, status: 'suspended' };

      await expect(service.login(suspendedUser)).rejects.toThrow(
        UnauthorizedException,
      );
    });

    it('should include correct payload in JWT tokens', async () => {
      (jwtService.sign as jest.Mock)
        .mockReturnValueOnce('refreshToken')
        .mockReturnValueOnce('accessToken');
      (configService.get as jest.Mock).mockReturnValue('1h');

      await service.login(mockUser);

      const expectedPayload = {
        sub: 'userId',
        role: 'user',
        email: 'test@example.com',
      };

      expect(jwtService.sign).toHaveBeenCalledWith(
        expectedPayload,
        expect.objectContaining({ expiresIn: expect.any(String) }),
      );
    });
  });

  describe('register', () => {
    it('should create a new user and queue email verification', async () => {
      const createUserDto = {
        firstName: 'John',
        lastName: 'Doe',
        phone: '1234567890',
        email: 'john@example.com',
        password: 'password123',
      };

      const createdUser = {
        ...mockUser,
        ...createUserDto,
        _id: 'newUserId',
        status: 'inactive',
      };

      (usersService.create as jest.Mock).mockResolvedValue(createdUser);
      (emailVerificationService.create as jest.Mock).mockResolvedValue(null);
      (queueService.queueEmail as jest.Mock).mockResolvedValue(null);

      const result = await service.register(createUserDto);

      expect(usersService.create).toHaveBeenCalledWith(createUserDto);
      expect(emailVerificationService.create).toHaveBeenCalledWith(
        'newUserId',
        'hashedtoken123',
        expect.any(Date),
      );
      expect(queueService.queueEmail).toHaveBeenCalledWith(expect.any(String), {
        email: 'john@example.com',
        token: 'mockedtoken123',
      });
      expect(result).toEqual(createdUser);
      expect(crypto.randomBytes).toHaveBeenCalledWith(32);
      expect(crypto.createHash).toHaveBeenCalledWith('sha256');
    });

    it('should handle user creation error', async () => {
      const createUserDto = {
        firstName: 'John',
        lastName: 'Doe',
        phone: '1234567890',
        email: 'john@example.com',
        password: 'password123',
      };

      (usersService.create as jest.Mock).mockRejectedValue(
        new Error('User already exists'),
      );

      await expect(service.register(createUserDto)).rejects.toThrow(
        'User already exists',
      );
    });

    it('should handle email queue error gracefully', async () => {
      const createUserDto = {
        firstName: 'John',
        lastName: 'Doe',
        phone: '1234567890',
        email: 'john@example.com',
        password: 'password123',
      };

      const createdUser = { ...mockUser, _id: 'newUserId' };

      (usersService.create as jest.Mock).mockResolvedValue(createdUser);
      (emailVerificationService.create as jest.Mock).mockResolvedValue(null);
      (queueService.queueEmail as jest.Mock).mockRejectedValue(
        new Error('Queue error'),
      );

      await expect(service.register(createUserDto)).rejects.toThrow(
        'Queue error',
      );
    });
  });

  describe('refresh', () => {
    it('should return new access and refresh tokens', async () => {
      const mockAccessToken = 'newAccessToken';
      const mockRefreshToken = 'newRefreshToken';
      const mockTokenId = {
        _id: 'tokenId',
      };

      (jwtService.verify as jest.Mock).mockReturnValue({
        sub: 'userId',
        email: 'test@example.com',
        role: 'user',
      });

      (refreshTokenService.validateToken as jest.Mock).mockResolvedValue(
        mockTokenId,
      );

      (usersService.findOne as jest.Mock).mockResolvedValue(mockUser);

      (jwtService.sign as jest.Mock)
        .mockReturnValueOnce(mockRefreshToken)
        .mockReturnValueOnce(mockAccessToken);

      (configService.get as jest.Mock).mockReturnValue('1h');

      const result = await service.refresh('validRefreshToken');

      expect(jwtService.verify).toHaveBeenCalledWith('validRefreshToken');
      expect(refreshTokenService.validateToken).toHaveBeenCalledWith(
        'userId',
        'validRefreshToken',
      );
      expect(refreshTokenService.revokeToken).toHaveBeenCalledWith('tokenId');
      expect(usersService.findOne).toHaveBeenCalledWith('userId');
      expect(jwtService.sign).toHaveBeenCalledTimes(2);
      expect(result).toEqual({
        accessToken: mockAccessToken,
        refreshToken: mockRefreshToken,
      });
    });

    it('should throw UnauthorizedException for invalid refresh token', async () => {
      (jwtService.verify as jest.Mock).mockImplementation(() => {
        throw new Error('Invalid token');
      });

      await expect(service.refresh('invalidRefreshToken')).rejects.toThrow(
        UnauthorizedException,
      );
      await expect(service.refresh('invalidRefreshToken')).rejects.toThrow(
        'Invalid or expired refresh token',
      );
    });

    it('should throw UnauthorizedException when validateToken returns null', async () => {
      (jwtService.verify as jest.Mock).mockReturnValue({ sub: 'userId' });
      (refreshTokenService.validateToken as jest.Mock).mockResolvedValue(null);

      await expect(service.refresh('validRefreshToken')).rejects.toThrow(
        UnauthorizedException,
      );
      await expect(service.refresh('validRefreshToken')).rejects.toThrow(
        'Invalid or expired refresh token',
      );
    });

    it('should throw UnauthorizedException when validateToken returns false', async () => {
      (jwtService.verify as jest.Mock).mockReturnValue({ sub: 'userId' });
      (refreshTokenService.validateToken as jest.Mock).mockResolvedValue(false);

      await expect(service.refresh('validRefreshToken')).rejects.toThrow(
        UnauthorizedException,
      );
    });

    it('should handle user not found error', async () => {
      (jwtService.verify as jest.Mock).mockReturnValue({ sub: 'userId' });
      (refreshTokenService.validateToken as jest.Mock).mockResolvedValue({
        _id: 'tokenId',
      });
      (usersService.findOne as jest.Mock).mockResolvedValue(null);

      await expect(service.refresh('validRefreshToken')).rejects.toThrow();
    });
  });

  describe('verifyEmail', () => {
    it('should verify email and activate user', async () => {
      const rawToken = 'rawtoken123';

      const mockEmailVerification = {
        _id: 'verificationId',
        userId: 'userId',
        token: 'hashedtoken123',
        expiresAt: new Date(Date.now() + 1000000),
      };

      (emailVerificationService.validateToken as jest.Mock).mockResolvedValue(
        mockEmailVerification,
      );
      (usersService.activateUser as jest.Mock).mockResolvedValue(null);
      (emailVerificationService.deleteToken as jest.Mock).mockResolvedValue(
        null,
      );

      const result = await service.verifyEmail(rawToken);

      expect(emailVerificationService.validateToken).toHaveBeenCalledWith(
        'hashedtoken123',
      );
      expect(usersService.activateUser).toHaveBeenCalledWith('userId');
      expect(emailVerificationService.deleteToken).toHaveBeenCalledWith(
        'verificationId',
      );
      expect(result).toEqual({
        message: 'Email verified successfully. You can now log in.',
      });
    });

    it('should throw UnauthorizedException for invalid token', async () => {
      const rawToken = 'invalidtoken';

      (emailVerificationService.validateToken as jest.Mock).mockResolvedValue(
        null,
      );

      await expect(service.verifyEmail(rawToken)).rejects.toThrow(
        UnauthorizedException,
      );
      await expect(service.verifyEmail(rawToken)).rejects.toThrow(
        'Invalid or expired email verification token',
      );
    });

    it('should throw UnauthorizedException for expired token', async () => {
      const rawToken = 'expiredtoken';

      (emailVerificationService.validateToken as jest.Mock).mockResolvedValue(
        false,
      );

      await expect(service.verifyEmail(rawToken)).rejects.toThrow(
        UnauthorizedException,
      );
    });

    it('should handle user activation error', async () => {
      const rawToken = 'token123';

      const mockEmailVerification = {
        _id: 'verificationId',
        userId: 'userId',
      };

      (emailVerificationService.validateToken as jest.Mock).mockResolvedValue(
        mockEmailVerification,
      );
      (usersService.activateUser as jest.Mock).mockRejectedValue(
        new Error('User not found'),
      );

      await expect(service.verifyEmail(rawToken)).rejects.toThrow(
        'User not found',
      );
    });

    it('should handle token deletion error', async () => {
      const rawToken = 'token123';

      const mockEmailVerification = {
        _id: 'verificationId',
        userId: 'userId',
      };

      (emailVerificationService.validateToken as jest.Mock).mockResolvedValue(
        mockEmailVerification,
      );
      (usersService.activateUser as jest.Mock).mockResolvedValue(null);
      (emailVerificationService.deleteToken as jest.Mock).mockRejectedValue(
        new Error('Database error'),
      );

      await expect(service.verifyEmail(rawToken)).rejects.toThrow(
        'Database error',
      );
    });
  });

  describe('logout', () => {
    it('should revoke the token when it is valid', async () => {
      (jwtService.verify as jest.Mock).mockReturnValue({ sub: 'userId' });

      await service.logout('validToken');

      expect(jwtService.verify).toHaveBeenCalledWith('validToken');
      expect(refreshTokenService.revokeToken).toHaveBeenCalledWith('userId');
    });

    it('should ignore invalid tokens and not throw', async () => {
      (jwtService.verify as jest.Mock).mockImplementation(() => {
        throw new Error('Invalid token');
      });

      await expect(service.logout('badToken')).resolves.toBeUndefined();
      expect(refreshTokenService.revokeToken).not.toHaveBeenCalled();
    });

    it('should ignore malformed tokens', async () => {
      (jwtService.verify as jest.Mock).mockImplementation(() => {
        throw new UnauthorizedException('Malformed token');
      });

      await expect(service.logout('malformedToken')).resolves.toBeUndefined();
    });

    it('should ignore revoke errors and not throw', async () => {
      (jwtService.verify as jest.Mock).mockReturnValue({ sub: 'userId' });
      (refreshTokenService.revokeToken as jest.Mock).mockRejectedValue(
        new Error('Database error'),
      );

      // The logout method catches all errors, so it should resolve
      await expect(service.logout('validToken')).resolves.not.toThrow();
    });

    it('should ignore expiry errors', async () => {
      (jwtService.verify as jest.Mock).mockImplementation(() => {
        throw new Error('Token expired');
      });

      await expect(service.logout('expiredToken')).resolves.toBeUndefined();
    });
  });
});
