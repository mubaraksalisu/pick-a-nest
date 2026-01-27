import {
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { Favorite } from './schemas/favorite.schema';
import { UsersService } from 'src/users/users.service';
import { PropertiesService } from 'src/properties/properties.service';

@Injectable()
export class FavoritesService {
  constructor(
    @InjectModel(Favorite.name) private favoriteModel: Model<Favorite>,
    private usersService: UsersService,
    private propertyModel: PropertiesService,
  ) {}

  async getMyFavorites(userId: string) {
    const userFavorites = await this.favoriteModel
      .find({ userId })
      .populate('propertyId');

    if (!userFavorites)
      throw new NotFoundException('User favorites list is empty');

    return { favorites: [...userFavorites] };
  }

  async findOne(id: string) {
    const favorite = await this.favoriteModel.findById(id);
    if (!favorite)
      throw new NotFoundException('No favorite with the provided id');

    return favorite;
  }

  async addToFavorite(userId: string, propertyId: string): Promise<Favorite> {
    // These will throw if not found, so no need for manual checks
    await this.usersService.findOne(userId);
    await this.propertyModel.findOne(propertyId);

    let favorite = await this.favoriteModel.findOne({ userId, propertyId });
    if (favorite) throw new ConflictException('Already added to your favorite');

    favorite = new this.favoriteModel({
      userId,
      propertyId,
    });

    return await favorite.save();
  }

  async removeFromFavorite(
    userId: string,
    propertyId: string,
  ): Promise<Favorite> {
    const favorite = await this.favoriteModel
      .findOneAndDelete({
        userId,
        propertyId,
      })
      .populate('propertyId');
    if (!favorite) throw new NotFoundException('Not in user favorite list');
    return favorite;
  }
}
