import { Module } from '@nestjs/common';
import { FavoritesModule } from './favorites/favorites.module';
import { UsersModule } from './users/users.module';
import { StatesModule } from './states/states.module';
import { CategoriesModule } from './categories/categories.module';
import { PropertiesModule } from './properties/properties.module';
import { VisitsModule } from './visits/visits.module';
import { AuthModule } from './auth/auth.module';
import { MongooseModule } from '@nestjs/mongoose';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { PropertyReviewsModule } from './property-reviews/property-reviews.module';
import { HomeModule } from './home/home.module';
import { HealthModule } from './health/health.module';
import { TerminusModule } from '@nestjs/terminus';
import { ThrottlerGuard, ThrottlerModule } from '@nestjs/throttler';
import { APP_GUARD } from '@nestjs/core';
import { WinstonModule } from 'nest-winston';
import * as winston from 'winston';

@Module({
  imports: [
    ConfigModule.forRoot({
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
    ThrottlerModule.forRoot({ throttlers: [{ ttl: 60000, limit: 30 }] }),
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
      exitOnError: false, // prevent Winston from exiting after logging
    }),
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
  ],
  providers: [
    {
      provide: APP_GUARD,
      useClass: ThrottlerGuard,
    },
  ],
})
export class AppModule {}
