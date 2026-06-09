import { Module } from '@nestjs/common';
import { FavoritesModule } from './modules/favorites/favorites.module';
import { UsersModule } from './modules/users/users.module';
import { StatesModule } from './modules/states/states.module';
import { CategoriesModule } from './modules/categories/categories.module';
import { PropertiesModule } from './modules/properties/properties.module';
import { VisitsModule } from './modules/visits/visits.module';
import { AuthModule } from './modules/auth/auth.module';
import { MongooseModule } from '@nestjs/mongoose';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { PropertyReviewsModule } from './modules/property-reviews/property-reviews.module';
import { HomeModule } from './modules/home/home.module';
import { HealthModule } from './modules/health/health.module';
import { TerminusModule } from '@nestjs/terminus';
import { ThrottlerGuard, ThrottlerModule } from '@nestjs/throttler';
import { APP_GUARD } from '@nestjs/core';
import { WinstonModule } from 'nest-winston';
import * as winston from 'winston';
import { HttpExceptionFilter } from './shared/filters/httpException.filter';
import { AgentReviewsModule } from './modules/agent-reviews/agent-reviews.module';
import { RefreshTokenModule } from './modules/auth/refresh-token/refresh-token.module';
import { CacheModule } from './infrastructure/cache/cache.module';
import { MailModule } from './infrastructure/mail/mail.module';
import { EmailVerificationModule } from './modules/auth/email-verification/email-verification.module';
import { QueuesModule } from './infrastructure/queues/queues.module';
import { AwsS3Module } from './infrastructure/aws-s3/aws-s3.module';

@Module({
  imports: [
    ConfigModule.forRoot({
      envFilePath: process.env.NODE_ENV === 'test' ? '.env.test' : '.env',
      isGlobal: true,
    }),
    MongooseModule.forRootAsync({
      imports: [ConfigModule],
      useFactory: async (configService: ConfigService) => ({
        uri: configService.get<string>('DATABASE_URL'),
        dbName: configService.get<string>('DATABASE_NAME'),
      }),
      inject: [ConfigService],
    }),
    ThrottlerModule.forRoot({ throttlers: [{ ttl: 60, limit: 30 }] }),
    WinstonModule.forRoot({
      transports: [
        new winston.transports.Console({
          handleExceptions: true,
          handleRejections: true,
          format: winston.format.combine(
            winston.format.timestamp(),
            winston.format.colorize(),
            winston.format.printf(({ level, message, timestamp, stack }) => {
              return `[${timestamp}] ${level}: ${message} ${stack ? '\n' + stack : ''}`;
            }),
          ),
        }),
        new winston.transports.File({
          filename: 'logs/error.log',
          level: 'error',
          handleExceptions: true,
          handleRejections: true,
          format: winston.format.json(),
        }),
      ],
      exitOnError: true, // prevent Winston from exiting after logging
    }),
    CacheModule,
    FavoritesModule,
    UsersModule,
    StatesModule,
    CategoriesModule,
    PropertiesModule,
    AuthModule,
    VisitsModule,
    PropertyReviewsModule,
    HomeModule,
    HealthModule,
    TerminusModule,
    AgentReviewsModule,
    RefreshTokenModule,
    MailModule,
    EmailVerificationModule,
    QueuesModule,
    AwsS3Module,
  ],
  providers: [
    {
      provide: APP_GUARD,
      useClass: ThrottlerGuard,
    },
    {
      provide: 'APP_FILTER',
      useClass: HttpExceptionFilter,
    },
  ],
})
export class AppModule {}
