import { UsersService } from 'src/modules/users/users.service';
import { PropertyReviewsService } from './property-reviews.service';
import { Test, TestingModule } from '@nestjs/testing';
import { getModelToken } from '@nestjs/mongoose';
import { PropertyReview } from './schemas/property-review.schema';
import { PropertiesService } from 'src/modules/properties/properties.service';
import {
  BadRequestException,
  ConflictException,
  NotFoundException,
} from '@nestjs/common';

describe('PropertyReviewsService', () => {
  let service: PropertyReviewsService;
  let usersService: UsersService;
  let propertiesService: PropertiesService;
  let model: any;

  // This mock handles the "new model().save()" pattern
  function mockPropertyReviewModel(dto: any) {
    this.data = dto;
    this.save = jest.fn().mockResolvedValue({ _id: 'id', ...dto });
  }

  // Add static methods to the mock constructor
  mockPropertyReviewModel.findOne = jest.fn();
  mockPropertyReviewModel.find = jest.fn();
  mockPropertyReviewModel.countDocuments = jest.fn();
  mockPropertyReviewModel.findById = jest.fn();
  mockPropertyReviewModel.findByIdAndDelete = jest.fn();

  const mockReviewDto = {
    userId: 'u1',
    propertyId: 'a1',
    rating: 4,
    comment: 'c1',
  };

  const mockUser = { _id: 'u1' };

  const mockProperty = { _id: 'p1' };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        PropertyReviewsService,
        {
          provide: getModelToken(PropertyReview.name),
          useValue: mockPropertyReviewModel,
        },
        { provide: UsersService, useValue: { findOne: jest.fn() } },
        { provide: PropertiesService, useValue: { findOne: jest.fn() } },
      ],
    }).compile();

    service = module.get<PropertyReviewsService>(PropertyReviewsService);
    usersService = module.get<UsersService>(UsersService);
    propertiesService = module.get<PropertiesService>(PropertiesService);
    model = module.get(getModelToken(PropertyReview.name));
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('Should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('create', () => {
    it('Should throw ConflictException if user already reviewed property', async () => {
      (usersService.findOne as jest.Mock).mockResolvedValue(mockUser);
      (propertiesService.findOne as jest.Mock).mockResolvedValue(mockProperty);
      model.findOne.mockResolvedValue({ _id: 'r1' });

      await expect(service.create(mockReviewDto)).rejects.toThrow(
        ConflictException,
      );
    });

    it('Should create and save new review', async () => {
      (usersService.findOne as jest.Mock).mockResolvedValue(mockUser);
      (propertiesService.findOne as jest.Mock).mockResolvedValue(mockProperty);
      model.findOne.mockResolvedValue(null);

      const result = await service.create(mockReviewDto);

      expect(result).toBeDefined();
      expect(usersService.findOne).toHaveBeenCalled();
      expect(propertiesService.findOne).toHaveBeenCalled();
      expect(result.userId).toEqual(mockReviewDto.userId);
      expect(result.propertyId).toEqual(mockReviewDto.propertyId);
      expect(result.rating).toEqual(mockReviewDto.rating);
      expect(result.comment).toEqual(mockReviewDto.comment);
    });
  });

  describe('findAll', () => {
    it('Should return pagenated review', async () => {
      model.find.mockReturnValue({
        skip: jest.fn().mockReturnValue({
          limit: jest.fn().mockResolvedValue([mockReviewDto]),
        }),
      });

      model.countDocuments.mockResolvedValue(1);

      const result = await service.findAll({ page: 1, limit: 10 });

      expect(result.data).toEqual([mockReviewDto]);
      expect(result.total).toBe(1);
      expect(result.totalPage).toBe(1);
      expect(result.page).toBe(1);
      expect(result.limit).toBe(10);
    });
  });

  describe('findOne', () => {
    it('Should throw NotFoundException if no review with the provided id', async () => {
      model.findById.mockResolvedValue(null);

      await expect(service.findOne('r1')).rejects.toThrow(NotFoundException);
    });

    it('Should return review with the given id', async () => {
      model.findById.mockResolvedValue(mockReviewDto);

      const result = await service.findOne('r1');

      expect(result).toBeDefined();
      expect(result).toEqual(mockReviewDto);
    });
  });

  describe('update', () => {
    const updateDto = { rating: 3, comment: 'updated' };
    const reviewId = 'r1';

    it('Should throw NotFoundException if no review with the provided id', async () => {
      model.findById.mockResolvedValue(null);

      await expect(service.update(reviewId, updateDto)).rejects.toThrow(
        NotFoundException,
      );
    });

    it('Should update a save review', async () => {
      const mockExistingReview = {
        _id: reviewId,
        rating: 4,
        comment: 'old',
        save: jest.fn().mockResolvedValue({ _id: reviewId, ...updateDto }),
      };

      model.findById.mockResolvedValue(mockExistingReview);

      const result = await service.update(reviewId, updateDto);

      expect(result).toBeDefined();
      expect(model.findById).toHaveBeenCalledWith(reviewId);
      expect(result.rating).toBe(3);
      expect(result.comment).toBe('updated');
    });
  });

  describe('remove', () => {
    it('Should return NotFoundException if no review with the provided id', async () => {
      model.findByIdAndDelete.mockResolvedValue(null);

      await expect(service.remove('r1')).rejects.toThrow(NotFoundException);
    });

    it('Should delete and return the deleted review', async () => {
      model.findByIdAndDelete.mockResolvedValue(mockReviewDto);

      const result = await service.remove('r1');

      expect(result).toBeDefined();
      expect(result).toEqual(mockReviewDto);
    });
  });
});
