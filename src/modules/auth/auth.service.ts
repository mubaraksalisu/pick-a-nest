import { Inject, Injectable, UnauthorizedException } from '@nestjs/common';
import { AuthPayloadDto } from './dto/auth.dto';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcrypt';
import { CreateUserDto, UserResponseDto } from '../users/dto/create-user.dto';
import { RefreshTokenService } from 'src/modules/auth/refresh-token/refresh-token.service';
import { ConfigService } from '@nestjs/config';
import { UsersService } from 'src/modules/users/users.service';
import { createHash, randomBytes } from 'crypto';
import { EmailVerificationService } from './email-verification/email-verification.service';
import { QueuesService } from 'src/infrastructure/queues/queues.service';
import { EMAIL_JOBS } from 'src/infrastructure/queues/queue.constants';

@Injectable()
export class AuthService {
  constructor(
    private jwtService: JwtService,
    private refreshTokenService: RefreshTokenService,
    private emailVerificationService: EmailVerificationService,
    private configService: ConfigService,
    private usersService: UsersService,
    private readonly queueService: QueuesService,
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
    if (user.status !== 'active')
      throw new UnauthorizedException(
        'User account inactive. perhaps you are yet to verify your email address',
      );

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
    const rawToken = randomBytes(32).toString('hex');
    const hashedToken = createHash('sha256').update(rawToken).digest('hex');

    await this.emailVerificationService.create(
      newUser._id.toString(),
      hashedToken,
      new Date(Date.now() + 1 * 60 * 60 * 1000), // expires in 1 hour
    );
    await this.queueService.queueEmail(EMAIL_JOBS.EMAIL_VERIFICATION, {
      email: newUser.email,
      token: rawToken,
    });

    return newUser;
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

      await this.refreshTokenService.revokeToken(hashedToken._id.toString());

      const user = await this.usersService.findOne(payload.sub);

      return this.login(user);
    } catch (error) {
      throw new UnauthorizedException('Invalid or expired refresh token');
    }
  }

  async verifyEmail(token: string) {
    const hashedToken = createHash('sha256').update(token).digest('hex');
    const emailVerification =
      await this.emailVerificationService.validateToken(hashedToken);
    if (!emailVerification) {
      throw new UnauthorizedException(
        'Invalid or expired email verification token',
      );
    }

    await this.usersService.activateUser(emailVerification.userId.toString());
    await this.emailVerificationService.deleteToken(
      emailVerification._id.toString(),
    );

    return { message: 'Email verified successfully. You can now log in.' };
  }

  async logout(token: string) {
    try {
      const payload = await this.jwtService.verify(token);
      await this.refreshTokenService.revokeToken(payload.sub);
    } catch (error) {
      return; // Token is invalid or already revoked, so we can ignore it
    }
  }
}
