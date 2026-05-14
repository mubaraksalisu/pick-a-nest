import { Module } from '@nestjs/common';
import { PropertiesService } from './properties.service';
import { PropertiesController } from './properties.controller';
import { UsersModule } from 'src/modules/users/users.module';
import { CategoriesModule } from 'src/modules/categories/categories.module';
import { MongooseModule } from '@nestjs/mongoose';
import { Property, PropertySchema } from './schemas/property.schema';
import { PropertyCacheService } from './cache/property-cache.service';

@Module({
  imports: [
    UsersModule,
    CategoriesModule,
    MongooseModule.forFeature([
      { name: Property.name, schema: PropertySchema },
    ]),
  ],
  controllers: [PropertiesController],
  providers: [PropertiesService, PropertyCacheService],
  exports: [PropertiesService],
})
export class PropertiesModule {}
