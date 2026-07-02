import { Test, TestingModule } from '@nestjs/testing';
import { CategoriesService } from './categories.service';
import { getModelToken } from '@nestjs/mongoose';
import { Category } from './schemas/category.schema';
import { ConflictException, NotFoundException } from '@nestjs/common';
import { CacheService } from 'src/infrastructure/cache/cache.service';

describe('Categories', () => {
  let service: CategoriesService;
  let model: any;
  let cacheService: any;

  function mockCategoryModel(this: any, dto: any) {
    this.data = dto;
    this.save = jest.fn().mockResolvedValue({ _id: 'categoryId', ...dto });
  }
  mockCategoryModel.findOne = jest.fn();
  mockCategoryModel.find = jest.fn();
  mockCategoryModel.findById = jest.fn();
  mockCategoryModel.findByIdAndUpdate = jest.fn();
  mockCategoryModel.findByIdAndDelete = jest.fn();

  const mockCategoryDto = {
    name: 'category1',
    description: 'decribe1',
    icon: 'icon1',
  };

  beforeEach(async () => {
    cacheService = {
      get: jest.fn().mockResolvedValue(null),
      set: jest.fn().mockResolvedValue(undefined),
      delete: jest.fn().mockResolvedValue(undefined),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        CategoriesService,
        {
          provide: getModelToken(Category.name),
          useValue: mockCategoryModel,
        },
        { provide: CacheService, useValue: cacheService },
      ],
    }).compile();

    service = module.get<CategoriesService>(CategoriesService);
    model = module.get(getModelToken(Category.name));
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('Should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('create', () => {
    it('Should throw ConflictException if a category with the same name already exist', async () => {
      model.findOne.mockResolvedValue(mockCategoryDto);

      await expect(service.create(mockCategoryDto)).rejects.toThrow(
        ConflictException,
      );
    });

    it('Should Create new category', async () => {
      model.findOne.mockResolvedValue(null);

      const result = await service.create(mockCategoryDto);

      expect(result).toBeDefined();
      expect(result.name).toEqual(mockCategoryDto.name);
      expect(result.icon).toEqual(mockCategoryDto.icon);
      expect(result.description).toEqual(mockCategoryDto.description);
    });
  });

  describe('findAll', () => {
    it('Should return cached categories without querying the database', async () => {
      const cached = [mockCategoryDto];
      cacheService.get.mockResolvedValueOnce(cached);

      const result = await service.findAll();

      expect(result).toEqual(cached);
      expect(model.find).not.toHaveBeenCalled();
    });

    it('Should return all categories', async () => {
      model.find.mockReturnValue({
        sort: jest.fn().mockResolvedValue([mockCategoryDto]),
      });

      const result = await service.findAll();

      expect(result).toBeDefined();
      expect(model.find).toHaveBeenCalled();
      expect(result).toEqual([mockCategoryDto]);
    });
  });

  describe('findOne', () => {
    it('Should throw NotFoundException if no category with the provided id is found', async () => {
      model.findById.mockResolvedValue(null);

      await expect(service.findOne('id')).rejects.toThrow(NotFoundException);
    });

    it('Should return the category with the specified id', async () => {
      model.findById.mockResolvedValue(mockCategoryDto);

      const result = await service.findOne('id');

      expect(result).toBeDefined();
      expect(model.findById).toHaveBeenCalled();
      expect(result).toEqual(mockCategoryDto);
    });
  });

  describe('update', () => {
    const mockUpdateCategoryDto = {
      _id: 'c1',
      ...mockCategoryDto,
      name: 'updatedName',
    };

    it('Should throw NotFoundException if no category with the provided id is found', async () => {
      model.findByIdAndUpdate.mockResolvedValue(null);

      await expect(service.update('c1', mockUpdateCategoryDto)).rejects.toThrow(
        NotFoundException,
      );
    });

    it('Should update and return the updated category', async () => {
      model.findByIdAndUpdate.mockResolvedValue(mockUpdateCategoryDto);

      const result = await service.update('c1', mockUpdateCategoryDto);

      expect(result).toBeDefined();
      expect(model.findByIdAndUpdate).toHaveBeenCalled();
      expect(result).toEqual(mockUpdateCategoryDto);
    });
  });

  describe('remove', () => {
    it('Should throw NotFoundException if no category with the provided id is found', async () => {
      model.findByIdAndDelete.mockResolvedValue(null);

      await expect(service.remove('c1')).rejects.toThrow(NotFoundException);
    });

    it('Should delete and return the deleted category', async () => {
      const mockDeleteCategoryDto = { _id: 'c1', ...mockCategoryDto };

      model.findByIdAndDelete.mockResolvedValue(mockDeleteCategoryDto);

      const result = await service.remove('c1');

      expect(result).toBeDefined();
      expect(model.findByIdAndDelete).toHaveBeenCalled();
      expect(result).toEqual(mockDeleteCategoryDto);
    });
  });
});
