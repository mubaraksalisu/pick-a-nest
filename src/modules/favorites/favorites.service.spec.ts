import { Test, TestingModule } from '@nestjs/testing';
import { getModelToken } from '@nestjs/mongoose';
import { FavoritesService } from './favorites.service';
import { Favorite } from './schemas/favorite.schema';
import { UsersService } from 'src/modules/users/users.service';
import { PropertiesService } from 'src/modules/properties/properties.service';
import { ConflictException, NotFoundException } from '@nestjs/common';

describe('FavoritesService', () => {
  let service: FavoritesService;
  let model: any;
  let usersService: any;
  let propertiesService: any;

  function mockFavoriteModel(this: any, dto: any) {
    this.data = dto;
    this.save = jest.fn().mockResolvedValue({ _id: 'f1', ...dto });
  }

  const createPopulateQuery = (result: any) => ({
    populate: jest.fn().mockResolvedValue(result),
  });

  mockFavoriteModel.find = jest.fn();
  mockFavoriteModel.findById = jest.fn();
  mockFavoriteModel.findOne = jest.fn();
  mockFavoriteModel.findOneAndDelete = jest.fn();

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

    it('should return empty favorites when the query returns an empty array', async () => {
      model.find.mockReturnValue(createPopulateQuery([]));

      const result = await service.getMyFavorites('u1');

      expect(result).toEqual({ favorites: [] });
    });

    it('should throw NotFoundException when favorites query returns null', async () => {
      model.find.mockReturnValue(createPopulateQuery(null));

      await expect(service.getMyFavorites('u1')).rejects.toThrow(
        NotFoundException,
      );
    });
  });

  describe('findOne', () => {
    it('should throw NotFoundException when favorite does not exist', async () => {
      model.findById.mockResolvedValue(null);

      await expect(service.findOne('f1')).rejects.toThrow(NotFoundException);
    });

    it('should return the favorite when it exists', async () => {
      const favorite = { _id: 'f1', userId: 'u1', propertyId: 'p1' };
      model.findById.mockResolvedValue(favorite);

      const result = await service.findOne('f1');

      expect(result).toEqual(favorite);
    });
  });

  describe('addToFavorite', () => {
    it('should throw ConflictException when the favorite already exists', async () => {
      usersService.findOne.mockResolvedValue({ _id: 'u1' });
      propertiesService.findOne.mockResolvedValue({ _id: 'p1' });
      model.findOne.mockResolvedValue({ _id: 'f1' });

      await expect(service.addToFavorite('u1', 'p1')).rejects.toThrow(
        ConflictException,
      );
    });

    it('should save a new favorite when it does not exist', async () => {
      usersService.findOne.mockResolvedValue({ _id: 'u1' });
      propertiesService.findOne.mockResolvedValue({ _id: 'p1' });
      model.findOne.mockResolvedValue(null);

      const result = await service.addToFavorite('u1', 'p1');

      expect(result).toEqual({ _id: 'f1', userId: 'u1', propertyId: 'p1' });
      expect(usersService.findOne).toHaveBeenCalledWith('u1');
      expect(propertiesService.findOne).toHaveBeenCalledWith('p1');
    });

    it('should propagate error when the user does not exist', async () => {
      usersService.findOne.mockRejectedValue(
        new NotFoundException('User not found'),
      );

      await expect(service.addToFavorite('u1', 'p1')).rejects.toThrow(
        NotFoundException,
      );
      expect(usersService.findOne).toHaveBeenCalledWith('u1');
      expect(propertiesService.findOne).not.toHaveBeenCalled();
    });

    it('should propagate error when the property does not exist', async () => {
      usersService.findOne.mockResolvedValue({ _id: 'u1' });
      propertiesService.findOne.mockRejectedValue(
        new NotFoundException('Property not found'),
      );

      await expect(service.addToFavorite('u1', 'p1')).rejects.toThrow(
        NotFoundException,
      );
      expect(usersService.findOne).toHaveBeenCalledWith('u1');
      expect(propertiesService.findOne).toHaveBeenCalledWith('p1');
    });
  });

  describe('removeFromFavorite', () => {
    it('should throw NotFoundException when favorite is not in the list', async () => {
      model.findOneAndDelete.mockReturnValue(createPopulateQuery(null));

      await expect(service.removeFromFavorite('u1', 'p1')).rejects.toThrow(
        NotFoundException,
      );
    });

    it('should delete and return the favorite when it exists', async () => {
      const favorite = { _id: 'f1', userId: 'u1', propertyId: 'p1' };
      model.findOneAndDelete.mockReturnValue(createPopulateQuery(favorite));

      const result = await service.removeFromFavorite('u1', 'p1');

      expect(result).toEqual(favorite);
      expect(model.findOneAndDelete).toHaveBeenCalledWith({
        userId: 'u1',
        propertyId: 'p1',
      });
    });
  });
});
