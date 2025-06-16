import { Module } from '@nestjs/common';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { FavoritesModule } from './favorites/favorites.module';
import { UsersModule } from './users/users.module';
import { ReviewsModule } from './reviews/reviews.module';
import { StatesModule } from './states/states.module';
import { CategoriesModule } from './categories/categories.module';
import { PropertiesModule } from './properties/properties.module';
import { AuthModule } from './auth/auth.module';
import { VisitsModule } from './visits/visits.module';

@Module({
  imports: [FavoritesModule, UsersModule, ReviewsModule, StatesModule, CategoriesModule, PropertiesModule, AuthModule, VisitsModule],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
