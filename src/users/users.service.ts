import { ConflictException, Injectable } from '@nestjs/common';
import { CreateUserDto } from './dto/create-user.dto';
import { UpdateUserDto } from './dto/update-user.dto';
import { User } from './schemas/user.schema';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
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
    await user.save();

    return {} as User;
  }

  async findAll() {
    return {} as User[];
  }

  async findCurrentUser() {
    return {} as User;
  }

  async findOne(id: string) {
    return {} as User;
  }

  async update(id: string, updateUserDto: UpdateUserDto) {
    return {} as User;
  }

  async remove(id: string) {
    return {} as User;
  }
}
