import { Module } from '@nestjs/common';
import { PropertiesService } from './properties.service';
import { PropertiesController } from './properties.controller';
import { UsersModule } from 'src/modules/users/users.module';
import { CategoriesModule } from 'src/modules/categories/categories.module';
import { MongooseModule } from '@nestjs/mongoose';
import { Property, PropertySchema } from './schemas/property.schema';
import { CacheModule } from 'src/infrastructure/cache/cache.module';

@Module({
  imports: [
    UsersModule,
    CategoriesModule,
    CacheModule,
    MongooseModule.forFeature([
      { name: Property.name, schema: PropertySchema },
    ]),
  ],
  controllers: [PropertiesController],
  providers: [PropertiesService],
  exports: [PropertiesService],
})
export class PropertiesModule {}
