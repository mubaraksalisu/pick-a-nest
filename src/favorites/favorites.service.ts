import { Injectable, NotFoundException } from '@nestjs/common';
import { CreateFavoriteDto } from './dto/create-favorite.dto';
import { InjectModel } from '@nestjs/mongoose';
import { User } from 'src/users/schemas/user.schema';
import { Model } from 'mongoose';
import { Favorite } from './schemas/favorite.schema';
// import { UpdateFavoriteDto } from './dto/update-favorite.dto';

@Injectable()
export class FavoritesService {
  constructor(
    @InjectModel(User.name) private userModel: Model<User>,
    @InjectModel(Favorite.name) private favoriteModel: Model<Favorite>,
  ) {}

  async create({ userId, propertId }: CreateFavoriteDto) {
    const user = await this.userModel.findById(userId);
    if (!user)
      throw new NotFoundException('No user found with the given userId');

    return 'This action adds a new favorite';
  }

  async findAll() {
    return `This action returns all favorites`;
  }

  async findOne(id: string) {
    return `This action returns a #${id} favorite`;
  }

  async remove(id: string) {
    return `This action removes a #${id} favorite`;
  }
}
