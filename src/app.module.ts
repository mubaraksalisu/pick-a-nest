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
    FavoritesModule,
    UsersModule,
    StatesModule,
    CategoriesModule,
    PropertiesModule,
    AuthModule,
    VisitsModule,
    PropertyReviewsModule,
    HomeModule,
  ],
})
export class AppModule {}
