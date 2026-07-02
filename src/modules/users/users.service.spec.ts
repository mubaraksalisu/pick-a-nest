import { Test, TestingModule } from '@nestjs/testing';
import { getModelToken } from '@nestjs/mongoose';
import { UsersService } from './users.service';
import { User } from './schemas/user.schema';
import * as bcrypt from 'bcrypt';
import {
  BadRequestException,
  ConflictException,
  NotFoundException,
} from '@nestjs/common';

jest.mock('bcrypt');

describe('UsersService', () => {
  let service: UsersService;
  let model: any;

  function mockUserModel(this: any, dto: any) {
    this.data = dto;
    this.toObject = jest.fn().mockReturnValue({ _id: 'u1', ...dto });
    this.save = jest.fn().mockImplementation(() => {
      if (mockUserModel.nextSaveError) {
        const error = mockUserModel.nextSaveError;
        mockUserModel.nextSaveError = null;
        return Promise.reject(error);
      }
      return Promise.resolve({ _id: 'u1', ...dto, toObject: this.toObject });
    });
  }
  mockUserModel.nextSaveError = null as Error | null;

  const createSkipLimitSelectQuery = (result: any) => ({
    skip: jest.fn().mockReturnThis(),
    limit: jest.fn().mockReturnThis(),
    select: jest.fn().mockResolvedValue(result),
  });

  const createSelectChain = (result: any) => ({
    select: jest.fn().mockResolvedValue(result),
  });

  mockUserModel.findOne = jest.fn();
  mockUserModel.find = jest.fn();
  mockUserModel.countDocuments = jest.fn();
  mockUserModel.findById = jest.fn();
  mockUserModel.findByIdAndUpdate = jest.fn();
  mockUserModel.findByIdAndDelete = jest.fn();

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        UsersService,
        { provide: getModelToken(User.name), useValue: mockUserModel },
      ],
    }).compile();

    service = module.get<UsersService>(UsersService);
    model = module.get(getModelToken(User.name));
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  const createUserDto = {
    firstName: 'First',
    lastName: 'Last',
    phone: '1234567890',
    email: 'email@example.com',
    password: 'password',
  };

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('create', () => {
    it('should throw ConflictException when email already exists', async () => {
      model.findOne.mockResolvedValue({ _id: 'u1' });

      await expect(service.create(createUserDto)).rejects.toThrow(
        ConflictException,
      );
    });

    it('should hash password and return user without password', async () => {
      model.findOne.mockResolvedValue(null);
      (bcrypt.genSalt as jest.Mock).mockResolvedValue('salt');
      (bcrypt.hash as jest.Mock).mockResolvedValue('hashedPassword');

      const result = await service.create(createUserDto as any);

      expect(bcrypt.genSalt).toHaveBeenCalledWith(10);
      expect(bcrypt.hash).toHaveBeenCalledWith('password', 'salt');
      expect(result).toEqual({
        _id: 'u1',
        firstName: 'First',
        lastName: 'Last',
        phone: '1234567890',
        email: 'email@example.com',
      });
      expect(result).not.toHaveProperty('password');
    });

    it('should convert a concurrent duplicate-key save error into ConflictException', async () => {
      model.findOne.mockResolvedValue(null);
      (bcrypt.genSalt as jest.Mock).mockResolvedValue('salt');
      (bcrypt.hash as jest.Mock).mockResolvedValue('hashedPassword');
      mockUserModel.nextSaveError = Object.assign(
        new Error('E11000 duplicate key error'),
        { code: 11000 },
      );

      await expect(service.create(createUserDto as any)).rejects.toThrow(
        ConflictException,
      );
    });

    it('should propagate non-duplicate-key save errors', async () => {
      model.findOne.mockResolvedValue(null);
      (bcrypt.genSalt as jest.Mock).mockResolvedValue('salt');
      (bcrypt.hash as jest.Mock).mockResolvedValue('hashedPassword');
      mockUserModel.nextSaveError = new Error('Database unavailable');

      await expect(service.create(createUserDto as any)).rejects.toThrow(
        'Database unavailable',
      );
    });
  });

  describe('findAll', () => {
    it('should return paginated users', async () => {
      const users = [{ _id: 'u1', email: 'email@example.com' }];
      model.find.mockReturnValue(createSkipLimitSelectQuery(users));
      model.countDocuments.mockResolvedValue(1);

      const result = await service.findAll({ page: 1, limit: 10 });

      expect(result).toEqual({
        data: users,
        total: 1,
        page: 1,
        limit: 10,
        totalPage: 1,
      });
    });
  });

  describe('findOne', () => {
    it('should throw NotFoundException if user is not found', async () => {
      model.findById.mockReturnValue({
        select: jest.fn().mockResolvedValue(null),
      });

      await expect(service.findOne('u1')).rejects.toThrow(NotFoundException);
    });

    it('should return user without password when found', async () => {
      const foundUser = { _id: 'u1', email: 'email@example.com' };
      model.findById.mockReturnValue({
        select: jest.fn().mockResolvedValue(foundUser),
      });

      const result = await service.findOne('u1');

      expect(result).toEqual(foundUser);
    });
  });

  describe('findByEmail', () => {
    it('should return a user when found by email', async () => {
      const user = { _id: 'u1', email: 'email@example.com' };
      model.findOne.mockResolvedValue(user);

      const result = await service.findByEmail('email@example.com');

      expect(result).toEqual(user);
    });

    it('should return null when no user is found', async () => {
      model.findOne.mockResolvedValue(null);

      const result = await service.findByEmail('missing@example.com');

      expect(result).toBeNull();
    });
  });

  describe('applyForAgentRole', () => {
    it('should throw NotFoundException when user is not found', async () => {
      model.findById.mockResolvedValue(null);

      await expect(service.applyForAgentRole('u1')).rejects.toThrow(
        NotFoundException,
      );
    });

    it('should throw BadRequestException when user is not a regular user', async () => {
      model.findById.mockResolvedValue({ _id: 'u1', role: 'agent' });

      await expect(service.applyForAgentRole('u1')).rejects.toThrow(
        BadRequestException,
      );
    });

    it('should mark the user as pending for agent review', async () => {
      const user = {
        _id: 'u1',
        role: 'user',
        agentReviewStatus: 'none',
        save: jest.fn().mockResolvedValue(undefined),
      };
      model.findById.mockResolvedValueOnce(user);
      model.findById.mockReturnValueOnce(
        createSelectChain({
          _id: 'u1',
          role: 'user',
          agentReviewStatus: 'pending',
        }),
      );

      const result = await service.applyForAgentRole('u1');

      expect(user.save).toHaveBeenCalled();
      expect(result.agentReviewStatus).toBe('pending');
      expect(result.role).toBe('user');
    });
  });

  describe('findPendingAgentApplications', () => {
    it('should return pending applications', async () => {
      const users = [{ _id: 'u1' }];
      model.find.mockReturnValue(createSkipLimitSelectQuery(users));
      model.countDocuments.mockResolvedValue(1);

      const result = await service.findPendingAgentApplications({
        page: 1,
        limit: 10,
      });

      expect(result).toEqual({
        data: users,
        total: 1,
        page: 1,
        limit: 10,
        totalPage: 1,
      });
    });
  });

  describe('approveAgent', () => {
    it('should throw NotFoundException when user is not found', async () => {
      model.findById.mockResolvedValue(null);

      await expect(service.approveAgent('u1')).rejects.toThrow(
        NotFoundException,
      );
    });

    it('should approve the agent and return updated user without password', async () => {
      const user = {
        _id: 'u1',
        role: 'user',
        agentReviewStatus: 'pending',
        save: jest.fn().mockResolvedValue(undefined),
      };
      model.findById.mockResolvedValueOnce(user);
      model.findById.mockReturnValueOnce(
        createSelectChain({
          _id: 'u1',
          role: 'agent',
          agentReviewStatus: 'approved',
        }),
      );

      const result = await service.approveAgent('u1');

      expect(user.save).toHaveBeenCalled();
      expect(result.role).toBe('agent');
      expect(result.agentReviewStatus).toBe('approved');
    });
  });

  describe('rejectAgent', () => {
    it('should throw NotFoundException when user is not found', async () => {
      model.findById.mockResolvedValue(null);

      await expect(service.rejectAgent('u1')).rejects.toThrow(
        NotFoundException,
      );
    });

    it('should reject the agent application and return updated user', async () => {
      const user = {
        _id: 'u1',
        agentReviewStatus: 'pending',
        save: jest.fn().mockResolvedValue(undefined),
      };
      model.findById.mockResolvedValueOnce(user);
      model.findById.mockReturnValueOnce(
        createSelectChain({ _id: 'u1', agentReviewStatus: 'rejected' }),
      );

      const result = await service.rejectAgent('u1');

      expect(user.save).toHaveBeenCalled();
      expect(result.agentReviewStatus).toBe('rejected');
    });
  });

  describe('activateUser', () => {
    it('should throw NotFoundException when user is not found', async () => {
      model.findById.mockResolvedValue(null);

      await expect(service.activateUser('u1')).rejects.toThrow(
        NotFoundException,
      );
    });

    it('should activate the user and mark the email as verified', async () => {
      const user: any = {
        _id: 'u1',
        status: 'inactive',
        emailVerified: false,
        save: jest.fn().mockResolvedValue(undefined),
      };
      model.findById.mockResolvedValue(user);

      const result = await service.activateUser('u1');

      expect(user.status).toBe('active');
      expect(user.emailVerified).toBe(true);
      expect(user.emailVerifiedAt).toBeInstanceOf(Date);
      expect(user.save).toHaveBeenCalled();
      expect(result).toBe(true);
    });
  });

  describe('update', () => {
    it('should throw NotFoundException when user is not found', async () => {
      model.findByIdAndUpdate.mockReturnValue(createSelectChain(null));

      await expect(service.update('u1', { firstName: 'New' })).rejects.toThrow(
        NotFoundException,
      );
    });

    it('should update the user and return the updated record', async () => {
      const updatedUser = {
        _id: 'u1',
        firstName: 'New',
        email: 'email@example.com',
      };
      model.findByIdAndUpdate.mockReturnValue({
        select: jest.fn().mockResolvedValue(updatedUser),
      });

      const result = await service.update('u1', { firstName: 'New' });

      expect(result).toEqual(updatedUser);
    });
  });

  describe('remove', () => {
    it('should throw NotFoundException when user is not found', async () => {
      model.findByIdAndDelete.mockReturnValue({
        select: jest.fn().mockResolvedValue(null),
      });

      await expect(service.remove('u1')).rejects.toThrow(NotFoundException);
    });

    it('should remove the user and return the deleted record', async () => {
      const deletedUser = { _id: 'u1', email: 'email@example.com' };
      model.findByIdAndDelete.mockReturnValue({
        select: jest.fn().mockResolvedValue(deletedUser),
      });

      const result = await service.remove('u1');

      expect(result).toEqual(deletedUser);
    });
  });
});
