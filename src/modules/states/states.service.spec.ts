import { Test, TestingModule } from '@nestjs/testing';
import { getModelToken } from '@nestjs/mongoose';
import { StatesService } from './states.service';
import { State } from './schemas/state.schema';
import { CacheService } from 'src/infrastructure/cache/cache.service';
import { BadRequestException, NotFoundException } from '@nestjs/common';

describe('StatesService', () => {
  let service: StatesService;
  let model: any;
  let cacheService: any;

  function mockStateModel(this: any, dto: any) {
    this.data = dto;
    this.save = jest.fn().mockResolvedValue({ _id: 's1', ...dto });
  }

  mockStateModel.create = jest.fn();
  mockStateModel.findOne = jest.fn();
  mockStateModel.find = jest.fn();
  mockStateModel.findById = jest.fn();
  mockStateModel.findByIdAndUpdate = jest.fn();
  mockStateModel.findByIdAndDelete = jest.fn();

  beforeEach(async () => {
    cacheService = {
      get: jest.fn(),
      set: jest.fn().mockResolvedValue(undefined),
      delete: jest.fn().mockResolvedValue(undefined),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        StatesService,
        { provide: getModelToken(State.name), useValue: mockStateModel },
        { provide: CacheService, useValue: cacheService },
      ],
    }).compile();

    service = module.get<StatesService>(StatesService);
    model = module.get(getModelToken(State.name));
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  const createStateDto = {
    name: 'Test state',
    localGovernmentAreas: ['Area 1'],
  };

  const updatedStateDto = {
    name: 'Updated state',
    localGovernmentAreas: ['Area 2'],
  };

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('create', () => {
    it('should throw BadRequestException when the state name already exists', async () => {
      model.findOne.mockResolvedValue({ _id: 's1', name: 'Test state' });

      await expect(service.create(createStateDto)).rejects.toThrow(
        BadRequestException,
      );
    });

    it('should create a new state and clear cache', async () => {
      model.findOne.mockResolvedValue(null);
      model.create.mockResolvedValue({ _id: 's1', ...createStateDto });

      const result = await service.create(createStateDto);

      expect(model.create).toHaveBeenCalledWith({ ...createStateDto });
      expect(result).toEqual({ _id: 's1', ...createStateDto });
      expect(cacheService.delete).toHaveBeenCalledWith('states:all');
    });
  });

  describe('findAll', () => {
    it('should return cached states when available', async () => {
      const cached = [{ _id: 's1', name: 'Test state' }];
      cacheService.get.mockResolvedValue(cached);

      const result = await service.findAll();

      expect(result).toEqual(cached);
      expect(model.find).not.toHaveBeenCalled();
    });

    it('should query the database and cache results when no cache exists', async () => {
      cacheService.get.mockResolvedValue(null);
      model.find.mockReturnValue({
        sort: jest.fn().mockResolvedValue([{ _id: 's1', name: 'Test state' }]),
      });

      const result = await service.findAll();

      expect(result).toEqual([{ _id: 's1', name: 'Test state' }]);
      expect(cacheService.set).toHaveBeenCalledWith(
        'states:all',
        result,
        60 * 60 * 1000,
      );
    });
  });

  describe('findOne', () => {
    it('should throw NotFoundException when state is not found', async () => {
      model.findById.mockResolvedValue(null);

      await expect(service.findOne('s1')).rejects.toThrow(NotFoundException);
    });

    it('should return the state when found', async () => {
      const state = { _id: 's1', name: 'Test state' };
      model.findById.mockResolvedValue(state);

      const result = await service.findOne('s1');

      expect(result).toEqual(state);
    });
  });

  describe('update', () => {
    it('should throw NotFoundException when state is not found before update', async () => {
      model.findById.mockResolvedValue(null);

      await expect(
        service.update('s1', { name: 'Other state' }),
      ).rejects.toThrow(NotFoundException);
    });

    it('should throw BadRequestException when a duplicate name exists for another state', async () => {
      model.findById.mockResolvedValue({ _id: 's1', name: 'Test state' });
      model.findOne.mockResolvedValue({ _id: 's2', name: 'Other state' });

      await expect(
        service.update('s1', { name: 'Other state' }),
      ).rejects.toThrow(BadRequestException);
    });

    it('should update state when duplicate name belongs to the same state id', async () => {
      model.findById.mockResolvedValue({ _id: 's1', name: 'Test state' });
      model.findOne.mockResolvedValue({ _id: 's1', name: 'Test state' });
      model.findByIdAndUpdate.mockResolvedValue({
        _id: 's1',
        name: 'Test state',
        localGovernmentAreas: ['Area 1'],
      });

      const result = await service.update('s1', { name: 'Test state' });

      expect(result).toEqual({
        _id: 's1',
        name: 'Test state',
        localGovernmentAreas: ['Area 1'],
      });
      expect(cacheService.delete).toHaveBeenCalledWith('states:all');
    });

    it('should update the state when no name is provided and clear cache', async () => {
      model.findById.mockResolvedValue({ _id: 's1', name: 'Test state' });
      model.findByIdAndUpdate.mockResolvedValue({
        _id: 's1',
        name: 'Test state',
        localGovernmentAreas: ['Area 1'],
      });

      const result = await service.update('s1', {
        localGovernmentAreas: ['Area 1'],
      });

      expect(result).toEqual({
        _id: 's1',
        name: 'Test state',
        localGovernmentAreas: ['Area 1'],
      });
      expect(cacheService.delete).toHaveBeenCalledWith('states:all');
    });
  });

  describe('remove', () => {
    it('should throw NotFoundException when state is not found', async () => {
      model.findByIdAndDelete.mockResolvedValue(null);

      await expect(service.remove('s1')).rejects.toThrow(NotFoundException);
    });

    it('should delete and return the state when it exists', async () => {
      const state = { _id: 's1', name: 'Test state' };
      model.findByIdAndDelete.mockResolvedValue(state);

      const result = await service.remove('s1');

      expect(result).toEqual(state);
      expect(cacheService.delete).toHaveBeenCalledWith('states:all');
    });
  });
});
