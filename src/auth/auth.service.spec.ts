import { JwtService } from '@nestjs/jwt';
import { AuthService } from './auth.service';
import { RefreshTokenService } from 'src/refresh-token/refresh-token.service';
import { ConfigService } from '@nestjs/config';
import { UsersService } from 'src/users/users.service';
import { Test, TestingModule } from '@nestjs/testing';
import * as bcrypt from 'bcrypt';

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
      });
    });

    it("should return null if user is not found", async () => {
      (usersService.findByEmail as jest.Mock).mockResolvedValue(null)

      const result = await service.validateUser({
        email: 'email',
        password: 'password',
      });

      expect(result).toBeNull()
    });

    
    it('should return null if password does not match', async () => {
      (usersService.findByEmail as jest.Mock).mockResolvedValue(mockUser);
      (bcrypt.compare as jest.Mock).mockResolvedValue(false); 

      const result = await service.validateUser({ 
        email: 'test@example.com', 
        password: 'wrong_password' 
      });

      expect(result).toBeNull();
    });
  });
});
