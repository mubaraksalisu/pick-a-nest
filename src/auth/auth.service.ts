import { ConflictException, Injectable } from '@nestjs/common';
import { AuthPayloadDto } from './dto/auth.dto';
import { JwtService } from '@nestjs/jwt';
import { InjectModel } from '@nestjs/mongoose';
import { User } from 'src/users/schemas/user.schema';
import { Model } from 'mongoose';
import * as bcrypt from 'bcrypt';
import { CreateUserDto } from 'src/users/dto/create-user.dto';
import { JwtPayload } from './interfaces/jwtPayload.interface';

@Injectable()
export class AuthService {
  constructor(
    private jwtService: JwtService,
    @InjectModel(User.name) private userModel: Model<User>,
  ) {}

  async validateUser({ email, password }: AuthPayloadDto) {
    const user = await this.userModel.findOne({ email });
    if (user && (await bcrypt.compare(password, user.password))) {
      const { _id, role, email } = user;
      return this.jwtService.sign({ _id, role, email });
    }
    return null;
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

  async profile(payload: JwtPayload) {
    return await this.userModel.findById(payload._id).select('-password');
  }
}
