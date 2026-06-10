import { Module } from '@nestjs/common';
import { VisitsService } from './visits.service';
import { CanAccessVisitGuard } from './guards/can-access-visit.guard';
import { CanAccessPropertyGuard } from './guards/can-access-property.guard';
import { VisitsController } from './visits.controller';
import { PropertyVisitsController } from './property-visits.controller';
import { MongooseModule } from '@nestjs/mongoose';
import { Visit, VisitSchema } from './schemas/visit.schema';
import { UsersModule } from 'src/modules/users/users.module';
import { PropertiesModule } from 'src/modules/properties/properties.module';
import { QueuesModule } from 'src/infrastructure/queues/queues.module';

@Module({
  imports: [
    MongooseModule.forFeature([{ name: Visit.name, schema: VisitSchema }]),
    UsersModule,
    PropertiesModule,
    QueuesModule,
  ],
  controllers: [VisitsController, PropertyVisitsController],
  providers: [VisitsService, CanAccessVisitGuard, CanAccessPropertyGuard],
})
export class VisitsModule {}
