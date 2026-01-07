import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { RefreshToken } from './refresh-token.schema';
import { Model } from 'mongoose';
import { UsersService } from 'src/users/users.service';
import * as bcrypt from 'bcrypt';

@Injectable()
export class RefreshTokenService {
  constructor(
    @InjectModel(RefreshToken.name)
    private refreshTokenModel: Model<RefreshToken>,
    private readonly usersService: UsersService,
  ) {}

  async createRefreshToken(userId: string, token: string, expireAt: Date) {
    const salt = await bcrypt.genSalt(10);
    const hashedToken = await bcrypt.hash(token, salt);
    const refreshToken = new this.refreshTokenModel({
      userId,
      hashedToken,
      expireAt,
    });

    return await refreshToken.save();
  }
}
