import { Injectable, UnauthorizedException } from '@nestjs/common';
import { AuthPayloadDto } from './dto/auth.dto';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcrypt';
import { CreateUserDto } from '../users/dto/create-user.dto';
import { RefreshTokenService } from 'src/refresh-token/refresh-token.service';
import { ConfigService } from '@nestjs/config';
import { UsersService } from 'src/users/users.service';

@Injectable()
export class AuthService {
  constructor(
    private jwtService: JwtService,
    private refreshTokenService: RefreshTokenService,
    private configService: ConfigService,
    private usersService: UsersService,
  ) {}

  async validateUser({ email, password }: AuthPayloadDto) {
    const user = await this.usersService.findByEmail(email);
    if (user && (await bcrypt.compare(password, user.password))) {
      const { password, ...result } = user.toObject ? user.toObject() : user;
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
    const newUser = await this.usersService.create(createUserDto);
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
        throw new UnauthorizedException('Invalid or expired refresh token');

      await this.refreshTokenService.revokeToken(hashedToken._id as string);

      const user = await this.usersService.findOne(payload.sub);

      return this.login(user);
    } catch (error) {
      throw new UnauthorizedException('Invalid or expired refresh token');
    }
  }
}
