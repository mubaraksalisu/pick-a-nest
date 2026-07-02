import { Test, TestingModule } from '@nestjs/testing';
import { getModelToken } from '@nestjs/mongoose';
import { CategoriesService } from '../categories/categories.service';
import { UsersService } from '../users/users.service';
import { CacheService } from 'src/infrastructure/cache/cache.service';
import { AwsS3Service } from 'src/infrastructure/aws-s3/aws-s3.service';
jest.mock('src/infrastructure/aws-s3/aws-s3.service', () => ({
  AwsS3Service: jest.fn().mockImplementation(() => ({
    getPublicUrl: jest.fn().mockReturnValue('url'),
  })),
}));
import { PropertiesService } from './properties.service';
import { Property } from './schemas/property.schema';
import {
  BadRequestException,
  ForbiddenException,
  NotFoundException,
} from '@nestjs/common';

interface PaginatedProperties {
  data: any[];
  total: number;
  page: number;
  limit: number;
  totalPage: number;
}

describe('PropertiesService', () => {
  let service: PropertiesService;
  let propertyModel: any;
  let usersService: any;
  let categoriesService: any;
  let cacheService: any;

  const mockProperty = {
    _id: 'p1',
    title: 'Test property',
    featured: false,
    reviewStatus: 'approved',
    ownerId: 'u1',
    categoryId: 'c1',
    createdAt: new Date(),
    media: ['media1'],
  };

  const createPopulateQuery = (result: any) => ({
    populate: jest.fn().mockReturnThis(),
    then: (onfulfilled: any) =>
      Promise.resolve(onfulfilled ? onfulfilled(result) : result),
  });

  const createFindQuery = (result: any) => ({
    skip: jest.fn().mockReturnThis(),
    limit: jest.fn().mockReturnThis(),
    populate: jest.fn().mockReturnThis(),
    sort: jest.fn().mockReturnThis(),
    lean: jest.fn().mockResolvedValue(result),
  });

  beforeEach(async () => {
    propertyModel = jest.fn(function (this: any, dto: any) {
      this.data = dto;
      this.save = jest.fn().mockResolvedValue({ _id: 'p1', ...dto });
    });
    propertyModel.find = jest.fn();
    propertyModel.findById = jest.fn();
    propertyModel.findByIdAndDelete = jest.fn();
    propertyModel.countDocuments = jest.fn();

    usersService = {
      findOne: jest.fn().mockResolvedValue({ _id: 'u1' }),
    };

    categoriesService = {
      findOne: jest.fn().mockResolvedValue({ _id: 'c1' }),
    };

    cacheService = {
      get: jest.fn(),
      set: jest.fn().mockResolvedValue(undefined),
      delete: jest.fn().mockResolvedValue(undefined),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        PropertiesService,
        {
          provide: getModelToken(Property.name),
          useValue: propertyModel,
        },
        { provide: UsersService, useValue: usersService },
        { provide: CategoriesService, useValue: categoriesService },
        { provide: CacheService, useValue: cacheService },
        {
          provide: AwsS3Service,
          useValue: { getPublicUrl: jest.fn().mockReturnValue('url') },
        },
      ],
    }).compile();

    service = module.get<PropertiesService>(PropertiesService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('findOne', () => {
    it('should return cached property when cached', async () => {
      cacheService.get.mockResolvedValueOnce(mockProperty);

      const result = await service.findOne('p1');

      expect(result).toEqual(mockProperty);
      expect(propertyModel.findById).not.toHaveBeenCalled();
    });

    it('should throw NotFoundException when cached property is not approved', async () => {
      cacheService.get.mockResolvedValueOnce({
        ...mockProperty,
        reviewStatus: 'pending',
      });

      await expect(service.findOne('p1')).rejects.toThrow(NotFoundException);
      expect(propertyModel.findById).not.toHaveBeenCalled();
    });

    it('should return cached property when requireApproved is false', async () => {
      const pendingProperty = {
        ...mockProperty,
        reviewStatus: 'pending',
      };
      cacheService.get.mockResolvedValueOnce(pendingProperty);

      const result = await service.findOne('p1', false);

      expect(result).toEqual(pendingProperty);
      expect(propertyModel.findById).not.toHaveBeenCalled();
    });

    it('should query the database and cache the result when not cached', async () => {
      cacheService.get.mockResolvedValueOnce(null);
      propertyModel.findById.mockReturnValueOnce(
        createPopulateQuery(mockProperty),
      );

      const result = await service.findOne('p1');

      expect(propertyModel.findById).toHaveBeenCalledWith('p1');
      // After findOne, media URLs are transformed via AwsS3Service
      const transformedProperty = { ...mockProperty, media: ['url'] };
      expect(cacheService.set).toHaveBeenCalledWith(
        'property:p1',
        transformedProperty,
        5 * 60 * 1000,
      );
      expect(result).toEqual(transformedProperty);
    });

    it('should throw NotFoundException when property does not exist', async () => {
      cacheService.get.mockResolvedValueOnce(null);
      propertyModel.findById.mockReturnValueOnce(createPopulateQuery(null));

      await expect(service.findOne('missing')).rejects.toThrow(
        NotFoundException,
      );
    });
  });

  describe('findAll', () => {
    it('should return cached response if available', async () => {
      cacheService.get.mockImplementation((key: string) => {
        if (key === 'properties:list:version') return Promise.resolve(1);
        return Promise.resolve({
          data: [mockProperty],
          total: 1,
          page: 1,
          limit: 10,
          totalPage: 1,
        });
      });

      const result = await service.findAll({});

      expect(result).toEqual({
        data: [mockProperty],
        total: 1,
        page: 1,
        limit: 10,
        totalPage: 1,
      });
      expect(propertyModel.find).not.toHaveBeenCalled();
    });

    it('should query the database and cache list results when not cached', async () => {
      cacheService.get.mockImplementation((key: string) => {
        if (key === 'properties:list:version') return Promise.resolve(1);
        return Promise.resolve(null);
      });
      const queryChain = createFindQuery([mockProperty]);
      propertyModel.find.mockReturnValueOnce(queryChain);
      propertyModel.countDocuments.mockResolvedValueOnce(1);

      const result = (await service.findAll({
        page: 1,
        limit: 10,
      })) as PaginatedProperties;

      expect(propertyModel.find).toHaveBeenCalledWith({
        reviewStatus: 'approved',
      });
      expect(propertyModel.countDocuments).toHaveBeenCalledWith({
        reviewStatus: 'approved',
      });
      expect(cacheService.set).toHaveBeenCalled();
      expect(result.data).toEqual([mockProperty]);
      expect(result.page).toBe(1);
      expect(result.limit).toBe(10);
      expect(result.total).toBe(1);
    });

    it('should filter using the schema field names bedroom/bathroom', async () => {
      cacheService.get.mockImplementation((key: string) => {
        if (key === 'properties:list:version') return Promise.resolve(1);
        return Promise.resolve(null);
      });
      const queryChain = createFindQuery([mockProperty]);
      propertyModel.find.mockReturnValueOnce(queryChain);
      propertyModel.countDocuments.mockResolvedValueOnce(1);

      await service.findAll({
        page: 1,
        limit: 10,
        bedrooms: 2,
        bathrooms: 1,
      } as any);

      expect(propertyModel.find).toHaveBeenCalledWith({
        reviewStatus: 'approved',
        bedroom: { $gte: 2 },
        bathroom: { $gte: 1 },
      });
    });

    it('should filter by price range when minPrice/maxPrice are provided', async () => {
      cacheService.get.mockImplementation((key: string) => {
        if (key === 'properties:list:version') return Promise.resolve(1);
        return Promise.resolve(null);
      });
      const queryChain = createFindQuery([mockProperty]);
      propertyModel.find.mockReturnValueOnce(queryChain);
      propertyModel.countDocuments.mockResolvedValueOnce(1);

      await service.findAll({
        page: 1,
        limit: 10,
        minPrice: 100,
        maxPrice: 500,
      } as any);

      expect(propertyModel.find).toHaveBeenCalledWith({
        reviewStatus: 'approved',
        price: { $gte: 100, $lte: 500 },
      });
    });

    it('should apply a full-text search filter when search is provided', async () => {
      cacheService.get.mockImplementation((key: string) => {
        if (key === 'properties:list:version') return Promise.resolve(1);
        return Promise.resolve(null);
      });
      const queryChain = createFindQuery([mockProperty]);
      propertyModel.find.mockReturnValueOnce(queryChain);
      propertyModel.countDocuments.mockResolvedValueOnce(1);

      await service.findAll({
        page: 1,
        limit: 10,
        search: 'loft',
      } as any);

      expect(propertyModel.find).toHaveBeenCalledWith({
        reviewStatus: 'approved',
        $text: { $search: 'loft' },
      });
    });

    it('should filter by city, state, category, and type', async () => {
      cacheService.get.mockImplementation((key: string) => {
        if (key === 'properties:list:version') return Promise.resolve(1);
        return Promise.resolve(null);
      });
      const queryChain = createFindQuery([mockProperty]);
      propertyModel.find.mockReturnValueOnce(queryChain);
      propertyModel.countDocuments.mockResolvedValueOnce(1);

      await service.findAll({
        page: 1,
        limit: 10,
        city: 'Austin',
        state: 'TX',
        categoryId: 'c1',
        type: 'apartment',
      } as any);

      expect(propertyModel.find).toHaveBeenCalledWith({
        reviewStatus: 'approved',
        city: expect.any(RegExp),
        state: expect.any(RegExp),
        categoryId: 'c1',
        type: 'apartment',
      });
    });

    it('should apply default pagination and sort when the query is empty', async () => {
      cacheService.get.mockImplementation((key: string) => {
        if (key === 'properties:list:version') return Promise.resolve(1);
        return Promise.resolve(null);
      });
      const queryChain = createFindQuery([mockProperty]);
      propertyModel.find.mockReturnValueOnce(queryChain);
      propertyModel.countDocuments.mockResolvedValueOnce(1);

      const result = (await service.findAll({} as any)) as PaginatedProperties;

      expect(queryChain.skip).toHaveBeenCalledWith(0);
      expect(queryChain.limit).toHaveBeenCalledWith(10);
      expect(queryChain.sort).toHaveBeenCalledWith({ createdAt: -1 });
      expect(result.page).toBe(1);
      expect(result.limit).toBe(10);
    });

    it('should sort ascending when sortOrder is asc', async () => {
      cacheService.get.mockImplementation((key: string) => {
        if (key === 'properties:list:version') return Promise.resolve(1);
        return Promise.resolve(null);
      });
      const queryChain = createFindQuery([mockProperty]);
      propertyModel.find.mockReturnValueOnce(queryChain);
      propertyModel.countDocuments.mockResolvedValueOnce(1);

      await service.findAll({
        page: 1,
        limit: 10,
        sortBy: 'price',
        sortOrder: 'asc',
      } as any);

      expect(queryChain.sort).toHaveBeenCalledWith({ price: 1 });
    });
  });

  describe('findFeatured', () => {
    it('should return cached featured results when available', async () => {
      cacheService.get.mockImplementation((key: string) => {
        if (key === 'properties:list:version') return Promise.resolve(1);
        return Promise.resolve({
          data: [mockProperty],
          total: 1,
          page: 1,
          limit: 10,
          totalPage: 1,
        });
      });

      const result = (await service.findFeatured()) as PaginatedProperties;

      expect(result.data).toEqual([mockProperty]);
      expect(propertyModel.find).not.toHaveBeenCalled();
    });

    it('should fetch featured results from database and cache them when not cached', async () => {
      cacheService.get.mockImplementation((key: string) => {
        if (key === 'properties:list:version') return Promise.resolve(1);
        return Promise.resolve(null);
      });
      const queryChain = createFindQuery([mockProperty]);
      propertyModel.find.mockReturnValueOnce(queryChain);
      propertyModel.countDocuments.mockResolvedValueOnce(1);

      const result = (await service.findFeatured(1, 10)) as PaginatedProperties;

      expect(propertyModel.find).toHaveBeenCalledWith({
        featured: true,
        reviewStatus: 'approved',
      });
      expect(propertyModel.countDocuments).toHaveBeenCalledWith({
        featured: true,
        reviewStatus: 'approved',
      });
      expect(cacheService.set).toHaveBeenCalled();
      expect(result.total).toBe(1);
    });
  });

  describe('findLatest', () => {
    it('should return cached latest results when available', async () => {
      cacheService.get.mockImplementation((key: string) => {
        if (key === 'properties:list:version') return Promise.resolve(1);
        return Promise.resolve({
          data: [mockProperty],
          total: 1,
          page: 1,
          limit: 10,
          totalPage: 1,
        });
      });

      const result = (await service.findLatest()) as PaginatedProperties;

      expect(result.data).toEqual([mockProperty]);
      expect(propertyModel.find).not.toHaveBeenCalled();
    });

    it('should normalize page and limit and cache latest results', async () => {
      cacheService.get.mockImplementation((key: string) => {
        if (key === 'properties:list:version') return Promise.resolve(1);
        return Promise.resolve(null);
      });
      const queryChain = createFindQuery([mockProperty]);
      propertyModel.find.mockReturnValueOnce(queryChain);
      propertyModel.countDocuments.mockResolvedValueOnce(1);

      const result = (await service.findLatest(0, 100)) as PaginatedProperties;

      expect(queryChain.skip).toHaveBeenCalledWith(0);
      expect(queryChain.limit).toHaveBeenCalledWith(50);
      expect(result.page).toBe(1);
      expect(result.limit).toBe(50);
      expect(result.total).toBe(1);
    });
  });

  describe('findPending', () => {
    it('should return pending properties only', async () => {
      const pendingProperty = { ...mockProperty, reviewStatus: 'pending' };
      const queryChain = createFindQuery([pendingProperty]);
      propertyModel.find.mockReturnValueOnce(queryChain);
      propertyModel.countDocuments.mockResolvedValueOnce(1);

      const result = (await service.findPending()) as PaginatedProperties;

      expect(propertyModel.find).toHaveBeenCalledWith({
        reviewStatus: 'pending',
      });
      expect(propertyModel.countDocuments).toHaveBeenCalledWith({
        reviewStatus: 'pending',
      });
      expect(result.data).toEqual([pendingProperty]);
      expect(result.total).toBe(1);
    });
  });

  describe('approveReview', () => {
    it('should approve a pending property and invalidate caches', async () => {
      const existingProperty: any = {
        ...mockProperty,
        reviewStatus: 'pending',
        save: jest.fn().mockResolvedValue(undefined),
      };
      const approvedProperty = { ...mockProperty, reviewStatus: 'approved' };

      propertyModel.findById
        .mockReturnValueOnce(existingProperty)
        .mockReturnValueOnce(createPopulateQuery(approvedProperty));

      const result = (await service.approveReview('p1')) as any;

      expect(existingProperty.save).toHaveBeenCalled();
      expect(cacheService.delete).toHaveBeenCalledWith('property:p1');
      expect(result.reviewStatus).toBe('approved');
    });

    it('should throw when the property does not exist', async () => {
      propertyModel.findById.mockReturnValueOnce(null);

      await expect(service.approveReview('missing')).rejects.toThrow(
        NotFoundException,
      );
    });
  });

  describe('rejectReview', () => {
    it('should reject a pending property and invalidate caches', async () => {
      const existingProperty: any = {
        ...mockProperty,
        reviewStatus: 'pending',
        save: jest.fn().mockResolvedValue(undefined),
      };
      const rejectedProperty = { ...mockProperty, reviewStatus: 'rejected' };

      propertyModel.findById
        .mockReturnValueOnce(existingProperty)
        .mockReturnValueOnce(createPopulateQuery(rejectedProperty));

      const result = (await service.rejectReview('p1')) as any;

      expect(existingProperty.save).toHaveBeenCalled();
      expect(cacheService.delete).toHaveBeenCalledWith('property:p1');
      expect(result.reviewStatus).toBe('rejected');
    });

    it('should throw when the property does not exist', async () => {
      propertyModel.findById.mockReturnValueOnce(null);

      await expect(service.rejectReview('missing')).rejects.toThrow(
        NotFoundException,
      );
    });
  });

  describe('create', () => {
    it('should create a new property and cache version data', async () => {
      usersService.findOne.mockResolvedValueOnce({ _id: 'u1' });
      categoriesService.findOne.mockResolvedValueOnce({ _id: 'c1' });

      const createDto = {
        title: 'New property',
        ownerId: 'u1',
        categoryId: 'c1',
      };
      const expectedProperty = { _id: 'p1', ...createDto };
      propertyModel.findById.mockReturnValueOnce(
        createPopulateQuery(expectedProperty),
      );

      const result = (await service.create(createDto as any)) as any;

      expect(result).toBeDefined();
      expect(result.title).toBe(createDto.title);
      expect(cacheService.set).toHaveBeenCalled();
    });

    it('should throw when owner does not exist', async () => {
      usersService.findOne.mockRejectedValueOnce(new NotFoundException());

      await expect(
        service.create({
          title: 'New property',
          ownerId: 'missing',
          categoryId: 'c1',
        } as any),
      ).rejects.toThrow(NotFoundException);
    });

    it('should throw BadRequestException when neither currentUserId nor ownerId is provided', async () => {
      await expect(
        service.create({
          title: 'New property',
          categoryId: 'c1',
        } as any),
      ).rejects.toThrow(BadRequestException);
      expect(usersService.findOne).not.toHaveBeenCalled();
    });
  });

  describe('update', () => {
    it('should update a property when the user is the owner', async () => {
      const existingProperty: any = {
        ...mockProperty,
        save: jest
          .fn()
          .mockResolvedValue({ ...mockProperty, title: 'Updated Title' }),
      };
      const updatedProperty = { ...mockProperty, title: 'Updated Title' };

      propertyModel.findById
        .mockReturnValueOnce(existingProperty)
        .mockReturnValueOnce(createPopulateQuery(updatedProperty));
      categoriesService.findOne.mockResolvedValueOnce({ _id: 'c1' });

      const result = (await service.update('p1', 'u1', {
        title: 'Updated Title',
        categoryId: 'c1',
      } as any)) as any;

      expect(existingProperty.save).toHaveBeenCalled();
      expect(result.title).toBe('Updated Title');
      expect(cacheService.delete).toHaveBeenCalledWith('property:p1');
    });

    it('should throw when user is not the owner', async () => {
      const existingProperty: any = {
        ...mockProperty,
        ownerId: 'u2',
        save: jest.fn(),
      };
      propertyModel.findById.mockResolvedValueOnce(existingProperty);

      await expect(
        service.update('p1', 'u1', { title: 'Updated Title' } as any),
      ).rejects.toThrow(ForbiddenException);
    });

    it('should throw when the property does not exist', async () => {
      propertyModel.findById.mockReturnValueOnce(null);

      await expect(
        service.update('missing', 'u1', { title: 'Updated Title' } as any),
      ).rejects.toThrow(NotFoundException);
    });
  });

  describe('remove', () => {
    it('should remove a property and invalidate caches', async () => {
      propertyModel.findByIdAndDelete.mockReturnValueOnce(
        createPopulateQuery(mockProperty),
      );

      const result = await service.remove('p1');

      expect(result).toEqual(mockProperty);
      expect(cacheService.delete).toHaveBeenCalledWith('property:p1');
    });

    it('should throw when property is not found', async () => {
      propertyModel.findByIdAndDelete.mockReturnValueOnce(
        createPopulateQuery(null),
      );

      await expect(service.remove('missing')).rejects.toThrow(
        NotFoundException,
      );
    });
  });

  describe('setFeatured', () => {
    it('should mark property as featured and invalidate cache', async () => {
      const existingProperty: any = {
        ...mockProperty,
        save: jest.fn().mockResolvedValue({ ...mockProperty, featured: true }),
      };
      const updatedProperty = { ...mockProperty, featured: true };

      propertyModel.findById
        .mockReturnValueOnce(existingProperty)
        .mockReturnValueOnce(createPopulateQuery(updatedProperty));

      const result = (await service.setFeatured('p1', true)) as any;

      expect(existingProperty.save).toHaveBeenCalled();
      expect(result.featured).toBe(true);
      expect(cacheService.delete).toHaveBeenCalledWith('property:p1');
    });

    it('should throw when property does not exist', async () => {
      propertyModel.findById.mockReturnValueOnce(createPopulateQuery(null));

      await expect(service.setFeatured('missing', true)).rejects.toThrow(
        NotFoundException,
      );
    });
  });
});
