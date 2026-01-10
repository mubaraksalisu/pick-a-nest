import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { RefreshToken } from './refresh-token.schema';
import { Model } from 'mongoose';
import * as bcrypt from 'bcrypt';

@Injectable()
export class RefreshTokenService {
  constructor(
    @InjectModel(RefreshToken.name)
    private refreshTokenModel: Model<RefreshToken>,
  ) {}

  async createToken(userId: string, token: string, expireAt: Date) {
    const salt = await bcrypt.genSalt(10);
    const hashedToken = await bcrypt.hash(token, salt);
    const refreshToken = new this.refreshTokenModel({
      userId,
      hashedToken,
      expireAt,
    });

    return await refreshToken.save();
  }

  async validateToken(userId: string, token: string) {
    const refreshTokens = await this.refreshTokenModel.find({ userId });

    for (const t of refreshTokens) {
      const match = await bcrypt.compare(token, t.hashedToken);
      if (match && !t.revoked && t.expireAt > new Date()) return t;
    }

    return false;
  }

  async revokeToken(id: string) {
    const token = await this.refreshTokenModel.findByIdAndUpdate(id, {
      revoked: true,
    });
    if (!token)
      throw new NotFoundException('No token with provided id to revoke');

    return token;
  }
}
