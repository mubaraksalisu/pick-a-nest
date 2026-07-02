import { Test, TestingModule } from '@nestjs/testing';
import { getModelToken } from '@nestjs/mongoose';
import { FavoritesService } from './favorites.service';
import { Favorite } from './schemas/favorite.schema';
import { UsersService } from 'src/modules/users/users.service';
import { PropertiesService } from 'src/modules/properties/properties.service';
import { ConflictException, NotFoundException } from '@nestjs/common';

jest.mock('src/modules/properties/properties.service', () => ({
  PropertiesService: jest.fn(),
}));

// Configure fail-safe save for testing
let failSave = false;
function mockFavoriteModel(this: any, dto: any) {
  this.data = dto;
  if (failSave) {
    this.save = jest.fn().mockRejectedValue(new Error('Save error'));
  } else {
    this.save = jest.fn().mockResolvedValue({ _id: 'f1', ...dto });
  }
}

const createPopulateQuery = (result: any) => ({
  populate: jest.fn().mockResolvedValue(result),
});

mockFavoriteModel.find = jest.fn();
mockFavoriteModel.findById = jest.fn();
mockFavoriteModel.findOne = jest.fn();
mockFavoriteModel.findOneAndDelete = jest.fn();

describe('FavoritesService', () => {
  let service: FavoritesService;
  let model: any;
  let usersService: any;
  let propertiesService: any;

  beforeEach(async () => {
    usersService = { findOne: jest.fn() };
    propertiesService = { findOne: jest.fn() };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        FavoritesService,
        { provide: getModelToken(Favorite.name), useValue: mockFavoriteModel },
        { provide: UsersService, useValue: usersService },
        { provide: PropertiesService, useValue: propertiesService },
      ],
    }).compile();

    service = module.get<FavoritesService>(FavoritesService);
    model = module.get(getModelToken(Favorite.name));
  });

  afterEach(() => {
    failSave = false;
    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('getMyFavorites', () => {
    it('should return user favorites when they exist', async () => {
      const favorites = [{ _id: 'f1', userId: 'u1', propertyId: 'p1' }];
      model.find.mockReturnValue(createPopulateQuery(favorites));

      const result = await service.getMyFavorites('u1');

      expect(result).toEqual({ favorites });
      expect(model.find).toHaveBeenCalledWith({ userId: 'u1' });
    });

    it('should return empty favorites list', async () => {
      model.find.mockReturnValue(createPopulateQuery([]));

      const result = await service.getMyFavorites('u1');

      expect(result).toEqual({ favorites: [] });
    });

    it('should throw NotFoundException for invalid user', async () => {
      model.find.mockReturnValue(createPopulateQuery(null));

      await expect(service.getMyFavorites('invalidUser')).rejects.toThrow(
        NotFoundException,
      );
    });
  });

  describe('findOne', () => {
    it('should return the favorite when found', async () => {
      const favorite = { _id: 'f1', userId: 'u1', propertyId: 'p1' };
      model.findById.mockResolvedValue(favorite);

      const result = await service.findOne('f1');

      expect(result).toEqual(favorite);
      expect(model.findById).toHaveBeenCalledWith('f1');
    });

    it('should handle invalid ObjectId format', async () => {
      model.findById.mockResolvedValue(null);

      await expect(service.findOne('invalid-id')).rejects.toThrow(
        NotFoundException,
      );
    });

    it('should reject on malformed ID', async () => {
      model.findById.mockRejectedValue(new Error('Invalid ID format'));

      await expect(service.findOne('invalid-id')).rejects.toThrow(
        'Invalid ID format',
      );
    });
  });

  describe('addToFavorite', () => {
    it('should throw ConflictException for duplicate favorite', async () => {
      usersService.findOne.mockResolvedValue({ _id: 'u1' });
      propertiesService.findOne.mockResolvedValue({ _id: 'p1' });
      model.findOne.mockResolvedValue({ _id: 'f1' });

      await expect(service.addToFavorite('u1', 'p1')).rejects.toThrow(
        ConflictException,
      );
    });

    it('should save new favorite when user and property exist', async () => {
      usersService.findOne.mockResolvedValue({ _id: 'u1' });
      propertiesService.findOne.mockResolvedValue({ _id: 'p1' });
      model.findOne.mockResolvedValue(null);

      const result = await service.addToFavorite('u1', 'p1');

      expect(result).toEqual({ _id: 'f1', userId: 'u1', propertyId: 'p1' });
      expect(usersService.findOne).toHaveBeenCalledWith('u1');
      expect(propertiesService.findOne).toHaveBeenCalledWith('p1');
    });

    it('should propagate error when user does not exist', async () => {
      usersService.findOne.mockRejectedValue(
        new NotFoundException('User not found'),
      );

      await expect(service.addToFavorite('u1', 'p1')).rejects.toThrow(
        NotFoundException,
      );
      expect(usersService.findOne).toHaveBeenCalledWith('u1');
      expect(propertiesService.findOne).not.toHaveBeenCalled();
    });

    it('should propagate error when property does not exist', async () => {
      usersService.findOne.mockResolvedValue({ _id: 'u1' });
      propertiesService.findOne.mockRejectedValue(
        new NotFoundException('Property not found'),
      );

      await expect(service.addToFavorite('u1', 'p1')).rejects.toThrow(
        NotFoundException,
      );
    });

    it('should handle database save error', async () => {
      failSave = true;
      usersService.findOne.mockResolvedValue({ _id: 'u1' });
      propertiesService.findOne.mockResolvedValue({ _id: 'p1' });

      await expect(service.addToFavorite('u1', 'p1')).rejects.toThrow(
        'Save error',
      );
    });
  });

  describe('removeFromFavorite', () => {
    it('should throw NotFoundException when favorite does not exist', async () => {
      const populateMock = jest.fn().mockResolvedValue(null);
      model.findOneAndDelete.mockReturnValue({ populate: populateMock });

      await expect(service.removeFromFavorite('u1', 'p1')).rejects.toThrow(
        NotFoundException,
      );
      expect(populateMock).toHaveBeenCalledWith('propertyId');
    });

    it('should delete and return favorite when it exists', async () => {
      const favorite = { _id: 'f1', userId: 'u1', propertyId: 'p1' };
      const populateMock = jest.fn().mockResolvedValue(favorite);
      model.findOneAndDelete.mockReturnValue({ populate: populateMock });

      const result = await service.removeFromFavorite('u1', 'p1');

      expect(result).toEqual(favorite);
      expect(model.findOneAndDelete).toHaveBeenCalledWith({
        userId: 'u1',
        propertyId: 'p1',
      });
      expect(populateMock).toHaveBeenCalledWith('propertyId');
    });

    it('should handle database error during deletion', async () => {
      const populateMock = jest
        .fn()
        .mockRejectedValue(new Error('Database error'));
      model.findOneAndDelete.mockReturnValue({ populate: populateMock });

      await expect(service.removeFromFavorite('u1', 'p1')).rejects.toThrow(
        'Database error',
      );
      expect(populateMock).toHaveBeenCalledWith('propertyId');
    });
  });
});
