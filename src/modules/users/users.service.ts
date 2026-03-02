import {
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { UpdateUserDto } from './dto/update-user.dto';
import { User } from './schemas/user.schema';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { CreateUserDto } from './dto/create-user.dto';
import * as bcrypt from 'bcrypt';

@Injectable()
export class UsersService {
  constructor(@InjectModel(User.name) private userModel: Model<User>) {}

  async create(createUserDto: CreateUserDto) {
    let user = await this.userModel.findOne({ email: createUserDto.email });
    if (user) throw new ConflictException('User with this email already exist');

    const salt = await bcrypt.genSalt(10);
    const encryptedPassword = await bcrypt.hash(createUserDto.password, salt);

    user = new this.userModel({
      ...createUserDto,
      password: encryptedPassword,
    });
    const { password, ...newUser } = (await user.save()).toObject();

    return newUser;
  }

  async findAll({ page, limit }: { page: number; limit: number }) {
    const skip = (page - 1) * limit;
    const [data, total] = await Promise.all([
      this.userModel.find().skip(skip).limit(limit).select('-password'),
      this.userModel.countDocuments(),
    ]);
    return {
      data,
      total,
      page,
      limit,
      totalPage: Math.ceil(total / limit),
    };
  }

  async findOne(id: string) {
    const user = await this.userModel.findById(id).select('-password');
    if (!user)
      throw new NotFoundException('User with the provided id not found');

    return user;
  }

  async findByEmail(email: string) {
    return await this.userModel.findOne({ email });
  }

  async update(id: string, updateUserDto: UpdateUserDto) {
    const user = await this.userModel
      .findByIdAndUpdate(id, updateUserDto, {
        new: true,
      })
      .select('-password');
    if (!user)
      throw new NotFoundException('User with the provided id not found');

    return user;
  }

  async remove(id: string) {
    const user = await this.userModel.findByIdAndDelete(id).select('-password');
    if (!user)
      throw new NotFoundException('User with the provided id not found');

    return user;
  }
}
