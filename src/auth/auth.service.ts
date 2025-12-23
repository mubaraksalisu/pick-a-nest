import { ConflictException, Injectable } from '@nestjs/common';
import { AuthPayloadDto } from './dto/auth.dto';
import { JwtService } from '@nestjs/jwt';
import { InjectModel } from '@nestjs/mongoose';
import { User } from '../users/schemas/user.schema';
import { Model } from 'mongoose';
import * as bcrypt from 'bcrypt';
import { CreateUserDto } from '../users/dto/create-user.dto';

@Injectable()
export class AuthService {
  constructor(
    private jwtService: JwtService,
    @InjectModel(User.name) private userModel: Model<User>,
  ) {}

  async validateUser({ email, password }: AuthPayloadDto) {
    const user = await this.userModel.findOne({ email });
    if (user && (await bcrypt.compare(password, user.password))) {
      const { password, ...result } = user;
      return result;
    }
    return null;
  }

  async login(user: any) {
    const payload = { sub: user._id, role: user.role, email: user.email };
    return { access_token: this.jwtService.sign(payload) };
  }

  async register(createUserDto: CreateUserDto) {
    let user = await this.userModel.findOne({ email: createUserDto.email });
    if (user) throw new ConflictException('User with this email already exist');

    const salt = await bcrypt.genSalt(10);
    const encryptedPassword = await bcrypt.hash(createUserDto.password, salt);

    user = new this.userModel({
      ...createUserDto,
      password: encryptedPassword,
    });
    const savedUser = await user.save();

    const payload = {
      _id: savedUser._id,
      email: savedUser.email,
      role: savedUser.role,
    };

    const authToken = this.jwtService.sign(payload);

    const userObject = savedUser.toObject();
    const { password, ...result } = userObject;
    return { authToken, user: result };
  }
}
