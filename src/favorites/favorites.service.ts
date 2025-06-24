import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { CreateFavoriteDto } from './dto/create-favorite.dto';
import { InjectModel } from '@nestjs/mongoose';
import { User } from 'src/users/schemas/user.schema';
import { Model } from 'mongoose';
import { Favorite } from './schemas/favorite.schema';
import { Property } from 'src/properties/schemas/property.schema';

@Injectable()
export class FavoritesService {
  constructor(
    @InjectModel(User.name) private userModel: Model<User>,
    @InjectModel(Favorite.name) private favoriteModel: Model<Favorite>,
    @InjectModel(Property.name) private propertyModel: Model<Property>,
  ) {}

  async getMyFavorites(userId: string): Promise<Favorite[]> {
    return await this.favoriteModel.find({ userId }).populate('propertyId');
  }

  async isPropertyFavorite(
    userId: string,
    propertyId: string,
  ): Promise<boolean> {
    const count = await this.favoriteModel.countDocuments({
      userId,
      propertyId,
    });
    return count > 0;
  }

  async addToFavorite(userId: string, propertyId: string): Promise<Favorite> {
    const user = await this.userModel.findById(userId);
    if (!user)
      throw new NotFoundException('No user found with the given userId');

    const property = await this.propertyModel.findById(propertyId);
    if (!property)
      throw new NotFoundException('No property with the provided propertyId');

    let favorite = await this.favoriteModel.findOne({ userId, propertyId });
    if (favorite)
      throw new BadRequestException('Already added to your favorite');

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
    if (!favorite) throw new NotFoundException('Not in your favorite list');
    return favorite;
  }
}
