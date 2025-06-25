import { Module } from '@nestjs/common';
import { PropertyReviewsService } from './property-reviews.service';
import { PropertyReviewsController } from './property-reviews.controller';
import { UsersModule } from 'src/users/users.module';
import { PropertiesModule } from 'src/properties/properties.module';
import { MongooseModule } from '@nestjs/mongoose';
import {
  PropertyReview,
  PropertyReviewSchema,
} from './schemas/property-review.schema';

@Module({
  imports: [
    UsersModule,
    PropertiesModule,
    MongooseModule.forFeature([
      { name: PropertyReview.name, schema: PropertyReviewSchema },
    ]),
  ],
  controllers: [PropertyReviewsController],
  providers: [PropertyReviewsService],
})
export class PropertyReviewsModule {}
