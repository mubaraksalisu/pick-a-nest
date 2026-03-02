import { Module } from '@nestjs/common';
import { StatesService } from './states.service';
import { StatesController } from './states.controller';
import { MongooseModule } from '@nestjs/mongoose';
import { State, StateSchema } from './schemas/state.schema';

@Module({
  imports: [
    MongooseModule.forFeature([{ name: State.name, schema: StateSchema }]),
  ],
  controllers: [StatesController],
  providers: [StatesService],
})
export class StatesModule {}
