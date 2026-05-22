import { JwtService } from '@nestjs/jwt';
import { AuthService } from './auth.service';
import { RefreshTokenService } from 'src/modules/refresh-token/refresh-token.service';
import { ConfigService } from '@nestjs/config';
import { UsersService } from 'src/modules/users/users.service';
import { Test, TestingModule } from '@nestjs/testing';
import * as bcrypt from 'bcrypt';
import { UnauthorizedException } from '@nestjs/common';

jest.mock('bcrypt');

describe('AuthService', () => {
  let service: AuthService;
  let jwtService: JwtService;
  let refreshTokenService: RefreshTokenService;
  let configService: ConfigService;
  let usersService: UsersService;

  const mockUser = {
    _id: 'userId',
    email: 'email',
    password: 'hashedPassword',
    role: 'user',
    status: 'active',
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
          },
        },
      ],
    }).compile();

    service = module.get<AuthService>(AuthService);
    jwtService = module.get<JwtService>(JwtService);
    refreshTokenService = module.get<RefreshTokenService>(RefreshTokenService);
    configService = module.get<ConfigService>(ConfigService);
    usersService = module.get<UsersService>(UsersService);
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
        email: 'email',
        password: 'password',
      });

      expect(result).toBeDefined();
      expect(result).toEqual({
        _id: 'userId',
        email: 'email',
        role: 'user',
        status: 'active',
      });
    });

    it('should return null if user is not found', async () => {
      (usersService.findByEmail as jest.Mock).mockResolvedValue(null);

      const result = await service.validateUser({
        email: 'email',
        password: 'password',
      });

      expect(result).toBeNull();
    });

    it('should return null if password does not match', async () => {
      (usersService.findByEmail as jest.Mock).mockResolvedValue(mockUser);
      (bcrypt.compare as jest.Mock).mockResolvedValue(false);

      const result = await service.validateUser({
        email: 'test@example.com',
        password: 'wrong_password',
      });

      expect(result).toBeNull();
    });
  });

  describe('login', () => {
    it('should return access and refresh tokens', async () => {
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

    it('should throw UnauthorizedException when account is suspended', async () => {
      await expect(
        service.login({ ...mockUser, status: 'suspended' } as any),
      ).rejects.toThrow('User account suspended');
    });
  });

  describe('register', () => {
    it('should create a new user and return tokens', async () => {
      const mockAccessToken = 'accessToken';
      const mockRefreshToken = 'refreshToken';
      const createdUser = { ...mockUser, status: 'active', role: 'user' };

      (usersService.create as jest.Mock).mockResolvedValue(createdUser);
      (jwtService.sign as jest.Mock)
        .mockReturnValueOnce(mockRefreshToken)
        .mockReturnValueOnce(mockAccessToken);
      (configService.get as jest.Mock).mockImplementation((key: string) => {
        if (key === 'REFRESH_EXPIRES_IN') return '30d';
        if (key === 'ACCESS_EXPIRES_IN') return '1h';
        return undefined;
      });

      const result = await service.register({
        firstName: 'First',
        lastName: 'Last',
        phone: '1234567890',
        email: 'email',
        password: 'password',
      });

      expect(usersService.create).toHaveBeenCalledWith({
        firstName: 'First',
        lastName: 'Last',
        phone: '1234567890',
        email: 'email',
        password: 'password',
      });
      expect(jwtService.sign).toHaveBeenCalledTimes(2);
      expect(result).toEqual({
        accessToken: mockAccessToken,
        refreshToken: mockRefreshToken,
        user: createdUser,
      });
    });
  });

  describe('refresh', () => {
    it('should return new access and refresh tokens', async () => {
      const mockAccessToken = 'newAccessToken';
      const mockRefreshToken = 'newRefreshToken';

      (jwtService.verify as jest.Mock).mockReturnValue({
        sub: 'userId',
        email: 'email',
      });

      (refreshTokenService.validateToken as jest.Mock).mockResolvedValue({
        _id: 'tokenId',
      });

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
        throw new UnauthorizedException('Invalid or expired refresh token');
      });

      await expect(service.refresh('invalidRefreshToken')).rejects.toThrow(
        UnauthorizedException,
      );
    });

    it('should throw UnauthorizedException when validateToken returns false', async () => {
      (jwtService.verify as jest.Mock).mockReturnValue({ sub: 'userId' });
      (refreshTokenService.validateToken as jest.Mock).mockResolvedValue(false);

      await expect(service.refresh('validRefreshToken')).rejects.toThrow(
        UnauthorizedException,
      );
    });
  });

  describe('logout', () => {
    it('should ignore invalid tokens and not throw', async () => {
      (jwtService.verify as jest.Mock).mockImplementation(() => {
        throw new UnauthorizedException('Invalid or expired refresh token');
      });

      await expect(service.logout('badToken')).resolves.toBeUndefined();
    });

    it('should revoke the token when it is valid', async () => {
      (jwtService.verify as jest.Mock).mockReturnValue({ sub: 'userId' });

      await service.logout('validToken');

      expect(refreshTokenService.revokeToken).toHaveBeenCalledWith('userId');
    });
  });
});
