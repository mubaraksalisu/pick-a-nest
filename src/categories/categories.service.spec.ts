import { Test, TestingModule } from '@nestjs/testing';
import { CategoriesService } from './categories.service';
import { getModelToken } from '@nestjs/mongoose';
import { Category } from './schemas/category.schema';
import { ConflictException } from '@nestjs/common';

describe('Categories', () => {
  let service: CategoriesService;
  let model: any;

  function mockCategoryModel(dto: any) {
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
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        CategoriesService,
        {
          provide: getModelToken(Category.name),
          useValue: mockCategoryModel,
        },
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
});
