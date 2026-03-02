import { Module } from '@nestjs/common';
import { VisitsService } from './visits.service';
import { VisitsController } from './visits.controller';
import { MongooseModule } from '@nestjs/mongoose';
import { Visit, VisitSchema } from './schemas/visit.schema';
import { UsersModule } from 'src/modules/users/users.module';
import { PropertiesModule } from 'src/modules/properties/properties.module';

@Module({
  imports: [
    MongooseModule.forFeature([{ name: Visit.name, schema: VisitSchema }]),
    UsersModule,
    PropertiesModule,
  ],
  controllers: [VisitsController],
  providers: [VisitsService],
})
export class VisitsModule {}
