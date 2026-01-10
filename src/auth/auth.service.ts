import {
  ConflictException,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { AuthPayloadDto } from './dto/auth.dto';
import { JwtService } from '@nestjs/jwt';
import { InjectModel } from '@nestjs/mongoose';
import { User } from '../users/schemas/user.schema';
import { Model } from 'mongoose';
import * as bcrypt from 'bcrypt';
import { CreateUserDto } from '../users/dto/create-user.dto';
import { RefreshTokenService } from 'src/refresh-token/refresh-token.service';
import { ConfigService } from '@nestjs/config';

@Injectable()
export class AuthService {
  constructor(
    private jwtService: JwtService,
    private refreshTokenService: RefreshTokenService,
    private configService: ConfigService,
    @InjectModel(User.name) private userModel: Model<User>,
  ) {}

  async validateUser({ email, password }: AuthPayloadDto) {
    const user = await this.userModel.findOne({ email });
    if (user && (await bcrypt.compare(password, user.password))) {
      const { password, ...result } = user.toObject();
      return result;
    }
    return null;
  }

  async login(user: any) {
    const payload = { sub: user._id, role: user.role, email: user.email };
    const refreshToken = this.jwtService.sign(payload, {
      expiresIn: this.configService.get('REFRESH_EXPIRES_IN'),
    });

    await this.refreshTokenService.createToken(
      user._id,
      refreshToken,
      new Date(Date.now() + 30 * 24 * 60 * 60 * 1000), // 30 days matching .env REFRESH_EXPIRES_IN
    );

    const accessToken = this.jwtService.sign(payload, {
      expiresIn: this.configService.get('ACCESS_EXPIRES_IN'),
    });

    return { accessToken, refreshToken };
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
    const { password, ...newUser } = (await user.save()).toObject();

    const { accessToken, refreshToken } = await this.login(newUser);

    return { accessToken, refreshToken, user: newUser };
  }

  async refresh(token: string) {
    try {
      const payload = await this.jwtService.verify(token);

      const hashedToken = await this.refreshTokenService.validateToken(
        payload.sub,
        token,
      );
      if (!hashedToken)
        throw new UnauthorizedException('Invalid refresh token');

      await this.refreshTokenService.revokeToken(hashedToken._id as string);

      const user = await this.userModel.findById(payload.sub);

      return this.login(user);
    } catch (error) {
      throw new UnauthorizedException('Invalid refresh token');
    }
  }
}
