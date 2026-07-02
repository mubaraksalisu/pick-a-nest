import { Module } from '@nestjs/common';
import { AuthService } from './auth.service';
import { AuthController } from './auth.controller';
import { UsersModule } from 'src/modules/users/users.module';
import { JwtModule } from '@nestjs/jwt';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { PassportModule } from '@nestjs/passport';
import { LocalStrategy } from './strategies/local.strategy';
import { JwtStrategy } from './strategies/jwt.strategy';
import { RefreshTokenModule } from 'src/modules/auth/refresh-token/refresh-token.module';
import { EmailVerificationModule } from './email-verification/email-verification.module';
import { QueuesModule } from 'src/infrastructure/queues/queues.module';

@Module({
  imports: [
    ConfigModule,
    PassportModule,
    UsersModule,
    RefreshTokenModule,
    EmailVerificationModule,
    QueuesModule,
    JwtModule.registerAsync({
      imports: [ConfigModule],
      useFactory: (configService: ConfigService) => ({
        secret: configService.get<string>('SECRET'),
      }),
      inject: [ConfigService],
    }),
  ],
  controllers: [AuthController],
  providers: [AuthService, LocalStrategy, JwtStrategy],
})
export class AuthModule {}
